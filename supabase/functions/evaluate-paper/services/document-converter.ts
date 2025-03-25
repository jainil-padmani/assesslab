/**
 * Document Converter Service
 * Handles conversion of different document types for OCR processing
 */

import { cleanUrlForApi } from "../utils/image-processing.ts";

/**
 * Detect file type based on URL or content type
 */
export function detectFileType(url: string, contentType?: string): 'pdf' | 'image' | 'unknown' {
  // If content type is provided, use it for detection
  if (contentType) {
    if (contentType.startsWith('application/pdf')) {
      return 'pdf';
    }
    if (contentType.startsWith('image/')) {
      return 'image';
    }
  }
  
  // Otherwise detect from URL extension
  const urlLower = url.toLowerCase();
  if (urlLower.endsWith('.pdf')) {
    return 'pdf';
  }
  
  if (/\.(jpe?g|png|gif|webp|bmp|tiff?)$/i.test(urlLower)) {
    return 'image';
  }
  
  // If can't determine, assume it's unknown
  return 'unknown';
}

/**
 * Checks if remote file exists and gets its content type
 */
export async function checkRemoteFile(url: string): Promise<{ exists: boolean, contentType?: string }> {
  try {
    // Clean URL to remove query parameters
    const cleanUrl = cleanUrlForApi(url);
    
    // Use HEAD request to check if file exists and get content type
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000); // 15 second timeout
    
    const response = await fetch(cleanUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    
    clearTimeout(timeoutId);
    
    if (!response.ok) {
      console.error(`File not found or access denied: ${cleanUrl} (HTTP ${response.status})`);
      return { exists: false };
    }
    
    // Get content type from headers
    const contentType = response.headers.get('content-type');
    
    return {
      exists: true,
      contentType: contentType || undefined
    };
  } catch (error) {
    console.error(`Error checking remote file: ${url}`, error);
    return { exists: false };
  }
}

/**
 * Get document pages as image URLs
 * This function handles both PDF and image files, returning an array of image URLs
 */
export async function getDocumentPagesAsImages(documentUrl: string): Promise<string[]> {
  try {
    // First, check if the file exists and get its type
    const { exists, contentType } = await checkRemoteFile(documentUrl);
    
    if (!exists) {
      throw new Error(`Document not found or inaccessible: ${documentUrl}`);
    }
    
    // Detect file type
    const fileType = detectFileType(documentUrl, contentType);
    
    if (fileType === 'unknown') {
      console.warn(`Unknown file type for ${documentUrl}, will attempt to process as image`);
    }
    
    // For PDFs, look for pre-rendered images
    if (fileType === 'pdf') {
      // Extract identifiers from URL to find related images
      const baseStoragePath = documentUrl.substring(0, documentUrl.lastIndexOf('/'));
      
      // Look for the PDF identifier
      const pdfIdMatch = documentUrl.match(/\/([a-f0-9-]+)\.pdf$/i);
      
      if (pdfIdMatch && pdfIdMatch[1]) {
        const pdfId = pdfIdMatch[1];
        const optimizedImagesPath = `${baseStoragePath.substring(0, baseStoragePath.lastIndexOf('/'))}/optimized_pdf_pages`;
        
        // Look for converted images with pattern pdf_page_*_<pdfId>.jpg
        console.log(`Looking for pre-rendered PDF pages at: ${optimizedImagesPath} with ID: ${pdfId}`);
        
        // For now, we'll try to resolve the first page and return its URL
        // In a production environment, we would list all available pages
        const likelyFirstPageUrl = `${optimizedImagesPath}/pdf_page_1_${pdfId}.jpg`;
        
        const { exists: pageExists } = await checkRemoteFile(likelyFirstPageUrl);
        
        if (pageExists) {
          console.log(`Found pre-rendered PDF page: ${likelyFirstPageUrl}`);
          return [likelyFirstPageUrl];
        }
        
        // If we can't find pre-rendered pages, use original PDF
        console.log(`No pre-rendered pages found for PDF. Using original PDF URL: ${documentUrl}`);
      }
    }
    
    // If it's a simple image or we can't find pre-rendered PDF pages, return the original URL
    console.log(`Processing ${fileType} document directly: ${documentUrl}`);
    return [cleanUrlForApi(documentUrl)];
  } catch (error) {
    console.error("Error getting document pages:", error);
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
