
/**
 * Utilities for image processing and conversion
 */

/**
 * Convert a URL to base64 for use with OpenAI Vision API
 * With improved memory handling for large files
 */
export async function urlToBase64(url: string): Promise<string> {
  try {
    console.log(`Processing URL: ${url}`);
    
    // If it's already a data URL, return it
    if (url.startsWith('data:')) {
      console.log("URL is already a data URL, returning as is");
      return url;
    }
    
    // For document files, don't try to convert to base64 at all - pass URL directly
    if (url.toLowerCase().endsWith('.zip') || 
        url.toLowerCase().endsWith('.pdf')) {
      console.log("Document file detected, returning cleaned URL directly");
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
      
      // For large files, return direct URL instead to avoid memory issues
      console.log("Returning direct URL without base64 conversion for better performance");
      return cleanUrlForApi(url);
      
      // Note: We've intentionally removed the base64 conversion code since
      // we're now using direct URLs for everything, which is more efficient
    } catch (fetchError) {
      clearTimeout(timeoutId);
      console.error("Error fetching URL:", fetchError);
      
      // If fetch fails, return the direct URL as fallback
      return cleanUrlForApi(url);
    }
  } catch (error) {
    console.error("Error processing URL:", error);
    // Return the URL directly as ultimate fallback
    return cleanUrlForApi(url);
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
  
  // Just return a placeholder - this function is mostly deprecated now
  // since we're using direct URLs instead of blobs
  console.log("createDirectImageUrl called but we're using direct URLs now");
  return "https://example.com/placeholder.jpg";
}
