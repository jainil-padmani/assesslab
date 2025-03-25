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
 * For PDFs, it ALWAYS converts to images before returning
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
    
    // We MUST convert PDFs to images
    if (fileType === 'pdf') {
      console.log(`PDF detected at ${documentUrl}, checking for pre-rendered images`);
      
      // Extract identifiers from URL to find related images
      const baseStoragePath = documentUrl.substring(0, documentUrl.lastIndexOf('/'));
      
      // Look for the PDF identifier
      const pdfIdMatch = documentUrl.match(/\/([a-f0-9-]+)\.pdf$/i);
      
      if (pdfIdMatch && pdfIdMatch[1]) {
        const pdfId = pdfIdMatch[1];
        const optimizedImagesPath = `${baseStoragePath.substring(0, baseStoragePath.lastIndexOf('/'))}/optimized_pdf_pages`;
        
        // Look for converted images with pattern pdf_page_*_<pdfId>.jpg
        console.log(`Looking for pre-rendered PDF pages with ID: ${pdfId}`);
        
        // For frontend-uploaded PDFs, check for optimized JPEG images in the storage bucket
        try {
          const possibleImagePath = `${optimizedImagesPath}/pdf_page_1_${pdfId}.jpg`;
          const { exists: imageExists } = await checkRemoteFile(possibleImagePath);
          
          if (imageExists) {
            console.log(`Found pre-rendered PDF image: ${possibleImagePath}`);
            // Try to find more pages with the same pattern
            const imageUrls = [possibleImagePath];
            
            // Check for pages 2-4 (common numbers of pages)
            for (let pageNum = 2; pageNum <= 4; pageNum++) {
              const pagePath = `${optimizedImagesPath}/pdf_page_${pageNum}_${pdfId}.jpg`;
              const { exists: pageExists } = await checkRemoteFile(pagePath);
              if (pageExists) {
                imageUrls.push(pagePath);
              } else {
                break; // Stop looking for more pages
              }
            }
            
            console.log(`Found ${imageUrls.length} pre-rendered PDF pages`);
            return imageUrls;
          }
        } catch (error) {
          console.error("Error finding pre-rendered PDF images:", error);
        }
      }
      
      // If we can't find pre-rendered images, we need to tell the caller
      // that they should convert the PDF first before sending to Bedrock
      console.error(`PDF detected at ${documentUrl} but no pre-rendered images found. PDF must be converted to images before sending to Bedrock.`);
      throw new Error(`PDF must be converted to images before processing. No pre-rendered images found for ${documentUrl}`);
    }
    
    // If it's a simple image, return the original URL
    if (fileType === 'image') {
      console.log(`Processing image document directly: ${documentUrl}`);
      return [cleanUrlForApi(documentUrl)];
    }
    
    // If we got here with an unknown type, try to process as image but warn
    console.warn(`Unknown file type for ${documentUrl}, attempting to process as image`);
    return [cleanUrlForApi(documentUrl)];
  } catch (error) {
    console.error("Error getting document pages:", error);
    throw new Error(`Failed to process document: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
