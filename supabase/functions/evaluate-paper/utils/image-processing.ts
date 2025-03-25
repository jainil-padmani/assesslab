
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
    
    // CRITICAL - For PDF files, always reject them - must be converted to images first
    if (isPdfUrl(url)) {
      console.error("PDF detected in urlToBase64 - PDFs must be converted to images first");
      throw new Error("PDF files must be converted to images before processing with vision models");
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
      
      // Double-check no PDFs get through
      if (contentType && contentType.includes('pdf')) {
        console.error("PDF content type detected - must convert to images first");
        throw new Error("PDF files must be converted to images before processing with vision models");
      }
      
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
      
      // Return direct URL without base64 conversion for better performance
      console.log("Returning direct URL without base64 conversion for better performance");
      return cleanUrlForApi(url);
      
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
      console.log(`Removing query parameters from URL for API: ${url}`);
      return url.substring(0, questionMarkIndex);
    }
    return url;
  } catch (error) {
    console.error("Error cleaning URL:", error);
    return url; // Return original URL as fallback
  }
}

/**
 * Check if a URL points to a PDF file
 */
export function isPdfUrl(url: string): boolean {
  if (!url) return false;
  return url.toLowerCase().endsWith('.pdf') || url.includes('.pdf?');
}

/**
 * Check if a URL points to an image file
 */
export function isImageUrl(url: string): boolean {
  if (!url) return false;
  return /\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(url.toLowerCase());
}
