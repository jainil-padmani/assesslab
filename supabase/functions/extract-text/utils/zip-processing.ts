
/**
 * Utility functions for ZIP file processing
 */
import JSZip from "https://esm.sh/jszip@3.10.1";
import { isSupportedImageFormat, ensureSupportedFormat } from "./image-validation.ts";

/**
 * Validate the format of images in the ZIP
 * Logs warnings for any unsupported formats
 */
export function validateZipContents(files: {name: string, dataUrl: string}[]): boolean {
  let allValid = true;
  
  for (const file of files) {
    if (!isSupportedImageFormat(file.name)) {
      console.warn(`Found unsupported image format in ZIP: ${file.name}`);
      allValid = false;
    }
  }
  
  return allValid;
}

/**
 * Pre-validates a ZIP file before full processing
 */
export async function preValidateZipUrl(zipUrl: string): Promise<boolean> {
  try {
    console.log(`Pre-validating ZIP URL: ${zipUrl}`);
    
    // Set a timeout for the validation request (8 seconds)
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    
    // Send a HEAD request to check if the URL is accessible
    const response = await fetch(zipUrl, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    clearTimeout(timeout);
    
    if (!response.ok) {
      console.error(`ZIP URL returned status ${response.status}`);
      return false;
    }
    
    // Check content type
    const contentType = response.headers.get('content-type');
    if (contentType && !contentType.includes('zip') && !contentType.includes('octet-stream')) {
      console.warn(`ZIP URL content type unexpected: ${contentType}`);
      // Continue anyway, as Supabase might not set the correct content type
    }
    
    return true;
  } catch (error) {
    console.error(`ZIP URL pre-validation failed: ${error.message}`);
    return false;
  }
}

/**
 * Processes a ZIP file and extracts its contents
 */
export async function processZipFile(zipUrl: string): Promise<{name: string, dataUrl: string}[]> {
  try {
    // Pre-validate the ZIP URL before attempting download
    const isValid = await preValidateZipUrl(zipUrl);
    if (!isValid) {
      console.warn("ZIP URL pre-validation failed, will attempt download anyway");
    }
    
    // Fetch the ZIP file with a longer timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);
    
    const zipResponse = await fetch(zipUrl, { 
      signal: controller.signal,
      headers: { 
        'Cache-Control': 'no-cache',
        'Pragma': 'no-cache'
      }
    });
    clearTimeout(timeoutId);
    
    if (!zipResponse.ok) {
      console.error("Failed to fetch ZIP file:", zipResponse.statusText);
      throw new Error("Failed to fetch ZIP file: " + zipResponse.statusText);
    }
    
    const zipData = await zipResponse.arrayBuffer();
    console.log("Successfully downloaded ZIP file, size:", zipData.byteLength);
    
    // Extract PNG files from ZIP
    const zip = await JSZip.loadAsync(zipData);
    const imagePromises = [];
    const imageFiles: {name: string, dataUrl: string}[] = [];
    
    // Process each file in the ZIP
    zip.forEach((relativePath, zipEntry) => {
      if (!zipEntry.dir) {
        // Only process supported image formats
        if (isSupportedImageFormat(relativePath)) {
          const promise = zipEntry.async('base64').then(base64Data => {
            const imgFormat = relativePath.toLowerCase().endsWith('.png') ? 'png' : 
                             relativePath.toLowerCase().endsWith('.jpg') || relativePath.toLowerCase().endsWith('.jpeg') ? 'jpeg' :
                             relativePath.toLowerCase().endsWith('.webp') ? 'webp' : 'gif';
            
            imageFiles.push({
              name: relativePath,
              dataUrl: `data:image/${imgFormat};base64,${base64Data}`
            });
          });
          imagePromises.push(promise);
        } else {
          console.warn(`Skipping unsupported file format: ${relativePath}`);
        }
      }
    });
    
    await Promise.all(imagePromises);
    
    // Sort images by filename (ensures page order)
    imageFiles.sort((a, b) => a.name.localeCompare(b.name));
    
    console.log(`Successfully extracted ${imageFiles.length} supported images from ZIP`);
    
    if (imageFiles.length === 0) {
      throw new Error("No supported image files found in ZIP. Supported formats are: PNG, JPEG, WEBP, and GIF.");
    }
    
    return imageFiles;
  } catch (error) {
    console.error("Error processing ZIP file:", error);
    throw error;
  }
}
