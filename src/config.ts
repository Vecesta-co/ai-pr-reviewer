import * as dotenv from 'dotenv';
import { ReviewOptions, SeverityLevel, SeverityLevelSchema } from './core/types';

dotenv.config();

export function parseSeverityList(raw?: string): SeverityLevel[] | undefined {
  if (!raw || raw.trim().length === 0) return undefined;
  const parts = raw.split(',').map((s) => s.trim().toUpperCase());
  const valid: SeverityLevel[] = [];

  for (const part of parts) {
    const parse = SeverityLevelSchema.safeParse(part);
    if (parse.success) {
      valid.push(parse.data);
    }
  }

  return valid.length > 0 ? valid : undefined;
}

export function parseMinSeverity(raw?: string): SeverityLevel | undefined {
  if (!raw) return undefined;
  const parse = SeverityLevelSchema.safeParse(raw.trim().toUpperCase());
  return parse.success ? parse.data : undefined;
}

export function loadDefaultConfig(): ReviewOptions {
  const provider = (process.env.AI_PROVIDER || 'mock').toLowerCase() as any;

  return {
    provider,
    model: process.env.AI_MODEL,
    apiKey: process.env.AI_API_KEY || process.env.GEMINI_API_KEY || process.env.OPENAI_API_KEY,
    apiEndpoint: process.env.AI_ENDPOINT || process.env.OLLAMA_HOST || process.env.OPENAI_BASE_URL,
    minSeverity: parseMinSeverity(process.env.MIN_SEVERITY),
    failOnSeverity: parseSeverityList(process.env.FAIL_ON_SEVERITY),
    verbose: process.env.DEBUG === 'true',
  };
}
