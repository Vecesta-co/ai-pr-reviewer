import { LLMReviewResponse, LLMReviewResponseSchema } from '../core/types';

export abstract class BaseLLMProvider {
  public abstract readonly name: string;
  public abstract generateReview(prompt: string): Promise<LLMReviewResponse>;

  /**
   * Safely extracts and validates a JSON response payload from LLM output.
   * Handles markdown code blocks, escaped characters, and leading/trailing whitespace.
   */
  protected parseAndValidateJSON(rawOutput: string): LLMReviewResponse {
    let cleaned = rawOutput.trim();

    // Remove markdown code fences if present
    const jsonBlockRegex = /```(?:json)?\s*([\s\S]*?)\s*```/i;
    const match = cleaned.match(jsonBlockRegex);
    if (match && match[1]) {
      cleaned = match[1].trim();
    }

    try {
      const parsed = JSON.parse(cleaned);
      return LLMReviewResponseSchema.parse(parsed);
    } catch (err: any) {
      throw new Error(
        `Failed to parse LLM JSON response: ${err.message}. Raw output preview: ${rawOutput.slice(0, 300)}`
      );
    }
  }

  /**
   * Builds the structured system instruction prompt
   */
  public buildPrompt(fileDiffs: { filePath: string; diffContent: string }[]): string {
    return `You are an elite Staff Software Engineer and Senior Application Security Auditor reviewing a Git pull request for Vecesta.co.

Your goal is to perform a rigorous, noise-free code review on the provided diffs. Focus on:
1. SECURITY: Injection vectors, auth bypass, token leakage, unvalidated inputs, prototype pollution, unsafe deserialization.
2. BUGS: Null/undefined dereferences, off-by-one errors, race conditions, resource leaks, unhandled async errors.
3. PERFORMANCE: N+1 query patterns, unintentional O(n^2) loops, excessive allocations.
4. MAINTAINABILITY: Missing error handling, silent failures, dead code, architectural violations.

STRICT CONSTRAINTS:
- Do NOT comment on formatting, whitespace, or stylistic nitpicks unless they violate safety.
- You MUST only report line numbers that are within the added or modified lines in the provided diffs.
- Provide an exact 1-to-1 code suggestion in the "suggestion" field whenever possible.
- Output MUST be valid JSON strictly conforming to this JSON schema:
{
  "summary": "High-level summary of what this PR introduces and its engineering health",
  "findings": [
    {
      "filePath": "relative/path/to/file.ts",
      "line": 42,
      "severity": "SECURITY" | "CRITICAL" | "MAJOR" | "MINOR" | "NIT",
      "title": "Concise headline of issue",
      "message": "Technical explanation of the defect and the recommended remedy",
      "suggestion": "Exact replacement code (optional)"
    }
  ]
}

FILES TO REVIEW:
${fileDiffs
  .map(
    (f) => `--- File: ${f.filePath} ---\n${f.diffContent}\n`
  )
  .join('\n')}
`;
  }
}
