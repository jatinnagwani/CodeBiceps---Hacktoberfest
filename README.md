# PRoof 🛡️
### Local-First AI Pull Request Review & Triage Tool for Open Source

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Local-First AI](https://img.shields.io/badge/AI%20Runtime-Ollama%20Local-green)](https://ollama.ai)
[![Open Model](https://img.shields.io/badge/Model-Qwen%202.5%203B%20%2F%20Qwen%203.5%204B-orange)](https://huggingface.co/Qwen)
[![Testing](https://img.shields.io/badge/Tests-153%20Passed-brightgreen)](./backend/tests)

**PRoof** is an open-source, local-first review assistant and triage tool designed for open-source maintainers and contributors. It combines deterministic heuristic diff analysis with a local open-weight language model (via [Ollama](https://ollama.ai)) to classify pull requests, surface grounded diff evidence, and draft constructive mentoring comments without sending source code or data to third-party cloud services.

---

## 📋 Problem & Intended Users

### The Problem
During open-source events like Hacktoberfest and across popular repositories, maintainers face a surge of incoming pull requests. Many are low-effort, whitespace-only, or cosmetic submissions that drain maintainer time. At the same time, legitimate first-time contributors often submit well-intentioned code that merely lacks unit tests, context, or issue links. Maintainers need an efficient way to separate genuine work from spam and provide educational guidance rather than flat rejection.

### Intended Users
- **Open-Source Maintainers:** Rapidly triage PR queues, identify low-effort submissions, and draft helpful review comments with verifiable diff evidence.
- **First-Time Contributors:** Run a local pre-flight check on their title, description, and diff before opening a pull request to catch common omissions (such as missing tests or unlinked issues).
- **Privacy-Sensitive Teams:** Perform automated pull request analysis fully on-device with zero code exfiltration.

---

## 🎯 The Three PR Classifications

Every analyzed PR receives an evidence-backed classification into one of three agreed verdicts:

| Verdict | Meaning | What PRoof Surfaces | Human Maintainer Action |
|---|---|---|---|
| 🟢 **Genuine** | High-quality bugfix or feature with context, clear diff, and automated tests. | High confidence score, verified test coverage, linked issue trace, grounded diff line evidence. | Review code, provide positive mentoring feedback, approve. |
| 🟡 **Needs Work** | Well-intentioned contribution that is incomplete (e.g., missing unit tests, open checklist items, or unlinked issue). | Specific rule warnings (e.g. `test-coverage-check`), constructive feedback points, actionable steps. | Guide contributor to add tests or complete checklist; re-review when updated. |
| 🔴 **Likely Spam** | Pure whitespace changes, trailing spaces, or low-effort promotional modifications. | Critical heuristic findings (`whitespace-check`), objective cosmetic ratio, educational policy redirection. | Provide polite guidance pointing to repository contribution standards and `good first issue` tags. |

---

## ⚡ Local AI vs. Deterministic Heuristics

PRoof deliberately avoids "black-box" AI decision making. The evaluation combines two distinct layers:

### 1. Deterministic Heuristics (Rule-Based Facts)
Heuristics evaluate hard objective diff facts without probabilistic variance:
- **Empty Diff Check (`checkEmptyDiff`):** Flags pull requests with 0 changed lines or missing diff hunks (`CRITICAL`).
- **Whitespace Check (`checkWhitespaceOnly`):** Analyzes unified diff lines. If changes consist exclusively of whitespace, blank lines, or trailing spaces, it triggers a `CRITICAL` failure (-50 score impact).
- **Diff Volume & Test Coverage (`checkDiffSizeAndTests`):** Checks total changed lines and scans for dedicated test files (`.test.`, `.spec.`, `tests/`). Penalizes code changes submitted without accompanying tests.
- **Title Quality (`checkTitleQuality`):** Detects single-word placeholders or low-effort titles (`"fixed typo"`, `"update"`).
- **Linked Issue Traceability (`checkLinkedIssue`):** Searches PR metadata and description for referenced issue IDs (`#123`, `Closes #42`).
- **Description & Template Completeness (`checkDescriptionAndTemplate`):** Flags empty descriptions, unedited template placeholders (`<!-- ... -->`), and unchecked checklist boxes (`- [ ]`).
- **Evidence Validator (`filterValidEvidence`):** Validates evidence citations against real unified diff hunk line boundaries, discarding any fabricated files or out-of-bounds line numbers.
- **Critical Safety Override:** If `whitespace-check` or `empty-diff-check` fails with `CRITICAL` severity, the engine **unconditionally overrides** the final verdict to `LIKELY_SPAM`, preventing prompt injection or model misclassification from approving cosmetic PRs.

### 2. Local AI Model (Ollama + Open-Weight LLM)
When Ollama is available, an open-weight model (e.g., `qwen2.5:3b`) performs semantic synthesis:
- Analyzes the semantic intent of code changes and descriptions.
- Synthesizes heuristic findings into constructive, educational review comments.
- Formulates respectful, context-aware mentoring advice with appropriate tone (`ENCOURAGING`, `CONSTRUCTIVE_GUIDANCE`, `POLITE_CAUTION`).
- Identifies subtle semantic issues (such as self-promotional text in docs) that rule-based pattern matching cannot detect.

---

## 🛡️ Non-Destructive & Safety Guarantees

- **No Automated GitHub Actions:** PRoof **never** automatically posts comments to GitHub, closes pull requests, or merges code.
- **Read-Only Operation:** PRoof does not communicate with `api.github.com` or any external service. All sample data and pre-flight submissions are processed in memory and locally on your machine.
- **Untrusted Input Isolation:** PR titles, descriptions, and diffs are treated strictly as untrusted data wrapped in `<UNTRUSTED_PR_CONTENT>` tags. Prompt injection instructions embedded in descriptions or diff comments cannot override deterministic safety rules.
- **Human in the Loop:** Review drafts can be reviewed and edited by maintainers in the UI before local approval.

---

## 🏗️ Architecture & Data Flow

```
┌────────────────────────────────────────────────────────┐
│               Frontend Dashboard (Vite + React)        │
│    - PR List & Diff Viewer                             │
│    - Contributor Pre-Flight Submission Form            │
│    - Verdict Card, Grounded Evidence & Comment Editor   │
└───────────────────────────┬────────────────────────────┘
                            │ HTTP (localhost:3001)
                            ▼
┌────────────────────────────────────────────────────────┐
│               Express API Layer (backend/src)          │
│    - GET /api/pull-requests (sample PR catalog)        │
│    - POST /api/analyze (full triage pipeline)          │
│    - POST /api/reviews/approve (local draft record)     │
│    - POST /api/evidence/validate (citation validation) │
└─────────────┬────────────────────────────┬─────────────┘
              │                            │
              ▼                            ▼
┌───────────────────────────┐  ┌─────────────────────────┐
│ Deterministic Heuristics  │  │   Local Ollama Adapter  │
│  - Diff volume & tests    │  │   - Qwen 2.5 3B (local) │
│  - Whitespace analysis    │  │   - Low temperature (0.1│
│  - Template & checklists  │  │   - Bounded timeout     │
│  - Issue traceability     │  │   - Offline resilience  │
└─────────────┬─────────────┘  └────────────┬────────────┘
              │                             │
              ▼                             ▼
┌────────────────────────────────────────────────────────┐
│                  PRoof ReviewEngine                    │
│    1. Validates untrusted input via Zod schemas        │
│    2. Executes deterministic heuristics suite          │
│    3. Queries Ollama (falls back if offline/malformed) │
│    4. Validates model output against shared schemas    │
│    5. Enforces critical diff safety overrides          │
│    6. Discards ungrounded/fabricated evidence          │
│    7. Returns unified AnalysisResult contract          │
└────────────────────────────────────────────────────────┘
```

---

## 🔄 How Heuristic-Only Fallback Works

PRoof operates reliably even when Ollama is completely offline, not installed, or times out.

1. **Connectivity Check:** Before analysis, `ReviewEngine` checks `checkHealth()`. If the daemon is unreachable (e.g. `ECONNREFUSED 127.0.0.1:11434`), it immediately engages fallback mode.
2. **Defensive Parsing:** If Ollama returns non-JSON text, an HTTP error, a timeout, or a schema violation, the engine catches it and safely routes to fallback.
3. **Deterministic Scoring:** The fallback generator computes verdicts directly from heuristic rules:
   - Critical whitespace or empty diff $\rightarrow$ `LIKELY_SPAM` (High confidence).
   - Heuristic score $\ge 70$ with verified unit tests $\rightarrow$ `GENUINE` (High/Medium confidence).
   - Otherwise $\rightarrow$ `NEEDS_WORK` (Medium confidence).
4. **Honest Labelling:** The result is explicitly stamped with:
   - `engine: "HEURISTICS_FALLBACK"`
   - `engineDetails.isFallback: true`
   - `engineDetails.ollamaAvailable: false`
   - `engineDetails.modelName: "None (Deterministic Rules)"`
   - Review comments feature the visible disclaimer: `*Generated by PRoof (Heuristics-Only Mode)*`.

---

## 🧰 Prerequisites & Setup

### Prerequisites
- **Node.js:** v20.0.0 or higher
- **npm:** v10.0.0 or higher
- **Git**
- *(Optional for AI synthesis)* **[Ollama](https://ollama.ai)**

### Installation

```bash
# 1. Clone the repository
git clone https://github.com/jatinnagwani/CodeBiceps---Hacktoberfest.git
cd CodeBiceps---Hacktoberfest

# 2. Install dependencies across all monorepo workspaces
npm install

# 3. Build all workspace packages (@proof/shared, @proof/backend, @proof/frontend)
npm run build
```

---

## 🖥️ Running the Application

### 1. Start the Backend API Server

In a terminal, run:
```bash
npm run dev:backend
```
The backend starts on `http://localhost:3001`. You can verify it with:
```bash
curl http://localhost:3001/api/health
```

### 2. Start the Frontend Dashboard

In a second terminal, run:
```bash
npm run dev:frontend
```
The Vite development server starts on `http://localhost:5173`. Open your browser to `http://localhost:5173` to access the dashboard.

---

## 🤖 (Optional) Setting Up Local Ollama AI

To enable local AI model analysis alongside deterministic heuristics:

1. **Install Ollama:** Follow instructions at [ollama.ai](https://ollama.ai).
2. **Pull an Open-Weight Model:**
   ```bash
   ollama pull qwen2.5:3b
   ```
   *(Alternatively: `ollama pull qwen2.5:1.5b` for resource-constrained systems, or `qwen2.5-coder:3b`)*.
3. **Configure the Environment Variable:**
   ```bash
   export OLLAMA_MODEL="qwen2.5:3b"
   ```
   *(Or edit `backend/.env` based on `.env.example`)*.
4. **Start the Ollama daemon:**
   ```bash
   ollama serve
   ```

*Note: If Ollama is not running, PRoof runs automatically in transparent heuristic fallback mode.*

---

## 🧪 Running Tests

The test suite includes 153 tests across 10 test suites covering heuristics, fallback behavior, Ollama adapter resilience, API endpoints, schema validation, evidence grounding, and anti-injection defenses.

All unit and integration tests run **offline** using deterministic in-memory mocks without requiring an active Ollama instance.

```bash
# Run the complete test suite
npm test

# Run a specific test suite
npx --workspace=@proof/backend vitest run tests/reproducible-dataset.test.ts
npx --workspace=@proof/backend vitest run tests/extended-safety-and-contracts.test.ts
```

---

## ⏱️ 2-Minute Demo Script (For Hackathon Judges)

Follow this quick walkthrough using the pre-configured sample PR fixtures:

1. **Open the Dashboard:** Navigate to `http://localhost:5173`. Notice the system status indicator in the top navigation bar showing engine readiness and Ollama status.
2. **Examine a Genuine PR:**
   - Select **`sample-genuine-01`** (*"fix(auth): prevent session timeout race condition during token refresh"*).
   - Click **"Analyze PR"**.
   - Observe the 🟢 **Genuine** verdict badge, verified test coverage (+25), linked issue trace (`#142`), and grounded diff evidence.
   - Inspect the drafted mentoring comment with an `ENCOURAGING` tone.
3. **Examine a Needs-Work PR:**
   - Select **`sample-needs-work-02`** (*"feat(rate-limit): add in-memory rate limiting middleware"*).
   - Click **"Analyze PR"**.
   - Observe the 🟡 **Needs Work** verdict badge. Notice heuristic warnings flagging 0 unit tests and unlinked issue.
   - Observe the drafted feedback with a `CONSTRUCTIVE_GUIDANCE` tone detailing exact next steps.
4. **Examine a Likely-Spam / Whitespace PR:**
   - Select **`sample-likely-spam-03`** or **`sample-whitespace-04`**.
   - Click **"Analyze PR"**.
   - Observe the 🔴 **Likely Spam** verdict badge. Notice the `CRITICAL` whitespace finding and educational advice redirecting the contributor to `good first issue` tasks.
5. **Test Contributor Pre-Flight Check:**
   - Click **"+ Analyze Your PR Diff"** in the top navigation bar.
   - Paste a PR title, description, and diff snippet to test the instant pre-flight validation workflow before submission.
6. **Maintainer Review Approval Flow:**
   - On any analyzed PR, scroll to the **Review Comment Draft** section.
   - Edit the comment text in the textarea.
   - Click **"Approve Draft"**.
   - Note the confirmation banner showing local approval record generation. (Zero external requests sent to GitHub).

---

## ⚠️ Limitations & Future Work

### Current Limitations
- **Hardware-Dependent AI Latency:** Local LLM inference speed depends on host hardware (Apple Silicon Metal / CUDA GPU vs. standard CPU).
- **Diff Context Window:** Very large pull request diffs (>1,500 lines) are truncated for model prompt input (though heuristics analyze the full patch).
- **Read-Only / Local Scope:** PRoof does not automatically open, close, or merge PRs on GitHub.
- **Regex/Hunk-Based Heuristics:** Diff analysis is performed on unified diff format; full programming-language AST parsing is not currently executed.

### Future Improvements
- Tree-sitter AST integration for deeper semantic syntax validation across languages.
- Optional GitHub App / Actions webhook integration with maintainer-in-the-loop dry-run policies.
- Retrieval-augmented context using repository `CONTRIBUTING.md` and project coding conventions.
- Multi-model benchmarking across lightweight code models (Llama 3.2 3B, DeepSeek-R1-Distill, StarCoder2).

---

## 📜 License

This project is licensed under the **[MIT License](./LICENSE)** — Copyright (c) 2026 Jatin Nagwani / CodeBiceps.
All third-party libraries and runtime components utilized are open-source under permissive licenses (MIT / Apache 2.0).

ppt link - https://drive.google.com/file/d/1Eh071WvZo7NWAfnYvsTwK5ypVeRMS-yk/view?usp=sharing
