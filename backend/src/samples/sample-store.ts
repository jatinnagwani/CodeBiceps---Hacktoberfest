import fs from 'fs';
import path from 'path';
import { PullRequest, PullRequestPayloadSchema } from '@proof/shared';

export class SampleStore {
  private samples: Map<string, PullRequest> = new Map();

  constructor() {
    this.loadSamples();
  }

  private loadSamples(): void {
    const candidateDirs = [
      path.resolve(__dirname, '../../../samples'),
      path.resolve(__dirname, '../../samples'),
      path.resolve(__dirname, '../samples'),
      path.resolve(process.cwd(), '../samples'),
      path.resolve(process.cwd(), 'samples'),
    ];
    const samplesDir = candidateDirs.find(d => fs.existsSync(d)) || candidateDirs[0];
    const filenames = [
      'genuine-pr.json',
      'needs-work-pr.json',
      'likely-spam-pr.json',
      'whitespace-only-pr.json',
    ];

    for (const file of filenames) {
      const fullPath = path.join(samplesDir, file);
      if (fs.existsSync(fullPath)) {
        try {
          const raw = fs.readFileSync(fullPath, 'utf-8');
          const parsed = JSON.parse(raw);
          const validated = PullRequestPayloadSchema.parse(parsed);
          this.samples.set(validated.id, validated);
        } catch (err) {
          console.error(`Failed to load sample file ${file}:`, err);
        }
      }
    }
  }



  getAllSamples(): PullRequest[] {
    if (this.samples.size === 0) {
      this.loadSamples();
    }
    return Array.from(this.samples.values());
  }

  getSampleById(id: string): PullRequest | undefined {
    if (this.samples.size === 0) {
      this.loadSamples();
    }
    return this.samples.get(id);
  }
}

export const defaultSampleStore = new SampleStore();


