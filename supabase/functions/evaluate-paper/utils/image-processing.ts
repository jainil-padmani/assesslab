
/**
 * Utilities for image processing in a Deno-compatible environment
 */

/**
 * Creates a base64 data URL for an image blob
 * This works in Deno environment without requiring browser APIs
 */
export async function createDirectImageUrl(imageBlob: Blob): Promise<string> {
  // Read the blob as an array buffer
  const arrayBuffer = await imageBlob.arrayBuffer();
  
  // Convert to base64
  const base64 = encodeBase64(arrayBuffer);
  
  // Create data URL with the appropriate MIME type
  const mimeType = imageBlob.type || 'image/png';
  const dataUrl = `data:${mimeType};base64,${base64}`;
  
  return dataUrl;
}

/**
 * Encodes an ArrayBuffer to base64 string
 * This implementation works in Deno environment
 */
export function encodeBase64(buffer: ArrayBuffer): string {
  // Use Deno's built-in encoding utilities
  const uint8Array = new Uint8Array(buffer);
  return btoa(String.fromCharCode.apply(null, [...uint8Array]));
}

/**
 * Checks if a file has a supported image format for OpenAI vision API
 */
export function isSupportedImageFormat(filename: string): boolean {
  const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const lowerFilename = filename.toLowerCase();
  return supportedFormats.some(format => lowerFilename.endsWith(format));
}

/**
 * Validates the format of images in an array
 * Logs warnings for any unsupported formats
 */
export function validateImageFormats(files: {name: string, dataUrl: string}[]): boolean {
  let allValid = true;
  
  for (const file of files) {
    if (!isSupportedImageFormat(file.name)) {
      console.warn(`Found unsupported image format: ${file.name}`);
      allValid = false;
    }
  }
  
  return allValid;
}
