
import { Configuration, OpenAIApi } from "https://cdn.skypack.dev/openai@3.2.1";

/**
 * OpenAI service for API communication
 */
export class OpenAIService {
  private openai: OpenAIApi;

  constructor(apiKey: string) {
    const configuration = new Configuration({
      apiKey: apiKey,
    });
    this.openai = new OpenAIApi(configuration);
  }

  /**
   * Create a chat completion with the OpenAI API
   */
  async createChatCompletion(params: {
    model: string;
    messages: any[];
    max_tokens?: number;
    temperature?: number;
    response_format?: { type: string };
  }) {
    return await this.openai.createChatCompletion({
      model: params.model,
      messages: params.messages,
      max_tokens: params.max_tokens || 2000,
      temperature: params.temperature,
      response_format: params.response_format,
    });
  }
}

/**
 * Initialize the OpenAI service
 */
export function createOpenAIService(apiKey: string): OpenAIService {
  return new OpenAIService(apiKey);
}
