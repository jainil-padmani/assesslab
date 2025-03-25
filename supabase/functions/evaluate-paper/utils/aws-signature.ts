
/**
 * Utility functions for AWS Signature v4 authentication
 */

/**
 * Compute SHA-256 hash
 */
export async function hash(message: string): Promise<string> {
  const msgUint8 = new TextEncoder().encode(message);
  const hashBuffer = await crypto.subtle.digest('SHA-256', msgUint8);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Compute HMAC SHA-256
 */
export async function hmac(key: string | ArrayBuffer, message: string): Promise<string> {
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
 * Create AWS Signature v4 headers for authorization
 */
export async function createSignatureHeaders(
  method: string, 
  path: string, 
  payload: string, 
  region: string, 
  service: string, 
  accessKeyId: string, 
  secretAccessKey: string
): Promise<Headers> {
  try {
    // Validate inputs
    if (!accessKeyId || !secretAccessKey) {
      throw new Error("AWS credentials (accessKeyId and secretAccessKey) are required");
    }
    
    if (!region) {
      throw new Error("AWS region is required");
    }
    
    if (!service) {
      throw new Error("AWS service name is required");
    }
    
    const algorithm = 'AWS4-HMAC-SHA256';
    const host = `${service}.${region}.amazonaws.com`;
    
    const datetime = new Date().toISOString().replace(/[:-]|\.\d{3}/g, '');
    const date = datetime.slice(0, 8);
    
    // Create canonical request
    const contentType = 'application/json';
    const canonicalUri = path;
    const canonicalQueryString = '';
    const payloadHash = await hash(payload);
    
    const canonicalHeaders = 
      `content-type:${contentType}\n` +
      `host:${host}\n` + 
      `x-amz-date:${datetime}\n`;
    
    const signedHeaders = 'content-type;host;x-amz-date';
    
    const canonicalRequest = 
      `${method}\n${canonicalUri}\n${canonicalQueryString}\n${canonicalHeaders}\n${signedHeaders}\n${payloadHash}`;
    
    // Create string to sign
    const credentialScope = `${date}/${region}/${service}/aws4_request`;
    const requestHash = await hash(canonicalRequest);
    const stringToSign = `${algorithm}\n${datetime}\n${credentialScope}\n${requestHash}`;
    
    // Calculate signature
    const kDate = await hmac('AWS4' + secretAccessKey, date);
    const kRegion = await hmac(kDate, region);
    const kService = await hmac(kRegion, service);
    const kSigning = await hmac(kService, 'aws4_request');
    const signature = (await hmac(kSigning, stringToSign)).toLowerCase();
    
    // Create authorization header
    const authorizationHeader = `${algorithm} Credential=${accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;
    
    // Create headers
    const headers = new Headers({
      'Content-Type': contentType,
      'X-Amz-Date': datetime,
      'Authorization': authorizationHeader
    });
    
    return headers;
  } catch (error) {
    console.error("Error creating AWS signature headers:", error);
    throw error;
  }
}
