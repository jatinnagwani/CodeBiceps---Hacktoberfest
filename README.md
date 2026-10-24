# PRoof 🛡️
### Protect maintainers. Empower contributors. Keep open source open.

[![Hacktoberfest Hack Day](https://img.shields.io/badge/Hacktoberfest-Track%201%3A%20Best%20Open--Source%20AI%20Project-blueviolet)](https://hacktoberfest.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](./LICENSE)
[![Local-First AI](https://img.shields.io/badge/AI%20Runtime-Ollama%20Local-green)](https://ollama.ai)
[![Model](https://img.shields.io/badge/Model-Qwen%203.5%204B%20%2F%202.5%203B%20(Q4_K_M)-orange)](https://huggingface.co/Qwen)

**PRoof is a local-first AI-powered pull request review and triage tool built for open-source maintainers.** It helps teams rapidly detect low-effort, irrelevant, and spam pull requests while guiding genuine first-time contributors with constructive, evidence-backed feedback.

> **Hacktoberfest Hack Day 2026 — Track 1: Best Open-Source AI Project**
> 
> - **100% Open-Source AI:** Powered by open-weight models (Qwen 3.5 4B / Qwen 2.5 3B) via Ollama.
> - **Zero Code Exfiltration:** Diffs and PR descriptions never leave your workstation.
> - **Honest Fallbacks:** If Ollama is unavailable, PRoof gracefully falls back to deterministic heuristics and explicitly displays a "Heuristics-Only (Ollama Offline)" badge. Never fakes AI output.
> - **Human in the Loop:** PR comments can be reviewed, edited, and approved. PRoof **never** automatically merges, closes, or rejects PRs.

---

## 🎯 The Three PR Classifications

Every incoming pull request is classified into one of three actionable categories:

| Verdict | Meaning | Maintainer Action |
|---|---|---|
| 🟢 **Genuine** | High-quality bugfix or feature with context, clear diff, and tests. | Review code, provide positive mentoring feedback, approve. |
| 🟡 **Needs Work** | Legitimate attempt, but missing tests, unlinked issues, or risky logic. | Provide polite guidance on how to fix and complete the contribution. |
| 🔴 **Likely Spam** | Whitespace-only changes, trailing spaces, or low-effort filler PRs. | Politely explain repository contribution standards with evidence. |

---

## 🏗️ Architecture

```
                       ┌─────────────────────────┐
                       │  Pull Request Payload   │
                       │ (Diff, Title, Desc, etc)│
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Deterministic Rules   │
                       │    (Heuristics Engine)  │
                       └────────────┬────────────┘
                                    │
                         Is Ollama Connected?
                            /             \
                       YES /               \ NO
                          ▼                 ▼
          ┌─────────────────────┐    ┌─────────────────────┐
          │  Local Ollama LLM   │    │ Heuristics Fallback │
          │ (Qwen 3.5 4B/2.5 3B)│    │      Generator      │
          └───────────┬─────────┘    └──────────┬──────────┘
                      │                         │
                      └─────────────┬───────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │ Structured Verdict Card │
                       │    (Evidence + Tone)    │
                       └────────────┬────────────┘
                                    │
                                    ▼
                       ┌─────────────────────────┐
                       │   Maintainer Approval   │
                       │ (Edit Comment & Record) │
                       └─────────────────────────┘
```

---

## 🧰 Technology Stack & Open Source Licenses

All core dependencies and tools are open source:

- **AI Runtime:** [Ollama](https://github.com/ollama/ollama) (MIT)
- **AI Model:** [Qwen 3.5 4B / Qwen 2.5 3B](https://huggingface.co/Qwen) (Apache 2.0)
- **Backend:** Node.js, Express (MIT), TypeScript (Apache 2.0)
- **Frontend:** React (MIT), TypeScript (Apache 2.0), Vite (MIT), Tailwind CSS (MIT)
- **Validation:** Zod (MIT)
- **Testing:** Vitest (MIT)
- **Application License:** [MIT License](./LICENSE)

For deep-dive documentation on models, quantization, and anti-injection defenses, see [docs/MODEL_AND_TOOLS.md](./docs/MODEL_AND_TOOLS.md).

---

## 👥 Team Ownership Boundaries (4 Members)

To ensure smooth parallel development, responsibilities are cleanly divided:

- **Member 1 (AI & Prompt Engineering):** Local Ollama client, anti-injection prompt templates (`<UNTRUSTED_PR_DIFF>`), structured JSON output parsing, and offline heuristic verdict generator.
- **Member 2 (Deterministic Heuristics Engine):** Whitespace diff detector, test-to-code ratio analyzer, issue link cross-checker, template completeness checker, and evidence line extractor.
- **Member 3 (Backend Architecture & Testing):** Express API routes, Zod validation schemas, sample PR dataset curation, end-to-end triage orchestrator, and Vitest test suite.
- **Member 4 (Frontend & Maintainer UX):** React + Vite + Tailwind CSS dashboard, PR diff viewer, verdict cards, interactive comment editor, and human-in-the-loop review approval flow.

Full team specifications can be found in [docs/TEAM_OWNERSHIP.md](./docs/TEAM_OWNERSHIP.md).

---

## 📚 API Contracts & Documentation

- [docs/API_CONTRACTS.md](./docs/API_CONTRACTS.md) — Comprehensive REST API specification and request/response payloads.
- [docs/TEAM_OWNERSHIP.md](./docs/TEAM_OWNERSHIP.md) — Module ownership and boundaries.
- [docs/MODEL_AND_TOOLS.md](./docs/MODEL_AND_TOOLS.md) — Model documentation, prompt engineering, and security guidelines.

---

## 🧪 Included Sample PRs for Mid-Evaluation

PRoof ships with three pre-configured local sample PRs to demonstrate the end-to-end pipeline:

1. **[samples/genuine-pr.json](./samples/genuine-pr.json):** Bugfix in `SessionManager` preventing token refresh race conditions, with linked issue `#142` and full unit tests.
2. **[samples/needs-work-pr.json](./samples/needs-work-pr.json):** An in-memory rate limiter middleware lacking cache eviction, tests, and issue link.
3. **[samples/likely-spam-pr.json](./samples/likely-spam-pr.json):** Whitespace and trailing-space edits in `README.md` and `src/index.ts`.

---

## 🚀 Getting Started

### Prerequisites
- Node.js v20+
- npm v10+
- *(Optional)* [Ollama](https://ollama.ai) installed with `ollama pull qwen2.5:3b` or `qwen2.5:1.5b` (if Ollama is not installed, PRoof automatically runs in transparent Heuristics-Only mode).

### Quick Setup

```bash
# Clone the repository
git clone https://github.com/jatinnagwani/CodeBiceps---Hacktoberfest.git
cd CodeBiceps---Hacktoberfest

# Install dependencies across all packages
npm install

# Run backend test suite
npm test

# Start both backend and frontend development servers
npm run dev
```

The frontend will be available at `http://localhost:5173` and the backend at `http://localhost:3001`.

---

## 📜 License

This project is licensed under the [MIT License](./LICENSE) — Copyright (c) 2026 Jatin Nagwani / CodeBiceps.
