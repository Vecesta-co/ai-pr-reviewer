# 🤖 ai-pr-reviewer

> **Enterprise-grade autonomous pull request reviewer and pre-commit code audit engine powered by Ollama, Google Gemini, and OpenAI with strict quality gates and line-level diff comments.**

[![CI](https://github.com/Vecesta-co/ai-pr-reviewer/actions/workflows/ci.yml/badge.svg)](https://github.com/Vecesta-co/ai-pr-reviewer/actions)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D18.0.0-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![Coverage](https://img.shields.io/badge/Coverage-93%25-brightgreen.svg)](https://github.com/Vecesta-co/ai-pr-reviewer)

---

## 📸 Terminal & Pull Request Preview

Here is an actual execution of `ai-pr-reviewer` running locally in terminal on a simulated pull request diff containing dynamic SQL injection, hardcoded credentials, and unsafe `eval()` calls:

```text
$ ai-pr-reviewer review --file tests/fixtures/sample.diff --provider mock --fail-on-severity CRITICAL,SECURITY

Analyzing diff with [MOCK] provider... (files: checking modified lines)

───────────────────────────────────────────────────────────────────
  V E C E S T A . C O   |   A I   C O D E   R E V I E W E R
───────────────────────────────────────────────────────────────────

  Verdict:     ✖ QUALITY GATE FAILED
  Duration:    0.01s
  Files:       2 reviewed (1 ignored)
  Findings:    3 issue(s) detected

  Summary:
  Identified 3 issue(s) across the reviewed hunks, including 2 security concern(s).

  Severity Breakdown:
    Security:  2
    Critical:  1
    Major:     0
    Minor:     0
    Nit:       0

  Detailed Issues:

   SECURITY  src/auth/service.ts:4 - Hardcoded Credential Detected
     Detected potential hardcoded API key, token, or secret. Hardcoded credentials pose
     severe exposure risks and should be loaded dynamically via environment variables.
     Suggested fix:
       const apiKey = process.env.API_KEY;

   SECURITY  src/auth/service.ts:7 - Potential SQL Injection Vulnerability
     Dynamic string concatenation or interpolation inside a raw SQL query can expose the
     application to SQL injection attacks. Use parameterized queries or prepared statements.
     Suggested fix:
       await db.query("SELECT * FROM users WHERE id = $1", [userId]);

  [CRITICAL] src/auth/service.ts:12 - Dangerous Use of eval()
     The eval() function executes arbitrary strings as code, presenting catastrophic remote
     code execution (RCE) vectors and performance penalties.
     Suggested fix:
       // Refactor to eliminate eval() and use a safe parser or lookup table

───────────────────────────────────────────────────────────────────
Process exited with code 1.
```

---

## ✨ Features

- ⚡ **Dual Runtime Architecture**: Run seamlessly as an automated **GitHub Action** on pull request events (`opened`, `synchronize`, `reopened`) or locally as a developer **Terminal CLI** on staged changes (`--staged`), uncommitted diffs, or patch files.
- 🦙 **100% Free & Private Local Mode (Ollama)**: Perform complete reviews locally without sending any proprietary code or API keys outside your machine using local models like `qwen2.5-coder`, `llama3.2`, or `deepseek-coder`.
- 🌐 **Multi-Provider LLM Engine**: Out-of-the-box support for **Google Gemini** (generous free tier), **OpenAI** (`gpt-4o-mini`, `gpt-4o`), and OpenAI-compatible endpoints (**Groq**, **DeepSeek**, **Together AI**, **vLLM**).
- 🛡️ **Zero-422 Coordinate Protection**: Features an internal AST hunk coordinate mapper (`LineMapper`) that verifies findings fall strictly within modified lines, eliminating GitHub API `422 Unprocessable Entity: line must be part of the diff` rejections.
- 🔍 **Automated Noise Suppression**: Automatically filters lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `yarn.lock`, `bun.lock`, `Cargo.lock`, `poetry.lock`), binary assets (images, fonts, archives), and minified bundles (`*.min.js`, `*.min.css`) to prevent wasted token budgets.
- 🎯 **Configurable CI Quality Gates**: Enforce hard blocking thresholds (e.g. `--fail-on-severity=CRITICAL,SECURITY`) to fail CI runs and prevent merging insecure or dangerous pull requests.
- 💡 **One-Click GitHub Suggestions**: Emits native GitHub markdown suggestion blocks (````suggestion ... ````) enabling code authors to apply fixes with a single click.
- 🧪 **Offline Rule Engine / Mock Mode**: Includes an offline heuristic analyzer that detects common vulnerabilities (SQL injection, hardcoded credentials, empty catch blocks, `eval`) with zero network dependencies.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                       Event Trigger                         │
│  ┌────────────────────────────┐  ┌────────────────────────┐ │
│  │   GitHub Actions Event     │  │  Local Developer CLI   │ │
│  │ (pull_request synchronize) │  │  (git diff / --staged) │ │
│  └─────────────┬──────────────┘  └───────────┬────────────┘ │
└────────────────┼─────────────────────────────┼──────────────┘
                 ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                 Diff Parser & Noise Filter                  │
│  - Filters 15+ lockfile, asset, and generated extensions    │
│  - Parses unified diff into file hunks and addition lines   │
│  - Validates coordinate boundaries (LineMapper)             │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Unified AI Review Engine                    │
│      ├── Ollama (Local offline, private, zero cost)         │
│      ├── Google Gemini (Generous free API tier)             │
│      ├── OpenAI & Compatible (Groq / DeepSeek / vLLM)       │
│      └── Deterministic Offline Rule Provider (CI-friendly)  │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                 Quality Gate & Formatting                   │
│  - Zod response schema validation                           │
│  - Minimum severity threshold filtering                     │
│  - Quality gate pass/fail evaluation (--fail-on-severity)   │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                      Publishers                             │
│  ┌────────────────────────────┐  ┌────────────────────────┐ │
│  │     GitHub PR Publisher    │  │  Terminal ANSI Report  │ │
│  │  - Inline diff comments    │  │  - Colorized verdicts  │ │
│  │  - Executive summary table │  │  - Exit 0 or Exit 1    │ │
│  └────────────────────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 🚀 Quick Start

### 1. Local CLI Usage

Install globally or run directly via `npx`:

```bash
# Clone and build
git clone https://github.com/Vecesta-co/ai-pr-reviewer.git
cd ai-pr-reviewer
npm install && npm run build
npm link
```

Audit your staged changes before committing:

```bash
# Review staged git changes with local Ollama
ai-pr-reviewer review --staged --provider ollama

# Review changes compared to main branch using Google Gemini
ai-pr-reviewer review --branch main --provider gemini --api-key $GEMINI_API_KEY

# Review a saved patch file with blocking security gates
ai-pr-reviewer review --file patch.diff --provider mock --fail-on-severity CRITICAL,SECURITY
```

### 2. GitHub Actions Integration

Create `.github/workflows/ai-review.yml` in your repository:

```yaml
name: AI Pull Request Review

permissions:
  contents: read
  pull-requests: write

on:
  pull_request:
    types: [opened, synchronize, reopened]

jobs:
  review:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout Code
        uses: actions/checkout@v4

      - name: Run AI PR Reviewer
        uses: Vecesta-co/ai-pr-reviewer@v1.0.0
        with:
          github-token: ${{ secrets.GITHUB_TOKEN }}
          provider: 'gemini'
          api-key: ${{ secrets.GEMINI_API_KEY }}
          min-severity: 'MINOR'
          fail-on-severity: 'CRITICAL,SECURITY'
```

---

## ⚙️ Configuration Reference

| Parameter | Action Input | CLI Flag | Env Var | Default | Description |
|---|---|---|---|---|---|
| **Provider** | `provider` | `-p, --provider` | `AI_PROVIDER` | `gemini` | `ollama`, `gemini`, `openai`, or `mock` |
| **Model** | `model` | `-m, --model` | `AI_MODEL` | Provider default | Specific model name (e.g. `qwen2.5-coder:latest`, `gemini-1.5-flash`) |
| **API Key** | `api-key` | `--api-key` | `AI_API_KEY` | None | API key for Gemini or OpenAI |
| **API Endpoint** | `api-endpoint` | `--endpoint` | `AI_ENDPOINT` | Provider default | Base URL for Ollama (`http://127.0.0.1:11434`) or custom proxies |
| **Min Severity** | `min-severity` | `--min-severity` | `MIN_SEVERITY` | `NIT` | Minimum severity level to include (`SECURITY`, `CRITICAL`, `MAJOR`, `MINOR`, `NIT`) |
| **Fail Gate** | `fail-on-severity` | `--fail-on-severity` | `FAIL_ON_SEVERITY` | None | Comma-separated severities that fail the run (e.g. `CRITICAL,SECURITY`) |
| **JSON Output** | N/A | `--json` | N/A | `false` | Output pure JSON result to stdout |

---

## 🧪 Testing Instructions

The test suite covers unit and integration tests across diff parsing, line coordinate snapping, severity evaluation, and CLI execution.

```bash
# Run unit and integration tests
npm test

# Run tests with complete V8 line coverage report
npm run test:coverage

# Run TypeScript type check
npm run typecheck
```

---

## 💡 What's Special & Unique

1. **Dual Local & Cloud Paradigm**: Unlike SaaS review bots that only operate on cloud webhooks, `ai-pr-reviewer` is designed as a developer productivity tool you run directly in your terminal before ever opening a pull request.
2. **Defensive Line Coordinate Snapper**: Eliminates the infamous GitHub 422 API failure by mapping requested line coordinates against actual git hunk boundaries.
3. **Pluggable Architecture**: You are never locked into an expensive paid SaaS or single proprietary model. Switch seamlessly between a local Ollama instance, Google Gemini's free tier, or custom enterprise vLLM deployments.
4. **Enforceable Quality Gates**: Turn code reviews into automated quality gates by failing CI if `SECURITY` or `CRITICAL` flaws are found.

---

## ⚖️ Why This Is Different and More Capable

| Feature | `coderabbitai/ai-pr-reviewer` (Archived Baseline) | Commercial SaaS Reviewers | **`ai-pr-reviewer` (Vecesta.co)** |
|---|---|---|---|
| **Maintenance Status** | Archived (Late 2023) | Active (Commercial) | **Active Open-Source (MIT)** |
| **Local CLI Mode** | ❌ No (GitHub Actions only) | ❌ No (SaaS only) | **✅ Yes (First-class terminal CLI)** |
| **Free & Local Execution** | ❌ Requires paid OpenAI key | ❌ Monthly subscription ($15-30/seat) | **✅ Free (Ollama local / Gemini free tier)** |
| **Model Independence** | ❌ Locked to OpenAI | ❌ Proprietary | **✅ Pluggable (Ollama, Gemini, OpenAI, Groq)** |
| **Hunk Boundary Defense** | ⚠️ Naive offset mapping caused 422 errors | Closed heuristic | **✅ Exact boundary snapping via `LineMapper`** |
| **Automated Noise Filters** | ❌ Evaluated lockfiles naively | Cloud filters | **✅ Built-in lockfile & asset ignore matrix** |
| **CI Blocking Thresholds** | ❌ Advisory comments only | Web dashboard | **✅ Configurable `--fail-on-severity` gates** |
| **Deterministic Mock Mode**| ❌ Failed without live keys | ❌ None | **✅ Hermetic CI rule engine included** |

---

## 🛠️ Difficulties Faced & Solutions (from DEVLOG.md)

- **Obstacle 1: DefinitelyTyped Missing Package (`@types/parse-diff`)**
  - *Problem*: `npm error 404 Not Found - GET https://registry.npmjs.org/@types%2fparse-diff`.
  - *Solution*: Identified that `parse-diff` lacks an official DefinitelyTyped package. Authored a custom ambient TypeScript declaration file (`src/types/parse-diff.d.ts`) defining the precise structures for `Change`, `Chunk`, and `File`.
- **Obstacle 2: `parse-diff` Chunk Content vs Changes Semantic Trap**
  - *Problem*: The analyzer initially returned 0 findings when evaluating sample diffs with severe SQL injection bugs.
  - *Solution*: Investigation revealed that `parse-diff` only assigns the single hunk header string (e.g. `@@ -0,0 +1,14 @@`) to `chunk.content`, storing actual code lines in `chunk.changes.map(c => c.content)`. Refactored `diff-parser.ts` to reconstruct full hunks reliably.
- **Obstacle 3: Relative Path Node Modules Ignore Matching**
  - *Problem*: `shouldIgnoreFile('node_modules/express/index.js')` evaluated to `false`.
  - *Solution*: The path check relied on `normalized.includes('/node_modules/')`, requiring a leading slash. Updated the condition to test both `startsWith` and `includes` across all ignored directories.

---

## 🗺️ Roadmap

- [x] v1.0.0: Initial release with Ollama, Gemini, OpenAI, and Mock providers, CLI + Action runtime, and quality gates.
- [ ] v1.1.0: AST-aware semantic chunking for TypeScript, Python, and Go functions.
- [ ] v1.2.0: PR chat response mode (`@vecesta-bot review`) to reply to user comments directly in GitHub.
- [ ] v1.3.0: SARIF output format for GitHub Code Scanning integration.

---

## 🤝 Contributing

Contributions are welcomed! Please read our [Contributing Guide](CONTRIBUTING.md) and [Code of Conduct](CODE_OF_CONDUCT.md).

---

## 📄 License

This project is licensed under the [MIT License](LICENSE) - Copyright (c) 2026 **Vecesta.co**.

---

## 🏢 Credits & Contact

Built with pride by **Vecesta.co** — engineering elite open-source software factory tools.

- **Organization**: [Vecesta.co](https://github.com/Vecesta-co)
- **Email**: vecesta.co@gmail.com
- **LinkedIn**: [Vansh Dhawan](https://www.linkedin.com/in/vansh-dhawan-2625v)
- **GitHub**: [Vecesta-co](https://github.com/Vecesta-co)
- **X (Twitter)**: [@Vansh_Dhawann](https://x.com/Vansh_Dhawann)
- **Hugging Face**: [Vecesta](https://huggingface.co/Vecesta)
