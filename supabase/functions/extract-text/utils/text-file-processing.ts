
/**
 * Utility functions for text file processing
 */

/**
 * Extracts content from a text file by fetching it
 */
export async function extractTextFromTextFile(fileUrl: string): Promise<string> {
  try {
    console.log(`Fetching text file: ${fileUrl}`);
    
    // Remove any cache parameters
    const cleanUrl = fileUrl.split('?')[0];
    
    // Set a timeout for the fetch
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000);
    
    const response = await fetch(cleanUrl, {
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      throw new Error(`Failed to fetch text file: ${response.statusText}`);
    }
    
    const text = await response.text();
    console.log(`Successfully fetched text file (${text.length} characters)`);
    
    return text;
  } catch (error) {
    console.error("Error reading text file:", error);
    throw error;
  }
}
