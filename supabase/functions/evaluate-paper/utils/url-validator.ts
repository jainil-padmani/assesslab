
/**
 * Utilities for URL validation and preparation
 */

/**
 * Clean a URL for API processing by stripping query parameters
 * and ensuring it's properly encoded
 */
export function prepareUrlForProcessing(url: string): string {
  if (!url) {
    throw new Error('No URL provided');
  }
  
  // Remove cache-busting parameters or query strings if needed
  const urlWithoutQueryParams = url.split('?')[0];
  
  // Return the clean URL
  return urlWithoutQueryParams;
}

/**
 * Validate a URL by checking if it's accessible
 * @returns Promise resolving to true if URL is accessible
 */
export async function validateUrlAccessibility(url: string): Promise<boolean> {
  try {
    // Try to fetch the URL with HEAD method to check if it exists
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    return response.ok;
  } catch (error) {
    console.error(`URL validation failed for ${url}:`, error);
    return false;
  }
}

/**
 * Check the content type of a URL to ensure it's the expected type
 * @returns Promise resolving to the content type
 */
export async function getUrlContentType(url: string): Promise<string | null> {
  try {
    const response = await fetch(url, { 
      method: 'HEAD',
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.ok) {
      return null;
    }
    
    return response.headers.get('content-type');
  } catch (error) {
    console.error(`Content type check failed for ${url}:`, error);
    return null;
  }
}
