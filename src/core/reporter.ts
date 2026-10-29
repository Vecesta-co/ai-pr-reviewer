import chalk from 'chalk';
import { ReviewFinding, ReviewResult, SeverityLevel } from './types';

const SEVERITY_BADGES: Record<SeverityLevel, string> = {
  SECURITY: '🔴 **SECURITY**',
  CRITICAL: '🛑 **CRITICAL**',
  MAJOR: '⚠️ **MAJOR**',
  MINOR: '🟡 **MINOR**',
  NIT: '💬 **NIT**',
};

export function generateMarkdownReport(result: ReviewResult): string {
  const statusEmoji = result.passedGate ? '✅' : '❌';
  const statusText = result.passedGate
    ? 'PASSED - Code changes approved with advisories'
    : 'BLOCKED - Critical quality gate thresholds breached';

  let md = `## ${statusEmoji} AI Pull Request Review by [Vecesta.co](https://github.com/Vecesta-co)\n\n`;
  md += `> **Review Verdict**: ${statusText}  \n`;
  md += `> **Analysis Duration**: ${(result.durationMs / 1000).toFixed(2)}s | **Files Analyzed**: ${result.filesReviewed.length} | **Total Findings**: ${result.filteredFindings.length}\n\n`;

  md += `### Executive Summary\n${result.summary}\n\n`;

  md += `### Severity Matrix\n\n`;
  md += `| Severity Tier | Count | Policy Action |\n`;
  md += `|:---|:---:|:---|\n`;
  md += `| 🔴 Security | ${result.severityCounts.SECURITY || 0} | ${result.severityCounts.SECURITY ? 'Requires immediate remediation' : 'No vulnerabilities detected'} |\n`;
  md += `| 🛑 Critical | ${result.severityCounts.CRITICAL || 0} | ${result.severityCounts.CRITICAL ? 'Blocking merge' : 'Clean'} |\n`;
  md += `| ⚠️ Major | ${result.severityCounts.MAJOR || 0} | Recommended fix before release |\n`;
  md += `| 🟡 Minor | ${result.severityCounts.MINOR || 0} | Optional cleanup |\n`;
  md += `| 💬 Nit | ${result.severityCounts.NIT || 0} | Informational style note |\n\n`;

  if (result.filteredFindings.length === 0) {
    md += `🎉 **Zero defects identified.** All examined hunks adhere to security and design standards.\n\n`;
  } else {
    md += `### Detailed Findings by File\n\n`;

    // Group findings by file
    const byFile = new Map<string, ReviewFinding[]>();
    for (const f of result.filteredFindings) {
      if (!byFile.has(f.filePath)) {
        byFile.set(f.filePath, []);
      }
      byFile.get(f.filePath)!.push(f);
    }

    for (const [filePath, findings] of byFile.entries()) {
      md += `#### \`${filePath}\` (${findings.length} findings)\n\n`;
      for (const item of findings) {
        md += `- ${SEVERITY_BADGES[item.severity]} **Line ${item.line}**: ${item.title}\n`;
        md += `  ${item.message}\n`;
        if (item.suggestion) {
          md += `\n  \`\`\`suggestion\n  ${item.suggestion.trim()}\n  \`\`\`\n`;
        }
        md += `\n`;
      }
    }
  }

  if (result.filesIgnored.length > 0) {
    md += `<details><summary>📁 <b>Ignored Non-Code / Noise Files (${result.filesIgnored.length})</b></summary>\n\n`;
    for (const ignored of result.filesIgnored) {
      md += `- \`${ignored}\` (Lockfile/Asset/Generated)\n`;
    }
    md += `</details>\n\n`;
  }

  md += `---\n`;
  md += `*Autonomous Review powered by [ai-pr-reviewer](https://github.com/Vecesta-co/ai-pr-reviewer) by **Vecesta.co**.*`;

  return md;
}

export function generateTerminalReport(result: ReviewResult): string {
  const lines: string[] = [];
  const divider = chalk.gray('───────────────────────────────────────────────────────────────────');

  lines.push('');
  lines.push(divider);
  lines.push(chalk.bold.cyan('  V E C E S T A . C O   |   A I   C O D E   R E V I E W E R'));
  lines.push(divider);
  lines.push('');

  const statusStr = result.passedGate
    ? chalk.bold.green('✔ QUALITY GATE PASSED')
    : chalk.bold.red('✖ QUALITY GATE FAILED');

  lines.push(`  Verdict:     ${statusStr}`);
  lines.push(`  Duration:    ${(result.durationMs / 1000).toFixed(2)}s`);
  lines.push(`  Files:       ${result.filesReviewed.length} reviewed (${result.filesIgnored.length} ignored)`);
  lines.push(`  Findings:    ${result.filteredFindings.length} issue(s) detected`);
  lines.push('');
  lines.push(chalk.bold('  Summary:'));
  lines.push(`  ${chalk.italic(result.summary)}`);
  lines.push('');

  lines.push(chalk.bold('  Severity Breakdown:'));
  lines.push(`    Security:  ${result.severityCounts.SECURITY > 0 ? chalk.red(result.severityCounts.SECURITY) : chalk.gray(0)}`);
  lines.push(`    Critical:  ${result.severityCounts.CRITICAL > 0 ? chalk.redBright(result.severityCounts.CRITICAL) : chalk.gray(0)}`);
  lines.push(`    Major:     ${result.severityCounts.MAJOR > 0 ? chalk.yellow(result.severityCounts.MAJOR) : chalk.gray(0)}`);
  lines.push(`    Minor:     ${result.severityCounts.MINOR > 0 ? chalk.blue(result.severityCounts.MINOR) : chalk.gray(0)}`);
  lines.push(`    Nit:       ${chalk.gray(result.severityCounts.NIT || 0)}`);
  lines.push('');

  if (result.filteredFindings.length > 0) {
    lines.push(chalk.bold.underline('  Detailed Issues:'));
    lines.push('');

    for (const f of result.filteredFindings) {
      let badge = chalk.white(f.severity);
      if (f.severity === 'SECURITY') badge = chalk.bgRed.black(` ${f.severity} `);
      else if (f.severity === 'CRITICAL') badge = chalk.red.bold(`[${f.severity}]`);
      else if (f.severity === 'MAJOR') badge = chalk.yellow.bold(`[${f.severity}]`);
      else if (f.severity === 'MINOR') badge = chalk.blue(`[${f.severity}]`);
      else badge = chalk.gray(`[${f.severity}]`);

      lines.push(`  ${badge} ${chalk.bold(f.filePath)}:${chalk.yellow(f.line)} - ${f.title}`);
      lines.push(`     ${chalk.dim(f.message)}`);
      if (f.suggestion) {
        lines.push(chalk.green(`     Suggested fix:`));
        lines.push(chalk.green(`       ${f.suggestion}`));
      }
      lines.push('');
    }
  }

  lines.push(divider);
  return lines.join('\n');
}
