
/**
 * Utilities for image batch processing and cleaning
 */

/**
 * Creates batches of images for efficient API processing
 * Claude 3.5 Vision supports up to 4 images per request
 */
export function createImageBatches(imageUrls: string[], maxImagesPerBatch = 4): string[][] {
  if (!imageUrls || !Array.isArray(imageUrls) || imageUrls.length === 0) {
    return [];
  }
  
  const batches: string[][] = [];
  
  // Create batches with at most maxImagesPerBatch images per batch
  for (let i = 0; i < imageUrls.length; i += maxImagesPerBatch) {
    const batch = imageUrls.slice(i, i + maxImagesPerBatch);
    batches.push(batch);
  }
  
  console.log(`Created ${batches.length} image batch(es) with maximum ${maxImagesPerBatch} images per batch`);
  return batches;
}

/**
 * Clean image URLs for processing, removing duplicates and empty entries
 */
export function cleanImageUrlsForProcessing(imageUrls: string[]): string[] {
  if (!imageUrls || !Array.isArray(imageUrls)) {
    return [];
  }
  
  // Filter out empty or invalid URLs and remove query parameters
  const cleaned = imageUrls
    .filter(url => typeof url === 'string' && url.trim().length > 0)
    .map(url => {
      // Remove query parameters for caching reasons
      const questionMarkIndex = url.indexOf('?');
      if (questionMarkIndex !== -1) {
        return url.substring(0, questionMarkIndex);
      }
      return url;
    });
  
  // Remove duplicates
  const uniqueUrls = [...new Set(cleaned)];
  
  console.log(`Cleaned ${imageUrls.length} image URLs to ${uniqueUrls.length} unique valid URLs`);
  return uniqueUrls;
}

/**
 * Validate image URLs to ensure they're accessible
 * Returns valid URLs and logs any errors
 */
export async function validateImageUrls(imageUrls: string[]): Promise<{
  validUrls: string[],
  invalidUrls: {url: string, reason: string}[]
}> {
  const validUrls: string[] = [];
  const invalidUrls: {url: string, reason: string}[] = [];
  
  // Process each URL in parallel with a timeout
  const validationPromises = imageUrls.map(async (url) => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(url, {
        method: 'HEAD',
        signal: controller.signal,
        headers: {
          'Cache-Control': 'no-cache'
        }
      });
      
      clearTimeout(timeoutId);
      
      if (!response.ok) {
        invalidUrls.push({
          url,
          reason: `HTTP status ${response.status} ${response.statusText}`
        });
        return;
      }
      
      validUrls.push(url);
    } catch (error) {
      invalidUrls.push({
        url,
        reason: error instanceof Error ? error.message : 'Unknown error'
      });
    }
  });
  
  await Promise.allSettled(validationPromises);
  
  return { validUrls, invalidUrls };
}
