#!/usr/bin/env node
import { Command } from 'commander';
import * as fs from 'fs';
import { execSync } from 'child_process';
import { analyzeDiff } from './core/analyzer';
import { generateTerminalReport } from './core/reporter';
import { loadDefaultConfig, parseMinSeverity, parseSeverityList } from './config';
import { ReviewOptions } from './core/types';

const program = new Command();

program
  .name('ai-pr-reviewer')
  .description('Autonomous AI Pull Request Reviewer & Pre-commit Code Auditor by Vecesta.co')
  .version('1.0.0');

program
  .command('review')
  .description('Audit code changes from git diff, staged changes, or a diff patch file')
  .option('-f, --file <path>', 'Path to a diff or patch file')
  .option('-s, --staged', 'Review git staged changes (git diff --cached)')
  .option('-b, --branch <branch>', 'Review changes compared to target branch (e.g. main)')
  .option('-p, --provider <provider>', 'AI provider: ollama, gemini, openai, mock')
  .option('-m, --model <model>', 'Model identifier (e.g. qwen2.5-coder:latest, gemini-1.5-flash)')
  .option('--endpoint <url>', 'Custom API endpoint URL')
  .option('--api-key <key>', 'API key for provider')
  .option('--min-severity <level>', 'Minimum severity to display (SECURITY, CRITICAL, MAJOR, MINOR, NIT)')
  .option(
    '--fail-on-severity <levels>',
    'Comma-separated list of severities that exit with code 1 (e.g. CRITICAL,SECURITY)'
  )
  .option('--json', 'Output results as JSON')
  .option('-v, --verbose', 'Print verbose internal logs')
  .action(async (opts) => {
    try {
      let rawDiff = '';

      if (opts.file) {
        if (!fs.existsSync(opts.file)) {
          console.error(`Error: Diff file not found at "${opts.file}"`);
          process.exit(1);
        }
        rawDiff = fs.readFileSync(opts.file, 'utf-8');
      } else if (opts.staged) {
        rawDiff = execSync('git diff --cached', { encoding: 'utf-8' });
      } else if (opts.branch) {
        rawDiff = execSync(`git diff ${opts.branch}...HEAD`, { encoding: 'utf-8' });
      } else {
        // Default: review unstaged + staged working directory diff, or branch diff
        try {
          rawDiff = execSync('git diff HEAD', { encoding: 'utf-8' });
          if (!rawDiff || rawDiff.trim().length === 0) {
            rawDiff = execSync('git diff', { encoding: 'utf-8' });
          }
        } catch {
          rawDiff = '';
        }
      }

      if (!rawDiff || rawDiff.trim().length === 0) {
        console.log('No git diff changes detected. Nothing to review.');
        process.exit(0);
      }

      const defaults = loadDefaultConfig();
      const options: ReviewOptions = {
        provider: (opts.provider || defaults.provider || 'mock').toLowerCase(),
        model: opts.model || defaults.model,
        apiKey: opts.apiKey || defaults.apiKey,
        apiEndpoint: opts.endpoint || defaults.apiEndpoint,
        minSeverity: parseMinSeverity(opts.minSeverity) || defaults.minSeverity,
        failOnSeverity: parseSeverityList(opts.failOnSeverity) || defaults.failOnSeverity,
        verbose: Boolean(opts.verbose || defaults.verbose),
      };

      if (!opts.json) {
        console.log(
          `Analyzing diff with [${options.provider.toUpperCase()}] provider... (files: checking modified lines)`
        );
      }

      const result = await analyzeDiff(rawDiff, options);

      if (opts.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        console.log(generateTerminalReport(result));
      }

      if (!result.passedGate) {
        process.exit(1);
      } else {
        process.exit(0);
      }
    } catch (err: any) {
      console.error(`Execution error: ${err.message}`);
      if (opts.verbose && err.stack) {
        console.error(err.stack);
      }
      process.exit(1);
    }
  });

program.parse(process.argv);
