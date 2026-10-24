# PRoof Backend API Server

The backend API server for **PRoof** — a local-first AI-powered pull request triage and contributor mentoring tool.

## Architecture Highlights

- **100% Local-First & Privacy Preserving**: Zero cloud AI keys required. Operates with local [Ollama](https://ollama.ai) daemon or deterministic heuristics fallback.
- **Strict Zod Contract Validation**: All request and response structures are validated against `@proof/shared` schemas.
- **Robust Failure Modes**: Automatically detects offline Ollama instances, missing models, and malformed outputs without server crashes.
- **Non-Destructive Guarantee**: Strictly read-only analysis and maintainer approval tracking; never automatically merges, closes, or writes to external GitHub repositories.

---

## Prerequisites

- **Node.js**: v20 or higher
- **npm**: v10 or higher
- *(Optional)* **Ollama**: running locally on `http://localhost:11434` with `proof-reviewer` (or `qwen2.5:3b`) installed. If Ollama is not running, the backend transparently operates in **Heuristics-Only Mode**.

---

## Configuration

Environment variables can be configured via a `.env` file in `backend/` or the project root. Copy `.env.example` to get started:

```bash
cp .env.example .env
```

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3001` | HTTP server port |
| `HOST` | `0.0.0.0` | Server binding host |
| `NODE_ENV` | `development` | Runtime environment mode |
| `OLLAMA_HOST` | `http://localhost:11434` | Local Ollama daemon base URL |
| `OLLAMA_MODEL` | `proof-reviewer` | Configured local Ollama model tag |
| `OLLAMA_TIMEOUT_MS` | `20000` | Model inference timeout in milliseconds |
| `OLLAMA_TEMPERATURE`| `0.1` | Low temperature for deterministic classification |

*No secrets or third-party AI tokens (OpenAI, Anthropic, etc.) are needed or accepted.*

---

## How to Start the Backend

### 1. From the Monorepo Root (Recommended)

```bash
# Start backend dev server with hot reload
npm run dev:backend

# Or build and start production server
npm run build
npm start
```

### 2. From the `backend/` Directory

```bash
cd backend

# Install dependencies
npm install

# Start development server with file watching
npm run dev

# Or compile and run production bundle
npm run build
npm start
```

The server will start listening at `http://localhost:3001`.

---

## Running Checks & Tests

Execute the backend Vitest suite (including unit, integration, and smoke tests):

```bash
# From monorepo root
npm test

# From backend/
npm test
```

---

## Core API Endpoints

### 1. Health Status
- **`GET /api/health`** (or `GET /health`)
- Returns engine readiness, active heuristics count, and Ollama connectivity status.

### 2. Sample Pull Requests
- **`GET /api/pull-requests`** (or `GET /api/samples`)
- Returns the benchmark sample PR fixtures (`sample-genuine-01`, `sample-needs-work-02`, `sample-likely-spam-03`, `sample-whitespace-04`).
- **`GET /api/pull-requests/:id`**
- Returns a specific sample pull request by ID.

### 3. Pull Request Analysis
- **`POST /api/analyze`** (or `POST /api/triage/analyze`)
- Accepts a `PullRequestPayload` body and executes the dual-engine triage pipeline.
- Returns a validated `AnalysisResult` containing:
  - `verdict`: `'GENUINE'` | `'NEEDS_WORK'` | `'LIKELY_SPAM'`
  - `confidence`: `'HIGH'` | `'MEDIUM'` | `'LOW'`
  - `engine`: `'OLLAMA_LOCAL'` | `'HEURISTICS_FALLBACK'`
  - `reasoning`: Grounded 1–3 sentence verdict justification
  - `heuristicFindings`: Array of deterministic rule evaluations
  - `evidence`: Verified diff citations (hallucinated line numbers/files stripped)
  - `suggestedComment`: Constructive, polite mentoring feedback ready for maintainer review

### 4. Maintainer Review Approval
- **`POST /api/reviews/approve`**
- In-memory verification recording of human maintainer approval and comment adjustments.

### 5. Evidence Verification
- **`POST /api/evidence/validate`**
- Validates batch evidence items against PR unified diff hunks.
