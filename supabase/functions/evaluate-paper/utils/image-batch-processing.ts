
/**
 * Utilities for processing images in batches for Claude 3.5 Vision
 */

/**
 * Create optimized batches of images for processing with Claude Vision
 * Claude 3.5 can process up to 4 images in a single request
 */
export function createImageBatches(imageUrls: string[], batchSize: number = 4): string[][] {
  // Create batches of image URLs with maximum size of batchSize (default 4)
  const batches: string[][] = [];
  
  for (let i = 0; i < imageUrls.length; i += batchSize) {
    batches.push(imageUrls.slice(i, i + batchSize));
  }
  
  return batches;
}

/**
 * Clean image URLs to ensure they are accessible
 */
export function cleanImageUrlsForProcessing(imageUrls: string[]): string[] {
  return imageUrls.map(url => {
    // Remove query parameters that might cause issues
    const questionMarkIndex = url.indexOf('?');
    if (questionMarkIndex !== -1) {
      return url.substring(0, questionMarkIndex);
    }
    return url;
  });
}

/**
 * Extract image URLs from a ZIP manifest or similar source
 * This function can be extended if needed
 */
export function extractImageUrlsFromSource(source: string | string[]): string[] {
  if (Array.isArray(source)) {
    return source;
  }
  
  // For string sources, we might need to parse JSON or other formats
  try {
    return JSON.parse(source);
  } catch (e) {
    // If it's just a single URL, return it as an array
    return [source];
  }
}
