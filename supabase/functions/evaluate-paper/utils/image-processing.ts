
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
 * Encodes an ArrayBuffer to base64 string
 * This implementation works in Deno environment
 */
export function encodeBase64(buffer: ArrayBuffer): string {
  if (!buffer) {
    throw new Error("No buffer provided for base64 encoding");
  }
  
  try {
    // Use Deno's built-in encoding utilities
    const uint8Array = new Uint8Array(buffer);
    return btoa(String.fromCharCode.apply(null, [...uint8Array]));
  } catch (error) {
    console.error("Error encoding base64:", error);
    throw error;
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
