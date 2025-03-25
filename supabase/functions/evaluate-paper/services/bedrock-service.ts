
import { createSignatureHeaders } from "../utils/aws-signature.ts";
import { processImagesWithVision } from "./vision-service.ts";

/**
 * Service for interacting with AWS Bedrock API
 */
export class BedrockService {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private service = 'bedrock-runtime'; // Service name for Bedrock
  private model = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

  constructor(accessKeyId: string, secretAccessKey: string, region: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  /**
   * Invoke Claude 3.5 Sonnet model for text generation
   * Format follows Bedrock request requirements
   */
  async invokeModel(params: {
    messages: any[];
    max_tokens?: number;
    temperature?: number;
    system?: string;
    anthropic_version?: string;
  }): Promise<any> {
    const path = `/model/${this.model}/invoke`;
    
    // Create messages array with system message if provided
    const messages = [...params.messages];
    
    // Add system message if provided
    if (params.system) {
      messages.unshift({
        role: "system",
        content: params.system
      });
    }
    
    // Prepare the request body according to Bedrock requirements
    const requestBody = {
      modelId: this.model,
      input: {
        messages: messages
      },
      max_tokens: params.max_tokens || 4000,
      temperature: params.temperature || 0.5
    };
    
    const payload = JSON.stringify(requestBody);
    const headers = await createSignatureHeaders(
      'POST', 
      path, 
      payload, 
      this.region, 
      this.service, 
      this.accessKeyId, 
      this.secretAccessKey
    );
    
    console.log(`Sending request to Bedrock API: ${this.service}.${this.region}.amazonaws.com${path}`);
    console.log(`Request payload structure: ${JSON.stringify(Object.keys(requestBody))}`);
    
    const response = await fetch(`https://${this.service}.${this.region}.amazonaws.com${path}`, {
      method: 'POST',
      headers,
      body: payload
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Bedrock API error (${response.status}): ${errorText}`);
      throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
    }
    
    const responseData = await response.json();
    console.log("Response structure:", Object.keys(responseData));
    
    // Return the response from Bedrock
    return responseData;
  }

  /**
   * Process images with Claude Vision
   * Delegates to the dedicated vision service
   */
  async processImagesWithVision(params: {
    prompt: string;
    imageUrls: string[];
    max_tokens?: number;
    temperature?: number;
    system?: string;
  }): Promise<string> {
    return processImagesWithVision(this, params);
  }
}

/**
 * Create a Bedrock service instance with AWS credentials
 */
export function createBedrockService(accessKeyId: string, secretAccessKey: string, region: string): BedrockService {
  return new BedrockService(accessKeyId, secretAccessKey, region);
}
