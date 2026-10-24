import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { OllamaAdapter, OllamaClient, OllamaStatus } from '../src/ai/ollama-client';
import { PullRequestPayload, HeuristicFinding } from '@proof/shared';
import genuinePR from '../../samples/genuine-pr.json';

describe('OllamaAdapter — Local AI Model Adapter', () => {
  const samplePR = genuinePR as PullRequestPayload;
  const sampleFindings: HeuristicFinding[] = [
    {
      id: 'test-coverage-check',
      name: 'Test Coverage Check',
      severity: 'INFO',
      passed: true,
      scoreImpact: 20,
      evidence: 'Test file found: tests/auth/session-manager.test.ts',
    },
    {
      id: 'whitespace-check',
      name: 'Whitespace Only Check',
      severity: 'CRITICAL',
      passed: true,
      scoreImpact: 0,
      evidence: 'PR contains 88 substantive additions and deletions.',
    },
  ];

  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  describe('Configuration & Defaults', () => {
    it('defaults model to "proof-reviewer" when OLLAMA_MODEL is unset', () => {
      delete process.env.OLLAMA_MODEL;
      const adapter = new OllamaAdapter();
      expect(adapter.getModel()).toBe('proof-reviewer');
    });

    it('reads model name from OLLAMA_MODEL environment variable', () => {
      process.env.OLLAMA_MODEL = 'custom-reviewer:8b';
      const adapter = new OllamaAdapter();
      expect(adapter.getModel()).toBe('custom-reviewer:8b');
    });

    it('allows model override via constructor argument', () => {
      const adapter = new OllamaAdapter('http://localhost:11434', 'custom-model:latest');
      expect(adapter.getModel()).toBe('custom-model:latest');
    });

    it('defaults endpoint to "http://localhost:11434"', () => {
      delete process.env.OLLAMA_HOST;
      delete process.env.OLLAMA_BASE_URL;
      const adapter = new OllamaAdapter();
      expect(adapter.getEndpoint()).toBe('http://localhost:11434');
    });

    it('uses low temperature (0.1) by default for deterministic evaluation', () => {
      delete process.env.OLLAMA_TEMPERATURE;
      const adapter = new OllamaAdapter();
      expect(adapter.getTemperature()).toBe(0.1);
    });

    it('uses bounded timeout (20000ms) by default', () => {
      delete process.env.OLLAMA_TIMEOUT_MS;
      const adapter = new OllamaAdapter();
      expect(adapter.getTimeoutMs()).toBe(20000);
    });

    it('exports OllamaClient as a compatible class alias', () => {
      const client = new OllamaClient();
      expect(client).toBeInstanceOf(OllamaAdapter);
      expect(client.getModel()).toBe('proof-reviewer');
    });
  });

  describe('Model Prompting & Request Structure', () => {
    it('sends PR title, description, files, diff, heuristics, and low temperature to Ollama', async () => {
      let capturedUrl = '';
      let capturedBody: any = null;

      global.fetch = vi.fn().mockImplementation(async (url: string, init: any) => {
        capturedUrl = url;
        capturedBody = JSON.parse(init.body);

        return {
          ok: true,
          status: 200,
          json: async () => ({
            response: JSON.stringify({
              verdict: 'GENUINE',
              confidence: 'HIGH',
              reasoning: 'The PR includes unit tests and resolves issue #142 with clean changes.',
              summary: 'High-quality bugfix with comprehensive test coverage.',
              evidence: [
                {
                  type: 'DIFF_INSPECTION',
                  severity: 'POSITIVE',
                  description: 'Added test file tests/auth/session-manager.test.ts',
                  file: 'tests/auth/session-manager.test.ts',
                  lineRange: 'L1-L40',
                },
              ],
              suggestedComment: {
                greeting: 'Hi @alex-dev!',
                summary: 'Thank you for this fix.',
                actionablePoints: ['Looks ready for maintainer review.'],
                closing: 'Keep up the great work!',
                tone: 'ENCOURAGING',
                markdown: 'Hi @alex-dev!\n\nThank you for this fix.',
              },
            }),
          }),
        } as unknown as Response;
      });

      const adapter = new OllamaAdapter('http://localhost:11434', 'proof-reviewer', 5000, 0.1);
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 85);

      // Verify endpoint called
      expect(capturedUrl).toBe('http://localhost:11434/api/generate');

      // Verify model passed
      expect(capturedBody.model).toBe('proof-reviewer');

      // Verify format and stream settings
      expect(capturedBody.format).toBe('json');
      expect(capturedBody.stream).toBe(false);

      // Verify low temperature passed
      expect(capturedBody.options.temperature).toBe(0.1);

      // Verify PR details included in prompt
      expect(capturedBody.prompt).toContain(samplePR.title);
      expect(capturedBody.prompt).toContain(samplePR.author);
      expect(capturedBody.prompt).toContain(samplePR.description);
      expect(capturedBody.prompt).toContain('Test Coverage Check');

      // Verify structured result parsed correctly
      expect(result).not.toBeNull();
      expect(result?.verdict).toBe('GENUINE');
      expect(result?.confidence).toBe('HIGH');
      expect(result?.engine).toBe('OLLAMA_LOCAL');
      expect(result?.engineDetails.modelName).toBe('proof-reviewer');
      expect(result?.engineDetails.isFallback).toBe(false);
      expect(result?.reasoning).toBe('The PR includes unit tests and resolves issue #142 with clean changes.');
      expect(result?.summary).toBe('High-quality bugfix with comprehensive test coverage.');
      expect(result?.evidence.length).toBe(1);
      expect(result?.evidence[0].file).toBe('tests/auth/session-manager.test.ts');
      expect(result?.suggestedComment.tone).toBe('ENCOURAGING');
      expect(result?.suggestedComment.isEdited).toBe(false);
      expect(result?.reviewComment.isEdited).toBe(false);
    });
  });

  describe('Error Handling & Safety Guarantees', () => {
    it('handles Ollama being offline without crashing and returns null', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:11434'));

      const adapter = new OllamaAdapter();
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      // Never claims model analysis succeeded when it failed
      expect(result).toBeNull();
    });

    it('handles model not being installed (HTTP 404) and returns null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        json: async () => ({
          error: "model 'proof-reviewer' not found, try pulling it first",
        }),
      } as unknown as Response);

      const adapter = new OllamaAdapter('http://localhost:11434', 'proof-reviewer');
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      expect(result).toBeNull();
    });

    it('handles HTTP 500 error from Ollama and returns null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: false,
        status: 500,
        statusText: 'Internal Server Error',
        json: async () => ({ error: 'CUDA out of memory' }),
      } as unknown as Response);

      const adapter = new OllamaAdapter();
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      expect(result).toBeNull();
    });

    it('handles request timeout via AbortController and returns null', async () => {
      global.fetch = vi.fn().mockImplementation((_url: string, init: any) => {
        return new Promise((_, reject) => {
          if (init.signal) {
            init.signal.addEventListener('abort', () => {
              const err = new Error('The operation was aborted');
              err.name = 'AbortError';
              reject(err);
            });
          }
        });
      });

      // Adapter with very short timeout
      const adapter = new OllamaAdapter('http://localhost:11434', 'proof-reviewer', 50);
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      expect(result).toBeNull();
    });

    it('handles malformed non-JSON output from the model and returns null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          response: 'I am an AI and I think this PR looks fine, but this is not JSON!',
        }),
      } as unknown as Response);

      const adapter = new OllamaAdapter();
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      expect(result).toBeNull();
    });

    it('handles JSON output missing verdict and returns null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            summary: 'Missing verdict property entirely',
            evidence: [],
          }),
        }),
      } as unknown as Response);

      const adapter = new OllamaAdapter();
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      expect(result).toBeNull();
    });

    it('handles invalid verdict values and returns null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          response: JSON.stringify({
            verdict: 'SUPER_GREAT_PR', // Invalid verdict!
            summary: 'Non-schema verdict',
          }),
        }),
      } as unknown as Response);

      const adapter = new OllamaAdapter();
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      expect(result).toBeNull();
    });

    it('handles empty response text from Ollama and returns null', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          response: '   ',
        }),
      } as unknown as Response);

      const adapter = new OllamaAdapter();
      const result = await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      expect(result).toBeNull();
    });

    it('never calls any hosted cloud AI provider', async () => {
      const fetchSpy = vi.fn().mockRejectedValue(new Error('Connection refused'));
      global.fetch = fetchSpy;

      const adapter = new OllamaAdapter();
      await adapter.analyzeWithOllama(samplePR, sampleFindings, 50);

      // Verify no call was made to openai, anthropic, or external hosts
      for (const call of fetchSpy.mock.calls) {
        const url = call[0] as string;
        expect(url).not.toContain('api.openai.com');
        expect(url).not.toContain('anthropic.com');
        expect(url).not.toContain('googleapis.com');
        expect(url).toContain('11434');
      }
    });
  });

  describe('Health Check (checkHealth)', () => {
    it('detects when Ollama is running and model is installed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: 'proof-reviewer:latest' }, { name: 'qwen2.5:3b' }],
        }),
      } as unknown as Response);

      const adapter = new OllamaAdapter('http://localhost:11434', 'proof-reviewer');
      const health: OllamaStatus = await adapter.checkHealth();

      expect(health.connected).toBe(true);
      expect(health.modelInstalled).toBe(true);
      expect(health.modelsAvailable).toContain('proof-reviewer:latest');
    });

    it('detects when Ollama is running but configured model is not installed', async () => {
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({
          models: [{ name: 'llama3:8b' }],
        }),
      } as unknown as Response);

      const adapter = new OllamaAdapter('http://localhost:11434', 'proof-reviewer');
      const health = await adapter.checkHealth();

      expect(health.connected).toBe(true);
      expect(health.modelInstalled).toBe(false);
    });

    it('reports connected=false when daemon is offline', async () => {
      global.fetch = vi.fn().mockRejectedValue(new Error('ECONNREFUSED'));

      const adapter = new OllamaAdapter();
      const health = await adapter.checkHealth();

      expect(health.connected).toBe(false);
      expect(health.modelInstalled).toBe(false);
    });
  });
});
