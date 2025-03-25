
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

  constructor(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1') {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region || 'us-east-1'; // Default to us-east-1 if region is not provided
    
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
      
      // Set up a simple system prompt for testing
      const testPrompt = { 
        messages: [{ role: "user", content: "Hello" }],
        max_tokens: 10,
        system: "Reply with 'Connection successful'"
      };
      
      // Use a smaller timeout for quick verification
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);
      
      try {
        // Create and send a test request
        const path = `/model/${this.model}/invoke`;
        const requestBody = {
          anthropic_version: "bedrock-2023-05-31",
          max_tokens: 10,
          temperature: 0.5,
          messages: [{ role: "user", content: "Hello" }],
          system: "Reply with 'Connection successful'"
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
        
        const endpoint = `https://${this.service}.${this.region}.amazonaws.com`;
        
        const response = await fetch(`${endpoint}${path}`, {
          method: 'POST',
          headers,
          body: payload,
          signal: controller.signal
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          const errorText = await response.text();
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
          message: `Connection test failed: ${error.message || "Unknown error"}` 
        };
      }
    } catch (error) {
      return { 
        success: false, 
        message: `Failed to test connection: ${error.message || "Unknown error"}` 
      };
    }
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
      
      // Prepare the request body according to Bedrock requirements
      const requestBody = {
        anthropic_version: params.anthropic_version || "bedrock-2023-05-31",
        max_tokens: params.max_tokens || 4000,
        temperature: params.temperature || 0.5,
        messages: messages
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
      
      // Using the specific bedrock-runtime endpoint for the region
      const endpoint = `https://${this.service}.${this.region}.amazonaws.com`;
      console.log(`Sending request to Bedrock API: ${endpoint}${path}`);
      console.log(`Request body structure: ${JSON.stringify(Object.keys(requestBody))}`);
      console.log(`Using region: ${this.region}, service: ${this.service}`);
      console.log(`AWS Access Key ID (first 4 chars): ${this.accessKeyId.substring(0, 4)}...`);
      
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
            // Auth-related errors
            if (errorText.includes("scoped to correct service")) {
              throw new Error(`Authentication error: Your AWS credentials don't have access to Bedrock services in region ${this.region}. Please verify your IAM permissions include bedrock-runtime access.`);
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
export function createBedrockService(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1'): BedrockService {
  return new BedrockService(accessKeyId, secretAccessKey, region || 'us-east-1');
}
