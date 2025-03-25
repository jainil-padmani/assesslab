
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

/**
 * Service for interacting with AWS Bedrock API
 */
export class BedrockService {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private service = 'bedrock';
  private model = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

  constructor(accessKeyId: string, secretAccessKey: string, region: string) {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region;
  }

  /**
   * Create AWS Signature v4 headers for authorization
   */
  private async createSignatureHeaders(method: string, path: string, payload: string): Promise<Headers> {
    const algorithm = 'AWS4-HMAC-SHA256';
    const service = this.service;
    const host = `${service}.${this.region}.amazonaws.com`;
    const endpoint = `https://${host}`;
    
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = datetime.slice(0, 8);
    
    // Create canonical request
    const contentType = 'application/json';
    const canonicalUri = path;
    const canonicalQueryString = '';
    const payloadHash = await this.hash(payload);
    
    const canonicalHeaders = 
      `content-type:${contentType}\n` +
      `host:${host}\n` + 
      `x-amz-date:${datetime}\n`;
    
    const signedHeaders = 'content-type;host;x-amz-date';
    
    const canonicalRequest = 
      `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    // Create string to sign
    const credentialScope = `${date}/${this.region}/${service}/aws4_request`;
    const requestHash = await this.hash(canonicalRequest);
    const stringToSign = `${algorithm}\n${datetime}\n${credentialScope}\n${requestHash}`;
    
    // Calculate signature
    const kDate = await this.hmac('AWS4' + this.secretAccessKey, date);
    const kRegion = await this.hmac(kDate, this.region);
    const kService = await this.hmac(kRegion, service);
    const kSigning = await this.hmac(kService, 'aws4_request');
    const signature = (await this.hmac(kSigning, stringToSign)).toLowerCase();
    
    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${this.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    // Create headers
    const headers = new Headers({
      'Content-Type': contentType,
      'X-Amz-Date': datetime,
      'Authorization': authorizationHeader
    });
    
    return headers;
  }
  
  /**
   * Compute SHA-256 hash
   */
  private async hash(message: string): Promise<string> {
    const msgUint8 = new TextEncoder().encode(message);
    const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  }
  
  /**
   * Compute HMAC SHA-256
   */
  private async hmac(key: string | ArrayBuffer, message: string): Promise<string> {
    const keyData = typeof key === 'string' 
      ? new TextEncoder().encode(key) 
      : key;
    
    const messageData = new TextEncoder().encode(message);
    
    // Create HMAC using Deno's standard crypto module
    let hmacKey: CryptoKey;
    
    if (typeof key === 'string') {
      // Import the key
      hmacKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
    } else {
      // Use the provided key buffer
      hmacKey = await crypto.subtle.importKey(
        'raw',
        keyData,
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign']
      );
    }
    
    // Sign the message
    const signature = await crypto.subtle.sign(
      'HMAC',
      hmacKey,
      messageData
    );
    
    // Convert to hex string
    return Array.from(new Uint8Array(signature))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  /**
   * Invoke Claude 3.5 Sonnet model for text generation
   */
  async invokeModel(params: {
    messages: any[];
    max_tokens?: number;
    temperature?: number;
    system?: string;
    anthropic_version?: string;
  }): Promise<any> {
    const path = `/model/${this.model}/invoke`;
    
    // Prepare the request body for Claude
    const requestBody = {
      anthropic_version: params.anthropic_version || "bedrock-2023-05-31",
      max_tokens: params.max_tokens || 4000,
      temperature: params.temperature || 0.5,
      messages: params.messages,
      system: params.system
    };
    
    const payload = JSON.stringify(requestBody);
    const headers = await this.createSignatureHeaders('POST', path, payload);
    
    const response = await fetch(`https://${this.service}.${this.region}.amazonaws.com${path}`, {
      method: 'POST',
      headers,
      body: payload
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
    }
    
    return await response.json();
  }

  /**
   * Process images with Claude Vision
   */
  async processImagesWithVision(params: {
    prompt: string;
    imageUrls: string[];
    max_tokens?: number;
    temperature?: number;
    system?: string;
  }): Promise<string> {
    try {
      // Validate input
      if (!params.imageUrls || !Array.isArray(params.imageUrls) || params.imageUrls.length === 0) {
        throw new Error("No image URLs provided");
      }
      
      console.log(`Processing ${params.imageUrls.length} images with Claude Vision`);
      
      const messages = [];
      const imageContents = [];
      
      // Add images to content array (up to 4 images max)
      for (let i = 0; i < Math.min(params.imageUrls.length, 4); i++) {
        try {
          // For each image URL, fetch it and convert to base64
          const response = await fetch(params.imageUrls[i]);
          if (!response.ok) {
            console.error(`Failed to fetch image ${i+1}: ${response.status} ${response.statusText}`);
            continue;
          }
          
          const imageData = await response.arrayBuffer();
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
          const mimeType = response.headers.get('content-type') || 'image/jpeg';
          
          // Add image to content array
          imageContents.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64
            }
          });
        } catch (error) {
          console.error(`Error processing image ${i+1}:`, error);
          // Continue with other images if one fails
        }
      }
      
      // Check if we have any valid images
      if (imageContents.length === 0) {
        throw new Error("Failed to process any of the provided images");
      }
      
      // Create the message with text and images
      const userMessage = {
        role: "user",
        content: [
          { type: "text", text: params.prompt },
          ...imageContents
        ]
      };
      
      messages.push(userMessage);
      
      try {
        const response = await this.invokeModel({
          messages: messages,
          max_tokens: params.max_tokens || 4000,
          temperature: params.temperature || 0.2,
          system: params.system
        });
        
        // Verify response structure before accessing properties
        if (!response || !response.content || !Array.isArray(response.content) || response.content.length === 0) {
          console.error("Invalid response format from Bedrock:", JSON.stringify(response));
          throw new Error("Invalid response format from Bedrock API");
        }
        
        // Safely access the text content
        const textContent = response.content[0]?.text;
        if (typeof textContent !== 'string') {
          console.error("Response does not contain expected text content:", JSON.stringify(response));
          throw new Error("No text content in Bedrock API response");
        }
        
        return textContent;
      } catch (error) {
        console.error("Error in Bedrock API call:", error);
        throw error;
      }
    } catch (error) {
      console.error("Error in processImagesWithVision:", error);
      throw error;
    }
  }
}

/**
 * Create a Bedrock service instance with AWS credentials
 */
export function createBedrockService(accessKeyId: string, secretAccessKey: string, region: string): BedrockService {
  return new BedrockService(accessKeyId, secretAccessKey, region);
}
