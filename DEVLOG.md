# DEVLOG.md: ai-pr-reviewer

Running development log documenting real technical obstacles, root cause investigations, design decisions, and solutions throughout the engineering lifecycle.

---

### Entry 1: Architecture Initialization & Technology Choices
- **Context**: Bootstrapping Project 1 (`ai-pr-reviewer`) for Vecesta.co.
- **Challenge**: The tool must run both in GitHub Actions (where `@actions/core` and `@actions/github` manage inputs/outputs) and in a local developer's terminal (where CLI flags like `--file`, `--staged`, `--provider` dictate behavior). If the core logic is coupled to GitHub Actions runner environments, CLI usage will fail with missing environment variables (`GITHUB_TOKEN`, `GITHUB_EVENT_PATH`).
- **Solution**: Designed a decoupled layered architecture:
  - `src/core/`: 100% platform-agnostic. Deals solely with parsing diffs, invoking the LLM provider, validating severity schemas, and producing review findings.
  - `src/cli.ts`: Entrypoint for terminal users. Reads local git diffs via `git diff` child process, feeds them to the core analyzer, and prints colorized output.
  - `src/action.ts`: Entrypoint for GitHub Actions. Extracts PR diff via Octokit, feeds to core analyzer, and posts inline review comments to the PR.
- **Status**: Architecture locked in `PLAN.md`.

---

### Entry 2: Dependency Typings & npm 404 Resolution
- **Context**: Installing dev dependencies via `npm install`.
- **Obstacle**: `npm error 404 Not Found - GET https://registry.npmjs.org/@types%2fparse-diff`.
- **Root Cause**: `@types/parse-diff` does not exist on DefinitelyTyped / npm registry because the library does not have an official DefinitelyTyped package.
- **Solution**: Removed `@types/parse-diff` from `package.json` devDependencies. Added an explicit TypeScript ambient declaration file `src/types/parse-diff.d.ts` defining the structure of `parse-diff` hunks, files, and chunks.
- **Status**: Fixed.

---

### Entry 3: `parse-diff` Chunk Content vs Changes Semantic Trap
- **Context**: Running analyzer on git diff fixtures.
- **Obstacle**: Analyzer produced 0 findings even when diff contained severe SQL injection and hardcoded API tokens.
- **Root Cause**: In `parse-diff`, `chunk.content` only stores the chunk header line (e.g. `@@ -0,0 +1,14 @@`), NOT the actual lines of code. The code lines are stored in `chunk.changes.map(c => c.content)`. By joining `chunk.content`, the provider received a prompt with empty hunks.
- **Solution**: Reconstructed full hunk diff by composing `[chunk.content, ...chunk.changes.map(c => c.content)].join('\n')`.
- **Status**: Fixed and verified.

---

### Entry 4: Relative Path Node Modules Ignore Matching
- **Context**: Verifying ignore matrix for non-code assets.
- **Obstacle**: `shouldIgnoreFile('node_modules/express/index.js')` returned `false`.
- **Root Cause**: The check used `normalized.includes('/node_modules/')`, which expects a leading slash and fails on relative paths.
- **Solution**: Updated condition to check `normalized.startsWith('node_modules/') || normalized.includes('/node_modules/')` across all ignore paths.
- **Status**: Fixed.

---

