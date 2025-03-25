
import { createHmac } from "https://deno.land/std@0.177.0/node/crypto.ts";

/**
 * Service for interacting with AWS Bedrock API
 */
export class BedrockService {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private service = 'bedrock-runtime'; // Updated to bedrock-runtime
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
   * Updated to match the required Bedrock request format
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
    const headers = await this.createSignatureHeaders('POST', path, payload);
    
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
    
    // Handle the updated response format from Bedrock
    return responseData;
  }

  /**
   * Process images with Claude Vision
   * Updated for the new Bedrock request format
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
      
      const imageContents = [];
      const failedImages = [];
      
      // Add images to content array (up to 4 images max)
      for (let i = 0; i < Math.min(params.imageUrls.length, 4); i++) {
        try {
          console.log(`Fetching image ${i+1}/${Math.min(params.imageUrls.length, 4)}: ${params.imageUrls[i]}`);
          
          // Add timeout to fetch requests
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
          
          // For each image URL, fetch it and convert to base64
          const response = await fetch(params.imageUrls[i], {
            signal: controller.signal,
            headers: {
              'Cache-Control': 'no-cache',
              'Pragma': 'no-cache' // Additional cache control
            }
          });
          
          clearTimeout(timeoutId);
          
          if (!response.ok) {
            console.error(`Failed to fetch image ${i+1}: ${response.status} ${response.statusText}`);
            failedImages.push({
              index: i,
              url: params.imageUrls[i],
              error: `HTTP status ${response.status} ${response.statusText}`
            });
            continue;
          }
          
          // Get content type and validate it's an image
          const contentType = response.headers.get('content-type') || '';
          if (!contentType.startsWith('image/')) {
            console.warn(`URL ${i+1} (${params.imageUrls[i]}) is not an image (${contentType}), attempting to process anyway`);
          }
          
          const imageData = await response.arrayBuffer();
          
          // Check if we actually got data
          if (!imageData || imageData.byteLength === 0) {
            console.error(`Image ${i+1} (${params.imageUrls[i]}) returned empty data`);
            failedImages.push({
              index: i,
              url: params.imageUrls[i],
              error: "Empty response data"
            });
            continue;
          }
          
          // Convert to base64
          const base64 = btoa(String.fromCharCode(...new Uint8Array(imageData)));
          const mimeType = contentType || 'image/jpeg';
          
          console.log(`Successfully processed image ${i+1}: ${base64.substring(0, 50)}... (${imageData.byteLength} bytes)`);
          
          // Add image to content array in the correct format for Bedrock
          imageContents.push({
            type: "image",
            source: {
              type: "base64",
              media_type: mimeType,
              data: base64
            }
          });
        } catch (error) {
          console.error(`Error processing image ${i+1} (${params.imageUrls[i]}):`, error);
          failedImages.push({
            index: i,
            url: params.imageUrls[i],
            error: error.message || "Unknown error"
          });
          // Continue with other images if one fails
        }
      }
      
      // Check if we have any valid images
      if (imageContents.length === 0) {
        console.error("Failed to process all provided images:", failedImages);
        
        // Detailed error message with all failed images for debugging
        let errorDetails = "Failed to process any of the provided images:\n";
        failedImages.forEach(img => {
          errorDetails += `- Image ${img.index + 1} (${img.url}): ${img.error}\n`;
        });
        
        throw new Error(errorDetails);
      }
      
      // Adjust prompt to include information about failed images if any
      let adjustedPrompt = params.prompt;
      if (failedImages.length > 0) {
        adjustedPrompt += `\n\nNote: ${failedImages.length} out of ${params.imageUrls.length} images could not be processed. Analysis is based only on the available ${imageContents.length} images.`;
      }
      
      // Create the message with text and images
      const userMessage = {
        role: "user",
        content: [
          { type: "text", text: adjustedPrompt },
          ...imageContents
        ]
      };
      
      try {
        console.log(`Invoking Bedrock with ${imageContents.length} images`);
        const response = await this.invokeModel({
          messages: [userMessage],
          max_tokens: params.max_tokens || 4000,
          temperature: params.temperature || 0.2,
          system: params.system
        });
        
        // Access the response based on the new Bedrock format
        if (!response || !response.output || !response.output.content) {
          console.error("Invalid response format from Bedrock:", JSON.stringify(response));
          throw new Error("Invalid response format from Bedrock API");
        }
        
        // Extract text from the response
        const contents = response.output.content;
        if (!Array.isArray(contents) || contents.length === 0) {
          console.error("Invalid content format in response:", JSON.stringify(response.output));
          throw new Error("Invalid content format in Bedrock API response");
        }
        
        // Find the text content in the array
        let textContent = "";
        for (const item of contents) {
          if (item.type === "text") {
            textContent = item.text;
            break;
          }
        }
        
        if (!textContent) {
          console.error("No text content found in response:", JSON.stringify(contents));
          throw new Error("No text content in Bedrock API response");
        }
        
        console.log(`Successfully extracted text: ${textContent.substring(0, 100)}...`);
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
