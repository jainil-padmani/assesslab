
import { createSignatureHeaders } from "../utils/aws-signature.ts";
import { processImagesWithVision } from "./vision-service.ts";

/**
 * Service for interacting with AWS Bedrock API
 */
export class BedrockService {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private service = 'bedrock-runtime';
  private model = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

  constructor(accessKeyId: string, secretAccessKey: string, region: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
    
    // Validate credentials at construction time
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials (accessKeyId and secretAccessKey) are required');
    }
    
    if (!this.region) {
      console.warn('AWS region not provided, defaulting to us-east-1');
      this.region = 'us-east-1';
    }
    
    console.log(`BedrockService initialized with region: ${this.region}, service: ${this.service}`);
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
    try {
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
      
      // Add timeout to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await fetch(`https://${this.service}.${this.region}.amazonaws.com${path}`, {
          method: 'POST',
          headers,
          body: payload,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`Bedrock API error (${response.status}): ${errorText}`);
          
          // Check for specific error conditions and provide more helpful messages
          if (response.status === 403) {
            // Auth-related errors
            if (errorText.includes("scoped to correct service")) {
              throw new Error(`Authentication error: Your AWS credentials don't have access to Bedrock services or the region ${this.region} may not support Bedrock. Please verify your IAM permissions and region selection.`);
            } else {
              throw new Error(`Authentication failed: ${errorText}. Please check your AWS credentials and IAM permissions.`);
            }
          } else if (response.status === 404) {
            throw new Error(`Model not found: The model "${this.model}" may not be available in region ${this.region} or your account doesn't have access to it.`);
          } else if (response.status === 429) {
            throw new Error(`Rate limit exceeded: You've hit Bedrock's rate limits. Please try again later or adjust your request frequency.`);
          } else {
            throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
          }
        }
        
        const responseData = await response.json();
        console.log("Response structure:", Object.keys(responseData));
        
        return responseData;
      } catch (fetchError) {
        clearTimeout(timeoutId);
        
        if (fetchError.name === 'AbortError') {
          throw new Error(`Request timed out after 60 seconds. The Bedrock service in region ${this.region} may be experiencing issues.`);
        }
        
        throw fetchError;
      }
    } catch (error) {
      console.error("Error in BedrockService.invokeModel:", error);
      throw error;
    }
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
