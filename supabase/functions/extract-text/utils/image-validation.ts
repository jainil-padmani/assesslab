
/**
 * Utility functions for validating and handling images
 */

/**
 * Checks if a file has a supported image format for OpenAI vision API
 */
export function isSupportedImageFormat(filename: string): boolean {
  const supportedFormats = ['.png', '.jpg', '.jpeg', '.webp', '.gif'];
  const lowerFilename = filename.toLowerCase();
  return supportedFormats.some(format => lowerFilename.endsWith(format));
}

/**
 * Validates that a URL is accessible and returns a valid image
 * Returns the final URL after any redirects
 */
export async function validateImageUrl(imageUrl: string): Promise<string> {
  try {
    console.log(`Validating image URL: ${imageUrl}`);
    
    // Remove any cache parameters or query strings
    const cleanUrl = imageUrl.split('?')[0];
    
    // Set a timeout for the validation request (5 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    
    // Send a HEAD request to check if the URL is accessible
    const response = await fetch(cleanUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      throw new Error(`Image URL returned status ${response.status}`);
    }
    
    // Return the URL in case it was redirected
    return cleanUrl;
  } catch (error) {
    console.error(`Image URL validation failed: ${error.message}`);
    throw new Error(`Failed to validate image URL: ${error.message}`);
  }
}

/**
 * Downloads an image with proper error handling and timeouts
 */
export async function downloadImageWithRetry(imageUrl: string, maxRetries = 2): Promise<Blob> {
  let retries = 0;
  let lastError: Error | null = null;
  
  while (retries <= maxRetries) {
    try {
      console.log(`Downloading image (attempt ${retries + 1}/${maxRetries + 1}): ${imageUrl}`);
      
      // Create a controller for the fetch timeout
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 20000); // 20 second timeout
      
      const response = await fetch(imageUrl, { 
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          'Pragma': 'no-cache',
          'Expires': '0'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        throw new Error(`Image download failed with status: ${response.status}`);
      }
      
      // Get the image blob
      const imageBlob = await response.blob();
      
      // Verify the content type is an image
      const contentType = imageBlob.type;
      if (!contentType.startsWith('image/')) {
        throw new Error(`Downloaded content is not an image: ${contentType}`);
      }
      
      // Verify the blob size
      if (imageBlob.size === 0) {
        throw new Error('Downloaded image has zero size');
      }
      
      console.log(`Successfully downloaded image (${imageBlob.size} bytes, type: ${contentType})`);
      return imageBlob;
    } catch (error) {
      lastError = error as Error;
      console.error(`Download attempt ${retries + 1} failed: ${error.message}`);
      retries++;
      
      // Only wait before retrying if we're going to retry
      if (retries <= maxRetries) {
        // Exponential backoff - wait longer with each retry
        const waitTime = Math.pow(2, retries) * 1000;
        console.log(`Waiting ${waitTime}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, waitTime));
      }
    }
  }
  
  throw new Error(`Failed to download image after ${maxRetries + 1} attempts: ${lastError?.message}`);
}

/**
 * Converts image to PNG format if needed (placeholder for future implementation)
 * Currently just validates the format
 */
export function ensureSupportedFormat(dataUrl: string, filename: string): string {
  if (!isSupportedImageFormat(filename)) {
    console.warn(`Unsupported image format detected: ${filename}. This may cause OCR issues.`);
  }
  return dataUrl;
}
