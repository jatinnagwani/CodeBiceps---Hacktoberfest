# PRoof — API Contracts & Architecture Specification

## Overview

PRoof provides a local-first, privacy-respecting REST API for pull request review and triage. The system operates entirely within the developer's workstation or self-hosted environment, ensuring that code diffs, pull request descriptions, and author metadata are **never** transmitted to external cloud AI providers.

---

## Base URL

```text
http://localhost:3001/api
```

---

## Authentication & Security

- **Local Trust Boundary:** By default, endpoints run locally on `127.0.0.1`.
- **Zero Remote Diff Exfiltration:** Diff contents stay inside the local Node process and local Ollama instance.
- **Untrusted Input Treatment:** All PR titles, descriptions, and diff strings are enclosed within anti-injection delimiters (`<UNTRUSTED_PR_DIFF>`) before prompting the local LLM.
- **No Code Execution:** Diffs are parsed strictly as AST/text diff tokens; submitted code is never executed, eval'd, or imported.

---

## Endpoints

### 1. Health & Pipeline Readiness

Checks server status, active heuristic rules, and local Ollama model connection.

- **Method:** `GET`
- **Path:** `/api/health`
- **Response `200 OK`:**
```json
{
  "status": "healthy",
  "timestamp": "2026-10-24T20:50:00Z",
  "version": "0.1.0",
  "ollama": {
    "connected": true,
    "endpoint": "http://localhost:11434",
    "model": "qwen2.5:3b",
    "quantization": "Q4_K_M",
    "version": "0.5.1"
  },
  "heuristics": {
    "activeRulesCount": 5,
    "ready": true
  }
}
```

*Note: If Ollama is offline, `ollama.connected` is `false`, and `status` is `"degraded"`, signalling to the frontend that analysis will use the Heuristics-Only fallback engine.*

---

### 2. Sample Pull Requests Catalog

Retrieves pre-loaded demonstration PRs covering the three classification benchmarks:
1. `GENUINE` (Bug fix with test suite)
2. `NEEDS_WORK` (Feature idea lacking tests & cache eviction)
3. `LIKELY_SPAM` (Whitespace-only edits & trailing spaces)

- **Method:** `GET`
- **Path:** `/api/samples`
- **Response `200 OK`:**
```json
[
  {
    "id": "sample-genuine-01",
    "category": "GENUINE",
    "title": "fix(auth): prevent session timeout race condition during token refresh",
    "author": "sarah-codes",
    "authorAssociation": "FIRST_TIME_CONTRIBUTOR",
    "stats": { "totalAdditions": 52, "totalDeletions": 4, "totalFiles": 2 }
  },
  {
    "id": "sample-needs-work-02",
    "category": "NEEDS_WORK",
    "title": "Add in-memory rate limiter middleware for incoming requests",
    "author": "alex-coder-99",
    "authorAssociation": "FIRST_TIME_CONTRIBUTOR",
    "stats": { "totalAdditions": 28, "totalDeletions": 0, "totalFiles": 1 }
  },
  {
    "id": "sample-likely-spam-03",
    "category": "LIKELY_SPAM",
    "title": "Docs: Update README.md and clean codebase structure",
    "author": "hacktober-points-collector",
    "authorAssociation": "NONE",
    "stats": { "totalAdditions": 5, "totalDeletions": 3, "totalFiles": 2 }
  }
]
```

---

### 3. Get Sample Detail

- **Method:** `GET`
- **Path:** `/api/samples/:id`
- **Response `200 OK`:** Full `PullRequestPayload` object with patches and file list.
- **Response `404 Not Found`:**
```json
{
  "error": "Sample PR with id 'unknown-id' was not found."
}
```

---

### 4. Analyze & Triage Pull Request

Accepts any PR payload (sample or user-submitted) and executes the two-stage triage pipeline:
1. **Deterministic Heuristics Engine:** Computes diff sizing, whitespace-only check, template adherence, and issue references.
2. **Local AI Model (Ollama) / Heuristic Fallback:** Generates a structured verdict, evidence lines, and a polite suggested review comment.

- **Method:** `POST`
- **Path:** `/api/triage/analyze`
- **Headers:** `Content-Type: application/json`
- **Request Body:**
```json
{
  "id": "pr-101",
  "title": "fix(auth): prevent session timeout race condition during token refresh",
  "author": "sarah-codes",
  "authorAssociation": "FIRST_TIME_CONTRIBUTOR",
  "description": "Closes #142. Fixed concurrent refresh token race condition.",
  "linkedIssue": "#142",
  "filesChanged": [
    {
      "filename": "src/auth/session-manager.ts",
      "status": "modified",
      "additions": 18,
      "deletions": 4,
      "patch": "..."
    }
  ],
  "stats": {
    "totalAdditions": 18,
    "totalDeletions": 4,
    "totalFiles": 1
  }
}
```

- **Response `200 OK`:**
```json
{
  "prId": "pr-101",
  "verdict": "GENUINE",
  "confidence": "HIGH",
  "engine": "OLLAMA_LOCAL",
  "engineDetails": {
    "ollamaAvailable": true,
    "modelName": "qwen2.5:3b",
    "quantization": "Q4_K_M",
    "executionTimeMs": 1420,
    "isFallback": false
  },
  "summary": "High quality bugfix resolving an open issue with accompanying test coverage.",
  "heuristicFindings": [
    {
      "id": "diff-whitespace-check",
      "name": "Meaningful Changes Detected",
      "severity": "INFO",
      "passed": true,
      "scoreImpact": 20,
      "evidence": "Diff contains logical AST modifications beyond whitespace changes."
    },
    {
      "id": "linked-issue-check",
      "name": "Linked Issue Present",
      "severity": "INFO",
      "passed": true,
      "scoreImpact": 15,
      "evidence": "PR correctly links to issue #142."
    }
  ],
  "evidence": [
    {
      "id": "ev-1",
      "type": "DIFF_INSPECTION",
      "severity": "POSITIVE",
      "description": "Added promise-based concurrency lock to avoid duplicate token refreshes.",
      "file": "src/auth/session-manager.ts",
      "lineRange": "L24-L38"
    }
  ],
  "suggestedComment": {
    "markdown": "Hi @sarah-codes! 👋 Thank you for identifying and fixing this session race condition. Great job including regression tests for the concurrent flow! Looking forward to reviewing this further.",
    "greeting": "Hi @sarah-codes! 👋",
    "summary": "Thank you for fixing this session race condition.",
    "actionablePoints": ["PR includes test coverage and closes issue #142."],
    "closing": "Looking forward to merging this once final checks complete!",
    "tone": "ENCOURAGING"
  },
  "metadata": {
    "analyzedAt": "2026-10-24T20:50:00Z",
    "rulesTriggered": ["diff-whitespace-check", "linked-issue-check", "test-coverage-check"],
    "heuristicScore": 85
  }
}
```

*Note on Fallback Behavior:* If Ollama is unavailable:
- `engine` is set to `"HEURISTICS_FALLBACK"`
- `engineDetails.isFallback` is `true`
- `engineDetails.ollamaAvailable` is `false`
- The verdict, evidence, and suggested comment are generated deterministically and explicitly labelled as **Heuristics-Only (Ollama Offline)**.

---

### 5. Review Approval & Feedback Action

Allows the open-source maintainer to review, customize/edit the suggested comment, select their intended action, and approve it. **The system never automatically closes, merges, or rejects PRs.**

- **Method:** `POST`
- **Path:** `/api/reviews/approve`
- **Request Body:**
```json
{
  "prId": "sample-genuine-01",
  "finalComment": "Hi @sarah-codes! Thank you for the clean fix and comprehensive tests. Approved!",
  "approvedVerdict": "GENUINE",
  "actionTaken": "COMMENT_ONLY",
  "maintainerNotes": "Good first time contributor, consider tagging for future auth issues."
}
```

- **Response `200 OK`:**
```json
{
  "success": true,
  "approvalId": "apr-784f93b2",
  "prId": "sample-genuine-01",
  "recordedAt": "2026-10-24T20:50:30Z",
  "message": "Maintainer review comment successfully approved and recorded.",
  "finalComment": "Hi @sarah-codes! Thank you for the clean fix and comprehensive tests. Approved!",
  "actionTaken": "COMMENT_ONLY"
}
```
