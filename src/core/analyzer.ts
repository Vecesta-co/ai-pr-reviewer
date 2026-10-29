import { parseUnifiedDiff, shouldIgnoreFile } from './diff-parser';
import { LineMapper } from './line-mapper';
import { evaluateQualityGate, filterFindingsByMinSeverity } from './quality-gate';
import {
  ReviewFinding,
  ReviewOptions,
  ReviewResult,
  SeverityLevel,
} from './types';
import { BaseLLMProvider } from '../providers/base';
import { OllamaProvider } from '../providers/ollama';
import { GeminiProvider } from '../providers/gemini';
import { OpenAIProvider } from '../providers/openai';
import { MockProvider } from '../providers/mock';

export function createProvider(options: ReviewOptions): BaseLLMProvider {
  switch (options.provider) {
    case 'ollama':
      return new OllamaProvider({
        model: options.model,
        endpoint: options.apiEndpoint,
      });
    case 'gemini':
      return new GeminiProvider({
        apiKey: options.apiKey,
        model: options.model,
      });
    case 'openai':
      return new OpenAIProvider({
        apiKey: options.apiKey,
        model: options.model,
        endpoint: options.apiEndpoint,
      });
    case 'mock':
      return new MockProvider();
    default:
      throw new Error(`Unsupported provider: "${options.provider}". Supported: ollama, gemini, openai, mock.`);
  }
}

export async function analyzeDiff(
  rawDiff: string,
  options: ReviewOptions,
  customProvider?: BaseLLMProvider
): Promise<ReviewResult> {
  const startTime = Date.now();
  const parsedFiles = parseUnifiedDiff(rawDiff);

  const filesReviewed: string[] = [];
  const filesIgnored: string[] = [];
  const reviewableDiffs: { filePath: string; diffContent: string }[] = [];

  for (const file of parsedFiles) {
    const path = file.to || file.from || 'unknown';
    if (shouldIgnoreFile(path) || file.isBinary || file.isDeleted) {
      filesIgnored.push(path);
      continue;
    }

    if (file.hunks.length > 0) {
      filesReviewed.push(path);
      reviewableDiffs.push({
        filePath: path,
        diffContent: file.rawDiff,
      });
    }
  }

  // Handle empty or pure-noise diff
  if (reviewableDiffs.length === 0) {
    return {
      summary: 'No reviewable code changes found (all files were ignored or empty).',
      findings: [],
      filteredFindings: [],
      totalFiles: parsedFiles.length,
      filesReviewed,
      filesIgnored,
      severityCounts: { SECURITY: 0, CRITICAL: 0, MAJOR: 0, MINOR: 0, NIT: 0 },
      passedGate: true,
      durationMs: Date.now() - startTime,
    };
  }

  const provider = customProvider || createProvider(options);
  const prompt = provider.buildPrompt(reviewableDiffs);

  // Invoke provider
  const llmResponse = await provider.generateReview(prompt);

  // Map and validate line boundaries using LineMapper
  const lineMapper = new LineMapper(parsedFiles);
  const validatedFindings: ReviewFinding[] = [];

  for (const finding of llmResponse.findings) {
    const check = lineMapper.validateLine(finding.filePath, finding.line);
    if (check.isValid) {
      validatedFindings.push({
        ...finding,
        line: check.targetLine, // use snapped line if applicable
      });
    } else if (options.verbose) {
      console.warn(`[ai-pr-reviewer] Dropped out-of-diff finding: ${check.reason}`);
    }
  }

  // Filter by minSeverity
  const filteredFindings = filterFindingsByMinSeverity(
    validatedFindings,
    options.minSeverity
  );

  // Calculate severity counts
  const severityCounts: Record<SeverityLevel, number> = {
    SECURITY: 0,
    CRITICAL: 0,
    MAJOR: 0,
    MINOR: 0,
    NIT: 0,
  };

  for (const f of filteredFindings) {
    if (severityCounts[f.severity] !== undefined) {
      severityCounts[f.severity]++;
    }
  }

  // Evaluate quality gate
  const gateEval = evaluateQualityGate(filteredFindings, options.failOnSeverity);

  return {
    summary: llmResponse.summary,
    findings: validatedFindings,
    filteredFindings,
    totalFiles: parsedFiles.length,
    filesReviewed,
    filesIgnored,
    severityCounts,
    passedGate: gateEval.passed,
    durationMs: Date.now() - startTime,
  };
}
