import { z } from 'zod';

export const SeverityLevelSchema = z.enum([
  'SECURITY',
  'CRITICAL',
  'MAJOR',
  'MINOR',
  'NIT',
]);

export type SeverityLevel = z.infer<typeof SeverityLevelSchema>;

export const ReviewFindingSchema = z.object({
  filePath: z.string().describe('Relative path to the reviewed file'),
  line: z.number().int().positive().describe('Exact line number in the new file'),
  severity: SeverityLevelSchema.describe('Severity level of the finding'),
  title: z.string().min(3).max(120).describe('Brief summary title of the issue'),
  message: z.string().min(5).describe('Detailed explanation of why this is an issue and how to fix it'),
  suggestion: z.string().optional().describe('Exact replacement code snippet for the line(s) without backticks'),
});

export type ReviewFinding = z.infer<typeof ReviewFindingSchema>;

export const LLMReviewResponseSchema = z.object({
  summary: z.string().describe('Executive summary of the changes and overall quality'),
  findings: z.array(ReviewFindingSchema).default([]),
});

export type LLMReviewResponse = z.infer<typeof LLMReviewResponseSchema>;

export interface ParsedDiffHunk {
  content: string;
  oldStart: number;
  oldLines: number;
  newStart: number;
  newLines: number;
  changedLines: number[];
}

export interface ParsedDiffFile {
  from?: string;
  to?: string;
  isNew: boolean;
  isDeleted: boolean;
  isBinary: boolean;
  hunks: ParsedDiffHunk[];
  validLines: Set<number>;
  rawDiff: string;
}

export interface ReviewOptions {
  provider: 'ollama' | 'gemini' | 'openai' | 'mock';
  model?: string;
  apiKey?: string;
  apiEndpoint?: string;
  minSeverity?: SeverityLevel;
  failOnSeverity?: SeverityLevel[];
  maxTokensPerHunk?: number;
  contextLines?: number;
  verbose?: boolean;
}

export interface ReviewResult {
  summary: string;
  findings: ReviewFinding[];
  filteredFindings: ReviewFinding[];
  totalFiles: number;
  filesReviewed: string[];
  filesIgnored: string[];
  severityCounts: Record<SeverityLevel, number>;
  passedGate: boolean;
  durationMs: number;
}
