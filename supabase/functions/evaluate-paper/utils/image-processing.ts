
/**
 * Utilities for image processing and conversion
 */

/**
 * Convert a URL to base64 for use with OpenAI Vision API
 */
export async function urlToBase64(url: string): Promise<string> {
  try {
    console.log(`Converting URL to base64: ${url}`);
    
    // If it's already a data URL, return it
    if (url.startsWith('data:')) {
      console.log("URL is already a data URL, returning as is");
      return url;
    }
    
    // Fetch the image with a longer timeout (60 seconds)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);
    
    // Fetch the image
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get image type from Content-Type header
    const contentType = response.headers.get('Content-Type');
    let mimeType = 'image/jpeg'; // Default to JPEG if not specified (better for OCR than PNG)
    
    if (contentType) {
      // Make sure it's an image type
      if (!contentType.startsWith('image/')) {
        console.error(`Content-Type is not an image: ${contentType}`);
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
      } else {
        mimeType = contentType;
      }
    }
    
    // Get the image as an array buffer
    try {
      const arrayBuffer = await response.arrayBuffer();
      
      // Check if the array buffer is too large for memory
      if (arrayBuffer.byteLength > 5 * 1024 * 1024) {
        console.error("Memory error during base64 encoding, trying chunked approach");
        
        // Try to get it as a blob instead and use FileReader
        const blob = await response.blob();
        return await createDirectImageUrl(blob);
      }
      
      // Convert to base64
      const base64 = encodeBase64(arrayBuffer);
      return `data:${mimeType};base64,${base64}`;
    } catch (memoryError) {
      console.error("Memory error during array buffer processing:", memoryError);
      
      // Try alternative approach with blob
      const blob = await response.blob();
      return await createDirectImageUrl(blob);
    }
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    throw error;
  }
}

/**
 * Encode an ArrayBuffer as base64
 * This implementation is efficient for Deno
 */
export function encodeBase64(arrayBuffer: ArrayBuffer): string {
  return btoa(String.fromCharCode(...new Uint8Array(arrayBuffer)));
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
