import { BaseLLMProvider } from './base';
import { LLMReviewResponse } from '../core/types';

export interface OllamaProviderOptions {
  model?: string;
  endpoint?: string;
  timeoutMs?: number;
}

export class OllamaProvider extends BaseLLMProvider {
  public readonly name = 'ollama';
  private model: string;
  private endpoint: string;
  private timeoutMs: number;

  constructor(options: OllamaProviderOptions = {}) {
    super();
    this.model = options.model || process.env.OLLAMA_MODEL || 'qwen2.5-coder:latest';
    this.endpoint = (options.endpoint || process.env.OLLAMA_HOST || 'http://127.0.0.1:11434').replace(/\/$/, '');
    this.timeoutMs = options.timeoutMs || 120000;
  }

  public async generateReview(prompt: string): Promise<LLMReviewResponse> {
    const url = `${this.endpoint}/api/chat`;

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          messages: [
            {
              role: 'system',
              content: 'You are an elite code reviewer. You respond exclusively in valid JSON format matching the requested schema.',
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          format: 'json',
          stream: false,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Ollama API error [HTTP ${response.status}]: ${errorText}`);
      }

      const data = (await response.json()) as any;
      const content = data?.message?.content;

      if (!content) {
        throw new Error('Ollama returned empty response content.');
      }

      return this.parseAndValidateJSON(content);
    } catch (err: any) {
      if (err.name === 'AbortError') {
        throw new Error(`Ollama request timed out after ${this.timeoutMs}ms.`);
      }
      throw err;
    } finally {
      clearTimeout(timeout);
    }
  }
}
