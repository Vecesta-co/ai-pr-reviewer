# Contributing to ai-pr-reviewer

Thank you for your interest in contributing to **ai-pr-reviewer**, an open-source project by [Vecesta.co](https://github.com/Vecesta-co)! We welcome bug reports, documentation enhancements, feature proposals, and pull requests.

---

## Code of Conduct
All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to `vecesta.co@gmail.com`.

---

## Development Setup

### Prerequisites
- **Node.js**: v18.0.0 or higher (v20+ recommended)
- **Git**: v2.30+
- **npm**: v9+

### Quickstart
1. Fork and clone the repository:
   ```bash
   git clone https://github.com/Vecesta-co/ai-pr-reviewer.git
   cd ai-pr-reviewer
   ```
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run the test suite:
   ```bash
   npm test
   ```
4. Build the TypeScript distribution:
   ```bash
   npm run build
   ```

---

## Development Workflow

1. Create a feature branch:
   ```bash
   git checkout -b feat/my-new-feature
   ```
2. Implement your changes adhering to clean TypeScript practices and strict typing.
3. Test your changes locally:
   ```bash
   npm run typecheck
   npm run test:coverage
   ```
4. Perform a local pre-commit audit on your staged changes:
   ```bash
   node dist/cli.js review --staged --provider mock
   ```
5. Commit using conventional commits (`feat:`, `fix:`, `docs:`, `test:`, `refactor:`).
6. Open a pull request against the `main` branch.

---

## Questions and Support
Reach out to the Vecesta engineering team at `vecesta.co@gmail.com`.
