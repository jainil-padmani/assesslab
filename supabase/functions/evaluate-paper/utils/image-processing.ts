
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
    
    // For all other files, we'll just return the direct URL for better performance
    // No base64 conversion needed
    console.log("Returning direct URL without base64 conversion for better performance");
    return cleanUrlForApi(url);
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
