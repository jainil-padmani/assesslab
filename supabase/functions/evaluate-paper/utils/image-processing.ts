
/**
 * Utilities for image processing and conversion
 */

/**
 * Convert a URL to base64 for use with OpenAI Vision API
 * With improved memory handling for large files
 */
export async function urlToBase64(url: string): Promise<string> {
  try {
    console.log(`Converting URL to base64: ${url}`);
    
    // If it's already a data URL, return it
    if (url.startsWith('data:')) {
      console.log("URL is already a data URL, returning as is");
      return url;
    }
    
    // For ZIP files, don't try to convert to base64 at all - pass URL directly
    if (url.toLowerCase().endsWith('.zip')) {
      console.log("ZIP file detected, returning cleaned URL directly");
      return cleanUrlForApi(url);
    }
    
    // For all other files, make a fresh fetch with a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 seconds timeout
    
    try {
      // Fetch the image
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache' // Additional cache control
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
      }
      
      // Get image type from Content-Type header
      const contentType = response.headers.get('Content-Type');
      let mimeType = 'image/jpeg'; // Default to JPEG
      
      if (contentType && contentType.startsWith('image/')) {
        mimeType = contentType;
      } else {
        // Extract extension from URL
        const extension = url.split('.').pop()?.toLowerCase();
        if (extension === 'jpg' || extension === 'jpeg') {
          mimeType = 'image/jpeg';
        } else if (extension === 'png') {
          mimeType = 'image/png';
        } else if (extension === 'webp') {
          mimeType = 'image/webp';
        } else if (extension === 'gif') {
          mimeType = 'image/gif';
        }
      }
      
      // Use more memory-efficient clone of the response for processing
      // This prevents the "Body already consumed" error
      const responseClone = response.clone();
      
      // Try a more memory-efficient approach using arrayBuffer instead of blob
      try {
        const arrayBuffer = await responseClone.arrayBuffer();
        
        // Check file size - if too large, return direct URL instead
        if (arrayBuffer.byteLength > 4 * 1024 * 1024) { // 4MB limit
          console.log("File too large for base64 encoding, returning direct URL");
          return cleanUrlForApi(url);
        }
        
        // Use a chunked approach for base64 encoding to avoid call stack issues
        const base64 = chunkEncodeBase64(arrayBuffer);
        return `data:${mimeType};base64,${base64}`;
      } catch (bufferError) {
        console.error("Error processing array buffer:", bufferError);
        
        // If array buffer approach fails, fall back to direct URL
        console.log("Falling back to direct URL");
        return cleanUrlForApi(url);
      }
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Error fetching URL:", fetchError);
      
      // If fetch fails, return the direct URL as fallback
      return cleanUrlForApi(url);
    }
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    // Return the URL directly as ultimate fallback
    return cleanUrlForApi(url);
  }
}

/**
 * Encode an ArrayBuffer as base64 in chunks to avoid call stack overflow
 */
export function chunkEncodeBase64(arrayBuffer: ArrayBuffer): string {
  const uint8Array = new Uint8Array(arrayBuffer);
  let binary = '';
  
  // Process in chunks of 1024 bytes to avoid call stack overflow
  const chunkSize = 1024;
  for (let i = 0; i < uint8Array.length; i += chunkSize) {
    const chunk = uint8Array.slice(i, Math.min(i + chunkSize, uint8Array.length));
    binary += String.fromCharCode.apply(null, Array.from(chunk));
  }
  
  return btoa(binary);
}

/**
 * Legacy encode function - kept for compatibility but not used for large files
 */
export function encodeBase64(arrayBuffer: ArrayBuffer): string {
  try {
    // Check size first - reject large files to prevent stack overflow
    if (arrayBuffer.byteLength > 1 * 1024 * 1024) { // 1MB limit
      throw new Error("ArrayBuffer too large for direct encoding");
    }
    
    return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
  } catch (error) {
    console.error("Error in encodeBase64:", error);
    throw new Error("Could not encode to base64: " + error.message);
  }
}

/**
 * Removes query parameters from a URL
 * Used to clean URLs before sending to OpenAI
 */
export function cleanUrlForApi(url: string): string {
  try {
    // If the URL contains a question mark, strip everything after it
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex !== -1) {
      console.log(`Removing query parameters from URL for OpenAI API: ${url}`);
      return url.substring(0, questionMarkIndex);
    }
    return url;
  } catch (error) {
    console.error("Error cleaning URL:", error);
    return url; // Return original URL as fallback
  }
}

/**
 * Create a direct image URL from a blob using FileReader
 * This is used as a fallback for large images
 */
export async function createDirectImageUrl(blob: Blob | string): Promise<string> {
  // If it's a string (URL), return it directly for OpenAI to process
  if (typeof blob === 'string') {
    // Remove any query parameters that might cause OpenAI to timeout
    return cleanUrlForApi(blob);
  }
  
  return new Promise<string>((resolve, reject) => {
    try {
      // Ensure MIME type is recognized as an image
      let mimeType = blob.type;
      if (!mimeType || !mimeType.startsWith('image/')) {
        // Try to infer type from extension if possible
        if (blob.type.includes('pdf')) {
          reject(new Error("Cannot process PDF directly with vision API, use ZIP extractor"));
          return;
        }
        
        mimeType = 'image/jpeg'; // Default to JPEG for unknown types
      }
      
      // Using a more memory-efficient chunk processing approach
      const fileReader = new FileReader();
      fileReader.onload = (e) => {
        if (!e.target?.result) {
          reject(new Error("FileReader failed to read blob"));
          return;
        }
        
        // Force the dataURL to include a valid MIME type
        const base64 = e.target.result.toString();
        if (base64.startsWith('data:')) {
          resolve(base64);
        } else {
          // For blob content, we need to add the MIME type
          resolve(`data:${mimeType};base64,${base64.replace('data:base64,', '')}`);
        }
      };
      
      fileReader.onerror = (error) => {
        reject(new Error(`FileReader error: ${error}`));
      };
      
      fileReader.readAsDataURL(blob);
    } catch (error) {
      reject(error);
    }
  });
}
