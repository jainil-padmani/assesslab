
/**
 * Helper utilities for document type detection and validation
 */

/**
 * Check if a URL points to a PDF file
 */
export function isPdfDocument(url: string): boolean {
  if (!url) return false;
  
  // Check file extension
  if (url.toLowerCase().endsWith('.pdf')) {
    return true;
  }
  
  // Check if URL contains indicators of PDF content
  if (url.includes('application/pdf') || 
      url.includes('content-type=pdf')) {
    return true;
  }
  
  return false;
}

/**
 * Check if a URL points to a ZIP file
 */
export function isZipDocument(url: string): boolean {
  if (!url) return false;
  return /\.zip/i.test(url);
}

/**
 * Check if a URL points to an image file
 */
export function isImageDocument(url: string): boolean {
  if (!url) return false;
  
  const imageExtensions = ['jpg', 'jpeg', 'png', 'gif', 'webp', 'bmp', 'tiff', 'tif'];
  const urlLower = url.toLowerCase();
  
  // Check file extension
  for (const ext of imageExtensions) {
    if (urlLower.endsWith(`.${ext}`)) {
      return true;
    }
  }
  
  // Check if URL contains indicators of image content
  if (url.includes('image/')) {
    return true;
  }
  
  return false;
}

/**
 * Determine the document type from a URL
 */
export function detectDocumentType(url: string): 'pdf' | 'zip' | 'image' | 'unknown' {
  if (isPdfDocument(url)) return 'pdf';
  if (isZipDocument(url)) return 'zip';
  if (isImageDocument(url)) return 'image';
  return 'unknown';
}
