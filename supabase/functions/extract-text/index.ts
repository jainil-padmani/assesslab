
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { hmac } from "https://deno.land/x/hmac@v2.0.1/mod.ts";

// CORS headers to allow requests from any origin
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Service for interacting with AWS Bedrock API using Claude 3.5 Sonnet
class BedrockService {
  private accessKeyId: string;
  private secretAccessKey: string;
  private region: string;
  private service = 'bedrock-runtime'; 
  private model = 'anthropic.claude-3-5-sonnet-20240620-v1:0';

  constructor(accessKeyId: string, secretAccessKey: string, region: string = 'us-east-1') {
    this.accessKeyId = accessKeyId;
    this.secretAccessKey = secretAccessKey;
    this.region = region || 'us-east-1'; // Default to us-east-1 if region is not provided
    
    console.log(`BedrockService initialized with region: ${this.region}, service: ${this.service}`);
    console.log(`Using AWS key ID starting with: ${this.accessKeyId.substring(0, 4)}...`);
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
    let keyData: ArrayBuffer;
    
    if (typeof key === 'string') {
      keyData = new TextEncoder().encode(key);
    } else {
      keyData = key;
    }
    
    const messageData = new TextEncoder().encode(message);
    
    // Calculate HMAC
    const hmacResult = await hmac("sha256", keyData, messageData);
    return Array.from(new Uint8Array(hmacResult))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
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
    const path = `/model/${this.model}/invoke`;
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
    
    // Create the message with text and images
    const userMessage = {
      role: "user",
      content: [
        { type: "text", text: params.prompt },
        ...imageContents
      ]
    };
    
    // Prepare the request body for Claude
    const requestBody = {
      anthropic_version: "bedrock-2023-05-31",
      max_tokens: params.max_tokens || 4000,
      temperature: params.temperature || 0.2,
      messages: [userMessage],
      system: params.system
    };
    
    const payload = JSON.stringify(requestBody);
    const headers = await this.createSignatureHeaders('POST', path, payload);
    
    // Using the specific bedrock-runtime endpoint for the region
    const endpoint = `https://${this.service}.${this.region}.amazonaws.com`;
    console.log(`Sending request to ${endpoint}${path}`);
    
    const response = await fetch(`${endpoint}${path}`, {
      method: 'POST',
      headers,
      body: payload
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Bedrock API error (${response.status}): ${errorText}`);
    }
    
    const result = await response.json();
    return result.content[0].text;
  }
}

// Custom fetch function with timeout
async function fetchWithTimeout(url: string, timeoutMs = 30000): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
  
  try {
    const response = await fetch(url, { 
      signal: controller.signal,
      cache: 'no-store' // Prevent caching issues
    });
    return response;
  } finally {
    clearTimeout(timeoutId);
  }
}

// Clean URL for API use
function cleanUrlForApi(url: string): string {
  const questionMarkIndex = url.indexOf('?');
  if (questionMarkIndex !== -1) {
    return url.substring(0, questionMarkIndex);
  }
  return url;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { documentUrl, useDirectImageProcessing = true } = await req.json();
    
    if (!documentUrl) {
      return new Response(
        JSON.stringify({ error: "Document URL is required" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Processing document for OCR: ${documentUrl}`);
    
    // Get AWS credentials from environment
    const awsAccessKeyId = Deno.env.get('AWS_ACCESS_KEY_ID') || '';
    const awsSecretAccessKey = Deno.env.get('AWS_SECRET_ACCESS_KEY') || '';
    const awsRegion = Deno.env.get('AWS_REGION') || 'us-east-1';
    
    console.log(`Using AWS credentials: Access Key starting with ${awsAccessKeyId.substring(0, 4)}..., Region: ${awsRegion}`);
    
    if (!awsAccessKeyId || !awsSecretAccessKey) {
      throw new Error('AWS credentials environment variables are not set');
    }
    
    // Clean the URL by removing query parameters
    const cleanedUrl = cleanUrlForApi(documentUrl);
    
    // Create Bedrock service
    const bedrockService = new BedrockService(awsAccessKeyId, awsSecretAccessKey, awsRegion);
    
    // Prompt for OCR extraction
    const systemPrompt = "You are an OCR tool optimized for extracting text from documents. Extract all visible text content accurately, preserving the formatting and structure of text.";
    const userPrompt = "Extract all the text from this document or image, maintaining the original structure, formatting, and organization of the content:";
    
    // Process the image with Claude 3.5 Vision
    const extractedText = await bedrockService.processImagesWithVision({
      prompt: userPrompt,
      imageUrls: [cleanedUrl],
      max_tokens: 4000,
      temperature: 0.2,
      system: systemPrompt
    });
    
    console.log(`Successfully extracted text: ${extractedText.length} characters`);
    
    return new Response(
      JSON.stringify({ text: extractedText }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('Error in extract-text function:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
