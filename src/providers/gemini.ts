import { BaseLLMProvider } from './base';
import { LLMReviewResponse } from '../core/types';

export interface GeminiProviderOptions {
  apiKey?: string;
  model?: string;
  timeoutMs?: number;
}

export class GeminiProvider extends BaseLLMProvider {
  public readonly name = 'gemini';
  private apiKey: string;
  private model: string;
  private timeoutMs: number;

  constructor(options: GeminiProviderOptions = {}) {
    super();
    this.apiKey = options.apiKey || process.env.GEMINI_API_KEY || '';
    this.model = options.model || process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.timeoutMs = options.timeoutMs || 90000;

    if (!this.apiKey) {
      throw new Error(
        'GeminiProvider requires an API key. Pass it via options or set the GEMINI_API_KEY environment variable.'
      );
    }
  }

  public async generateReview(prompt: string): Promise<LLMReviewResponse> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${this.model}:generateContent?key=${this.apiKey}`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              role: 'user',
              parts: [{ text: prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Gemini API error [HTTP ${response.status}]: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;

      if (!text) {
        throw new Error('Gemini API returned empty candidate content.');
      }

      return this.parseAndValidateJSON(text);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Gemini request timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
