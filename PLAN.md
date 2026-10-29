# PLAN.md: ai-pr-reviewer (Vecesta.co)

> **Autonomous Pull Request Reviewer & Local Code Audit Engine**  
> **Reference Baseline**: `coderabbitai/ai-pr-reviewer` (Archived open-source action)  
> **Author**: Vecesta.co (`vecesta.co@gmail.com`)  
> **Target Release**: v1.0.0 (MIT License)

---

## 1. Executive Summary & Scope

Modern engineering teams need high-frequency, reliable code review feedback without leaking private IP or paying exorbitant SaaS per-seat costs. CodeRabbit's original open-source action (`coderabbitai/ai-pr-reviewer`) was archived when they transitioned to a closed-source SaaS model. Furthermore, early open-source review bots suffered from high false-positive noise, GitHub `422 Unprocessable Entity` comment offset failures, total reliance on paid OpenAI API keys, inability to run locally before opening a PR, and lack of CI blocking quality gates.

`ai-pr-reviewer` is an enterprise-grade, dual-mode (GitHub Action + Local Terminal CLI) autonomous code reviewer. It natively supports **Ollama** (100% free, private, local offline execution), **Google Gemini** (generous free-tier API), and **OpenAI/OpenAI-compatible APIs** (Groq, Together, DeepSeek, vLLM). It parses Git diffs into structured semantic hunks, accurately computes exact line coordinates to eliminate GitHub API rejections, filters noisy lockfiles/vendor artifacts, classifies findings into calibrated severity tiers (`SECURITY`, `CRITICAL`, `MAJOR`, `MINOR`, `NIT`), and emits one-click GitHub suggestion blocks alongside enforceable CI failure thresholds.

### In Scope
- **Dual Runtime Support**:
  - GitHub Action (`action.yml`) for pull request triggers (`opened`, `synchronize`, `reopened`).
  - Standalone Terminal CLI (`ai-pr-reviewer review`) for pre-commit, branch diff, or staged file audits.
- **Provider-Agnostic LLM Engine**:
  - Ollama (offline local models: `qwen2.5-coder`, `llama3.2`, `deepseek-coder`).
  - Google Gemini API (Gemini 1.5/2.0 Flash / Pro free tier).
  - OpenAI & compatible endpoints (OpenAI, Groq, DeepSeek, Together AI).
  - Deterministic Mock / Offline Rule Provider for zero-dependency CI environments and hermetic unit testing.
- **Smart Diff Parser & Hunk Mapper**:
  - Unified diff parser with accurate new-file line mapping and diff position indexing.
  - Automatic noise filtering: ignore lockfiles (`package-lock.json`, `pnpm-lock.yaml`, `bun.lock`, `Cargo.lock`, `poetry.lock`), build artifacts, vendor directories, and minified bundles.
  - Token-budget-aware hunk chunking to support large PRs without context overflow.
- **Structured Severity Schema & Quality Gates**:
  - Output validation via Zod schemas: enforces file path, line number, severity, title, explanation, and one-click GitHub diff replacement snippet.
  - Configurable CI Gates: `--fail-on-severity=CRITICAL,SECURITY` (blocks merge if severe flaws exist).
  - Severity filtering: `--min-severity=MINOR` to suppress nits.
- **Publishing & Reporting**:
  - GitHub PR review comment publisher: posts inline comments on specific diff lines and an executive summary table as a top-level review.
  - CLI Output: Rich interactive terminal formatting with colorized severity badges, summary tables, and JSON export for pipeline integration.

### Out of Scope (v1.0.0)
- Full repository-wide static analysis compilation (handled by dedicated linters/compilers).
- Self-hosted web dashboard UI (handled via GitHub PR UI and CLI terminal output).

---

## 2. Architecture & Data Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Input Sources                            │
│  ┌────────────────────────────┐  ┌────────────────────────┐ │
│  │  GitHub Actions PR Event   │  │  Developer Local CLI   │ │
│  │ (Octokit / REST API Diff)  │  │ (git diff / git status)│ │
│  └─────────────┬──────────────┘  └───────────┬────────────┘ │
└────────────────┼─────────────────────────────┼──────────────┘
                 ▼                             ▼
┌─────────────────────────────────────────────────────────────┐
│                   Diff Ingestion & Parsing                  │
│  - Parse unified diff into file hunks                       │
│  - Filter noise: lockfiles, binaries, vendor, generated     │
│  - Compute valid new-file lines & diff hunk ranges          │
│  - Chunk into token-safe batches per file/module            │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   AI Review Orchestrator                    │
│  - System Prompt: strict role definition & severity schema  │
│  - Context payload: PR title, description, file diffs       │
│  - Unified LLM Client:                                      │
│      ├── Ollama (Local, offline, zero-cost)                 │
│      ├── Gemini API (Free tier)                             │
│      ├── OpenAI / OpenAI-compatible                         │
│      └── Offline Deterministic Rule/Mock Provider           │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│               Validation & Quality Gating                   │
│  - Zod schema validation of LLM JSON response               │
│  - Line boundary verification (prevent 422 API errors)      │
│  - Filter by minimum severity threshold                     │
│  - Evaluate CI failure gate (--fail-on-severity)            │
└──────────────────────────────┬──────────────────────────────┘
                               ▼
┌─────────────────────────────────────────────────────────────┐
│                   Output & Publishing                       │
│  ┌────────────────────────────┐  ┌────────────────────────┐ │
│  │ GitHub Action Publisher    │  │ Terminal CLI Reporter  │ │
│  │ - Inline diff comments     │  │ - Colorized severity   │ │
│  │ - Summary review table     │  │ - Markdown / JSON dump │ │
│  │ - Set action status (exit) │  │ - Exit code 0 or 1     │ │
│  └────────────────────────────┘  └────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## 3. Technology Stack & Dependencies

| Component | Technology | Rationale & Version |
|---|---|---|
| **Runtime** | Node.js (>=18.0.0, 20.x, 22.x) | Ubiquitous across GitHub Action runners and developer machines. |
| **Language** | TypeScript 5.5+ | Strict type safety, prevents runtime shape bugs, self-documenting. |
| **Diff Parser** | `parse-diff` (v0.11+) | Battle-tested unified diff parser handling additions, deletions, chunk headers. |
| **Schema Validation** | `zod` (v3.23+) | Zero-dependency TypeScript-first schema declaration and validation. |
| **GitHub API** | `@actions/github` (v6.0+) & `@octokit/rest` | Official GitHub SDK for Actions and REST API integration. |
| **CLI Framework** | `commander` (v12.0+) | Standard, fast, and ergonomic CLI argument parsing. |
| **Terminal UX** | `chalk` (v4.1.2) | Beautiful colorized terminal formatting compatible with CommonJS/ESM. |
| **Testing** | `vitest` (v2.0+) & `@vitest/coverage-v8` | Blazing fast ESM/TS testing framework with accurate line/branch coverage. |
| **Build & Bundler** | `tsup` / `tsc` | Fast zero-config TypeScript compilation. |

---

## 4. Repository & Folder Structure

```
ai-pr-reviewer/
├── .github/
│   ├── workflows/
│   │   ├── ci.yml                 # Test, lint, build, coverage check
│   │   └── self-review.yml       # Dogfooding self-review action
│   ├── ISSUE_TEMPLATE/
│   │   ├── bug_report.md
│   │   └── feature_request.md
│   └── PULL_REQUEST_TEMPLATE.md
├── src/
│   ├── action.ts                 # GitHub Action entrypoint
│   ├── cli.ts                    # Command-line interface entrypoint
│   ├── config.ts                 # Environment variable and config validation
│   ├── core/
│   │   ├── analyzer.ts           # Prompt generation and response validation
│   │   ├── diff-parser.ts        # Unified diff parsing and file filtering
│   │   ├── line-mapper.ts        # Maps new-file lines to diff position offsets
│   │   ├── quality-gate.ts       # Severity evaluation and pass/fail gates
│   │   ├── reporter.ts           # Markdown table and terminal report formatters
│   │   └── types.ts              # Domain interfaces and Zod schemas
│   ├── providers/
│   │   ├── base.ts               # Base LLM provider interface
│   │   ├── gemini.ts             # Google Gemini API provider
│   │   ├── ollama.ts             # Local Ollama HTTP provider
│   │   ├── openai.ts             # OpenAI & compatible provider
│   │   └── mock.ts               # Deterministic rule-based mock provider
│   └── github/
│       ├── client.ts             # Octokit wrapper for PR reviews and comments
│       └── comment-builder.ts    # Inline comment and suggestion payload builder
├── tests/
│   ├── unit/
│   │   ├── diff-parser.test.ts   # Hunk parsing, filter rules, edge cases
│   │   ├── line-mapper.test.ts   # Boundary offsets, out-of-range detection
│   │   ├── quality-gate.test.ts  # Severity threshold evaluation
│   │   └── providers.test.ts     # Provider serialization and error handling
│   ├── integration/
│   │   ├── cli.test.ts           # End-to-end CLI execution with git diffs
│   │   └── analyzer.test.ts      # Multi-file review orchestration
│   └── fixtures/
│       ├── sample.diff           # Realistic multi-file git diff
│       └── large.diff            # PR with lockfiles and noise
├── action.yml                    # GitHub Action manifest
├── Dockerfile                    # Containerized execution option
├── package.json                  # Scripts, bin, and dependencies
├── tsconfig.json                 # Strict TypeScript configuration
├── vitest.config.ts              # Vitest runner configuration
├── .env.example                  # Documented environment variables
├── .gitignore                    # Node and build ignores
├── LICENSE                       # MIT License (Vecesta.co)
├── README.md                     # Comprehensive documentation
├── CONTRIBUTING.md               # Community guidelines
├── CODE_OF_CONDUCT.md            # Contributor Covenant
├── SECURITY.md                   # Vulnerability reporting policy
├── PLAN.md                       # This plan document
└── DEVLOG.md                     # Running engineer log
```

---

## 5. "How We Are Different & More Capable"

| Dimension | `coderabbitai/ai-pr-reviewer` (Archived Baseline) | Typical SaaS Bots (CodeRabbit / Copilot) | **`ai-pr-reviewer` (Vecesta.co)** |
|---|---|---|---|
| **Open-Source Status** | Archived (late 2023), no longer maintained | Closed source / Paid SaaS subscriptions | **100% Active Open-Source (MIT)** with transparent roadmap |
| **Local / Pre-PR Execution** | No (GitHub Action only) | No (Cloud GitHub webhook only) | **Yes**: First-class CLI (`ai-pr-reviewer review`) for pre-commit / local diffs |
| **Cost & Privacy** | Requires paid OpenAI API key | Paid monthly subscription ($15–$30/user/mo) | **Free-first**: 100% Free & private via Ollama, zero API keys required |
| **Provider Support** | OpenAI GPT-3.5/GPT-4 only | Proprietary vendor lock-in | **Pluggable**: Ollama, Google Gemini Free Tier, OpenAI, Groq, DeepSeek |
| **GitHub 422 Offset Protection** | Naive line estimation led to frequent 422 API errors | Internal server-side heuristic | **Exact Hunk Coordinate Mapping**: Validates comments exist strictly within diff boundaries |
| **Noise Filtering** | Processed lockfiles naively, wasting context | Server-side filters | **Intelligent Ignore Matrix**: Auto-skips 15+ lockfile/binary/minified extensions |
| **CI Quality Gating** | Informational comments only, never blocked CI | Dashboard policy rules | **Configurable CI Fail Gates**: `--fail-on-severity=SECURITY,CRITICAL` blocks broken PRs |
| **Deterministic Mock Mode** | None (tests fail without live API keys) | None | **Built-in Mock Provider**: Allows 100% hermetic CI test suite without network |

---

## 6. Test Strategy & Quality Assurance

1. **Unit Testing (`tests/unit/`)**:
   - `diff-parser.test.ts`: Verify hunk extraction, addition/deletion line counting, and noise filtering for `pnpm-lock.yaml`, images, and minified bundles.
   - `line-mapper.test.ts`: Verify line coordinate translation, checking that requesting an inline comment on a deleted or non-modified line throws a clean out-of-bounds error.
   - `quality-gate.test.ts`: Test severity threshold filtering (`CRITICAL`, `MAJOR`, `MINOR`, `NIT`, `SECURITY`) and exit code resolution.
   - `providers.test.ts`: Test network error resilience, timeout handling, JSON extraction from markdown code fences, and fallback logic.
2. **Integration & E2E Testing (`tests/integration/`)**:
   - Run the CLI against live local git diff fixtures using the built-in deterministic provider.
   - Verify stdout formatting, exit codes, and JSON outputs.
3. **Coverage Target**:
   - >= 85% statement coverage across core parser and analysis engine.
   - 100% test pass rate from a clean clone.

---

## 7. gstack Alignment & Execution Schedule

Following the gstack workflow (Planning -> Review -> QA -> Shipping):
- **Phase 1: Research**: Complete (identified archive history, provider limitations, 422 bug vector).
- **Phase 2: Plan**: This document (`PLAN.md`).
- **Phase 3: Build**: Implement modular TypeScript architecture, recording every obstacle and breakthrough in `DEVLOG.md`.
- **Phase 4: Test**: Vitest unit + integration suite, dogfooding on local diffs.
- **Phase 5: Document**: Author high-impact `README.md` with badges, ASCII diagrams, diff comparison, and Vecesta.co contact block.
- **Phase 6: Verify**: Test clean install and CLI execution.
- **Phase 7: Release**: Initialize git repository, commit with conventional commit format, tag `v1.0.0`.
- **Phase 8: Report**: Post completion report and transition to Project 2.
