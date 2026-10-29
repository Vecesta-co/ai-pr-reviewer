import { BaseLLMProvider } from './base';
import { LLMReviewResponse } from '../core/types';

export interface OpenAIProviderOptions {
  apiKey?: string;
  model?: string;
  endpoint?: string;
  timeoutMs?: number;
}

export class OpenAIProvider extends BaseLLMProvider {
  public readonly name = 'openai';
  private apiKey: string;
  private model: string;
  private endpoint: string;
  private timeoutMs: number;

  constructor(options: OpenAIProviderOptions = {}) {
    super();
    this.apiKey = options.apiKey || process.env.OPENAI_API_KEY || '';
    this.model = options.model || process.env.OPENAI_MODEL || 'gpt-4o-mini';
    this.endpoint = (options.endpoint || process.env.OPENAI_BASE_URL || 'https://api.openai.com/v1').replace(
      /\/$/,
      ''
    );
    this.timeoutMs = options.timeoutMs || 90000;

    if (!this.apiKey) {
      throw new Error(
        'OpenAIProvider requires an API key. Pass it via options or set the OPENAI_API_KEY environment variable.'
      );
    }
  }

  public async generateReview(prompt: string): Promise<LLMReviewResponse> {
    const url = `${this.endpoint}/chat/completions`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content:
                'You are an elite code reviewer. You respond exclusively in valid JSON matching the requested schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          response_format: { type: 'json_object' },
          temperature: 0.1,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`OpenAI API error [HTTP ${response.status}]: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const content = data?.choices?.[0]?.message?.content;

      if (!content) {
        throw new Error('OpenAI returned empty message content.');
      }

      return this.parseAndValidateJSON(content);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`OpenAI request timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
