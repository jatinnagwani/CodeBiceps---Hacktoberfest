# PRoof 🛡️
### Protect maintainers. Empower contributors. Keep open source open.

**PRoof is a local-first AI-powered pull request triage and mentoring assistant that helps open-source maintainers review incoming contributions while giving beginners a better path to making their first meaningful contribution.**

Open source thrives on contributions — but reviewing pull requests takes time. Maintainers often face irrelevant submissions, incomplete PR descriptions, oversized diffs, and contributions that need significant improvement. At the same time, genuine beginners may receive vague feedback or get discouraged before they learn how to contribute effectively.

PRoof aims to solve both sides of this problem.

> **Our philosophy:** Don't just detect problematic pull requests. Help people become better contributors.

---

## 🎯 The Problem

Open-source maintainers are often overwhelmed by the time and effort required to triage incoming pull requests.

- **Review fatigue:** Every pull request requires attention, even when it lacks essential information.
- **Low-quality submissions:** Missing issue references, incomplete descriptions, and unnecessarily large changes make reviews harder.
- **Uncertain decisions:** Simple automated rules cannot reliably determine whether a contribution is useful.
- **Discouraged beginners:** New contributors may not understand what went wrong or how to improve their submission.
- **Privacy concerns:** Sending private source code and diffs to external AI services may not be appropriate for every project.

Existing workflows need a way to prioritize review, explain concerns with evidence, and encourage genuine contributors to improve.

## 💡 The Solution

PRoof combines lightweight heuristics with local AI analysis to provide **evidence-based, human-supervised pull request triage**.

It examines the available PR information, identifies potential issues, and produces an understandable assessment with specific evidence and constructive next steps.

Instead of treating every suspicious signal as proof of spam, PRoof helps maintainers decide what deserves attention.

### 🔍 How It Works

1. **Collect** — Gather the pull request title, description, code diff, and linked issue when available.
2. **Pre-check** — Apply lightweight heuristics to identify signals such as unusually large diffs, whitespace-only changes, missing context, or incomplete templates.
3. **Analyze** — Use a local open-weight language model to evaluate the available evidence and context.
4. **Explain** — Generate a preliminary verdict, supporting evidence, and specific improvement suggestions.
5. **Assist** — Draft a polite, actionable response that a maintainer can review and edit.
6. **Keep humans in control** — The maintainer makes the final decision. PRoof does not automatically reject or close contributions.

---

## ✨ Key Features

### 🛡️ AI-Assisted PR Triage
Identify pull requests that may need extra attention using heuristics and contextual AI analysis.

### 📌 Evidence-Based Assessments
Connect concerns to relevant lines or observable details in the submitted diff instead of producing unexplained judgments.

### 🌱 Beginner-Friendly Mentoring
Help genuine contributors understand missing context, potential bugs, unclear descriptions, and ways to improve their submissions.

### ✍️ Constructive Reply Drafts
Generate specific, respectful response drafts that maintainers can review before sending.

### 🧪 Contributor Pre-flight Check
Allow contributors to check a proposed diff before opening a pull request, helping them catch avoidable problems early.

### 🔒 Local-First AI
Designed around local inference with an open-weight model, reducing dependence on external AI APIs and keeping code analysis on the user's machine when configured for fully local operation.

### 👤 Human-in-the-Loop Decisions
PRoof is an assistant, not a judge. Maintainers retain control over review, communication, and merge decisions.

*Features are under development; the final implementation and supported workflows will be documented as they become available.*

---

## 🧠 Triage Philosophy

PRoof is designed to provide one of three preliminary outcomes:

| Verdict | Meaning |
|---|---|
| **Genuine** | The contribution appears relevant and reasonably well-supported by the available evidence. |
| **Needs Work** | The contribution may be legitimate but requires clarification, improvements, or further review. |
| **Likely Spam** | Multiple signals suggest the submission may be irrelevant, repetitive, or otherwise suspicious. |

These outcomes are recommendations, not definitive judgments.

A large diff does not automatically mean a bad contribution. Missing an issue link does not automatically make a PR suspicious. AI-generated code is not inherently low quality.

**PRoof evaluates contribution signals and available evidence — not a contributor's worth or intentions.**

When evidence is insufficient or conflicting, the system should favor uncertainty and human review rather than an overconfident accusation.

---

## 🏗️ Planned Architecture

PRoof is being developed around a modular workflow:

```text
Pull Request / Proposed Diff
             |
             v
      Context Collection
             |
             v
       Heuristic Checks
             |
             v
     Local AI Analysis
             |
             v
  Verdict + Evidence + Advice
             |
             v
     Human Review / Edit
             |
             v
   Maintainer's Final Decision
```

The contributor pre-flight workflow will reuse the analysis process to provide feedback before a pull request is submitted.

---

## 🧰 Technology Direction

The project is being designed with the following principles:

- **Local AI inference:** An open-weight language model running locally.
- **Explainable analysis:** Results should include reasons that users can inspect.
- **Modular checks:** Heuristics and model-based analysis should be independently testable.
- **Privacy-conscious design:** Avoid sending repository contents to external services by default.
- **Human oversight:** No automatic rejection or closure based solely on model output.

The exact model, runtime, application framework, and GitHub integration approach will be documented once finalized.

---

## 🔐 Responsible AI & Privacy

PRoof is intended to assist human reviewers, not replace them.

- It must not treat AI-generated code as automatically suspicious.
- It should distinguish observable evidence from model inference.
- It should avoid claiming certainty about contributor intent.
- It should provide constructive feedback wherever possible.
- It should keep final moderation and merge decisions with humans.
- Local inference should be used for code analysis wherever the configured architecture supports it.

AI assessments can be wrong. Every recommendation should be treated as a starting point for review.

---

## 🌍 Who Is PRoof For?

- **Open-source maintainers** dealing with growing review queues.
- **First-time contributors** learning contribution standards and review etiquette.
- **Small development teams** looking for a lightweight triage assistant.
- **Open-source communities and hackathons** that want to encourage meaningful participation without overwhelming reviewers.

## 🚀 Project Status

**Early development — Hacktoberfest Hack Day 2026**

PRoof is being built from scratch. The current repository is the starting point for implementing and validating the proposed workflows.

The next milestones are to establish the local AI pipeline, implement heuristic checks, generate evidence-backed assessments, build the contributor pre-flight workflow, and demonstrate the system on representative pull requests.

## 🤝 Contributing

Contributions, feedback, and ideas are welcome as the project develops.

Potential areas to explore include:

- Better pull request quality signals
- Evaluation datasets for triage accuracy
- More useful mentoring feedback
- Local model integration and performance
- GitHub workflow integration
- Accessibility and usability improvements

Contribution guidelines will be added as the development workflow takes shape.

## 📜 License

This project is licensed under the [MIT License](LICENSE).

## 💬 The Vision

Open source should be easier to maintain — and easier to join.

**PRoof aims to protect maintainers' time without closing the door on tomorrow's great contributors.**

*Better triage. Better feedback. A healthier open-source community.*
