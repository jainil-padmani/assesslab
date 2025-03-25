
/**
 * Utilities for image processing in a Deno-compatible environment
 */

/**
 * Creates a base64 data URL for an image blob
 * This works in Deno environment without requiring browser APIs
 */
export async function createDirectImageUrl(imageBlob: Blob): Promise<string> {
  try {
    if (!imageBlob) {
      throw new Error("No image blob provided");
    }
    
    // Read the blob as an array buffer
    const arrayBuffer = await imageBlob.arrayBuffer();
    if (!arrayBuffer) {
      throw new Error("Failed to read image blob as array buffer");
    }
    
    // Convert to base64
    const base64 = encodeBase64(arrayBuffer);
    
    // Create data URL with the appropriate MIME type
    const mimeType = imageBlob.type || 'image/png';
    const dataUrl = `data:${mimeType};base64,${base64}`;
    
    return dataUrl;
  } catch (error) {
    console.error("Error creating direct image URL:", error);
    throw error;
  }
}

/**
 * Encodes an ArrayBuffer to base64 string using a chunk-based approach
 * for better memory management in Deno environment
 */
export function encodeBase64(buffer: ArrayBuffer): string {
  if (!buffer) {
    throw new Error("No buffer provided for base64 encoding");
  }
  
  try {
    // Convert the ArrayBuffer to Uint8Array
    const uint8Array = new Uint8Array(buffer);
    
    // Use Deno's built-in encoding API
    return btoa(String.fromCharCode.apply(null, Array.from(uint8Array)));
  } catch (memoryError) {
    console.warn("Memory error during base64 encoding, trying chunked approach");
    
    // If memory error occurs, try a chunked approach
    try {
      // Convert the ArrayBuffer to Uint8Array
      const uint8Array = new Uint8Array(buffer);
      
      // Process in chunks to avoid call stack size limitations
      const CHUNK_SIZE = 4096;
      let result = '';
      
      for (let i = 0; i < uint8Array.length; i += CHUNK_SIZE) {
        const chunk = uint8Array.slice(i, i + CHUNK_SIZE);
        // Convert chunk to string and then to base64
        const binaryString = Array.from(chunk)
          .map(byte => String.fromCharCode(byte))
          .join('');
        
        try {
          result += btoa(binaryString);
        } catch (e) {
          console.error(`Error encoding chunk at index ${i}:`, e);
          // Continue with next chunk if possible
        }
      }
      
      return result;
    } catch (error) {
      console.error("Error encoding base64 with chunked approach:", error);
      throw new Error("Failed to encode data as base64: " + error.message);
    }
  }
}

/**
 * Safely converts a URL to base64 for use with OpenAI API
 * Handles errors gracefully
 */
export async function urlToBase64(url: string): Promise<string> {
  try {
    // Add cache buster to URL to prevent caching issues
    const cacheBustedUrl = url.includes('?') 
      ? `${url}&cache=${Date.now()}` 
      : `${url}?cache=${Date.now()}`;
    
    console.log(`Fetching image from URL: ${cacheBustedUrl}`);
    
    // Set up fetch with timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
    
    // Fetch the image with proper error handling
    const response = await fetch(cacheBustedUrl, { 
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate'
      }
    });
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch image: ${response.status} ${response.statusText}`);
    }
    
    // Get image as blob
    const blob = await response.blob();
    if (!blob) {
      throw new Error("Failed to get blob from response");
    }
    
    // Ensure the blob has the correct content type
    const imageBlob = new Blob([await blob.arrayBuffer()], { type: 'image/png' });
    
    // Convert to data URL
    const dataUrl = await createDirectImageUrl(imageBlob);
    return dataUrl;
  } catch (error) {
    console.error("Error converting URL to base64:", error);
    
    // Return a more useful error message
    throw new Error(`Failed to process image at URL: ${url}. Error: ${error.message}`);
  }
}

/**
 * Checks if a file has a supported image format for OpenAI vision API
 */
export function isSupportedImageFormat(filename: string): boolean {
  if (!filename) return false;
  
  const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const lowerFilename = filename.toLowerCase();
  return supportedFormats.some(format => lowerFilename.endsWith(format));
}

/**
 * Validates the format of images in an array
 * Logs warnings for any unsupported formats
 */
export function validateImageFormats(files: {name: string, dataUrl: string}[]): boolean {
  if (!files || !Array.isArray(files) || files.length === 0) {
    console.warn("No files provided for validation");
    return false;
  }
  
  let allValid = true;
  
  for (const file of files) {
    if (!file || !file.name) {
      console.warn("Invalid file object found during validation");
      allValid = false;
      continue;
    }
    
    if (!isSupportedImageFormat(file.name)) {
      console.warn(`Found unsupported image format: ${file.name}`);
      allValid = false;
    }
  }
  
  return allValid;
}
