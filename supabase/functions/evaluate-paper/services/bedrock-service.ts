
import { createSignatureHeaders } from "../utils/aws-signature.ts";
import { processImagesWithVision } from "./vision-service.ts";

/**
 * Service for interacting with AWS Bedrock API
 */
export class BedrockService {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private service = 'bedrock';
  private model = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

  constructor(accessKeyId: string, secretAccessKey: string, region: string = 'ap-south-1') {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region || 'ap-south-1'; // Default to ap-south-1 if region is not provided
    
    // Validate credentials at construction time
    if (!this.accessKeyId || !this.secretAccessKey) {
      throw new Error('AWS credentials (accessKeyId and secretAccessKey) are required');
    }
    
    console.log(`BedrockService initialized with region: ${this.region}, service: ${this.service}`);
  }

  /**
   * Run a quick test to verify AWS credentials and service access
   */
  async testConnection(): Promise<{ success: boolean; message: string }> {
    try {
      console.log("Testing AWS Bedrock connection...");
      
      // Create a minimal request for testing
      const path = `/model/${this.model}/invoke`;
      const requestBody = {
        anthropic_version: "bedrock-2023-05-31",
        max_tokens: 10,
        messages: [{ 
          role: "user", 
          content: [{ 
            type: "text", 
            text: "Hello" 
          }]
        }]
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
      
      // Using the specific bedrock-runtime endpoint for the region
      const endpoint = `https://${this.service}.${this.region}.amazonaws.com`;
      
      // Use a smaller timeout for quick verification
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        const response = await fetch(`${endpoint}${path}`, {
          method: 'POST',
          headers,
          body: payload,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
          console.error(`AWS Bedrock API error (${response.status}): ${errorText}`);
          return { 
            success: false, 
            message: `AWS Bedrock service error (${response.status}): ${errorText}` 
          };
        }
        
        return { success: true, message: "AWS Bedrock connection successfully verified" };
      } catch (error) {
        clearTimeout(timeoutId);
        return { 
          success: false, 
          message: `Connection test failed: ${error instanceof Error ? error.message : "Unknown error"}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to test connection: ${error instanceof Error ? error.message : "Unknown error"}` 
      };
    }
  }

  /**
   * Invoke Claude 3.5 Sonnet model for text generation using InvokeModel API
   * Implementation follows AWS Bedrock documentation
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
      
      // Prepare the request body according to Bedrock requirements
      // Following Anthropic Claude 3.5 format
      const requestBody: any = {
        anthropic_version: params.anthropic_version || "bedrock-2023-05-31",
        max_tokens: params.max_tokens || 4000,
        temperature: params.temperature || 0.5,
        messages: params.messages
      };
      
      // Add system message if provided
      if (params.system) {
        requestBody.system = params.system;
      }
      
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
      
      // Using the specific bedrock endpoint for the region
      const endpoint = `https://${this.service}.${this.region}.amazonaws.com`;
      console.log(`Sending request to Bedrock API: ${endpoint}${path}`);
      
      // Add timeout to avoid hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60 second timeout
      
      try {
        const response = await fetch(`${endpoint}${path}`, {
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
            throw new Error(`Authentication error: Your AWS credentials don't have access to Bedrock services in region ${this.region}. Please verify your IAM permissions include bedrock:InvokeModel access.`);
          } else if (response.status === 404) {
            throw new Error(`Model not found: The model "${this.model}" may not be available in region ${this.region} or your account doesn't have access to it.`);
          } else if (response.status === 429) {
            throw new Error(`Rate limit exceeded: You've hit Bedrock's rate limits. Please try again later or adjust your request frequency.`);
          } else {
            throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
          }
        }
        
        const responseData = await response.json();
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
export function createBedrockService(accessKeyId: string, secretAccessKey: string, region: string = 'ap-south-1'): BedrockService {
  return new BedrockService(accessKeyId, secretAccessKey, region || 'ap-south-1');
}
