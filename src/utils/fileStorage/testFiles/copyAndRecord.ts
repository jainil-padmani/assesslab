
import { supabase } from "@/integrations/supabase/client";

/**
 * Copies a file from one location to another in the storage bucket and records the operation
 * 
 * @param sourceUrl The source URL of the file to copy
 * @param destinationKey The destination key for the copied file
 * @param testId The ID of the test to record the operation for
 * @returns The public URL of the copied file
 */
export const copyAndRecord = async (
  sourceUrl: string,
  destinationKey: string,
  testId: string
): Promise<string> => {
  try {
    console.log(`Copying file from URL: ${sourceUrl} to ${destinationKey}`);
    
    // Extract the source path from the URL
    const sourcePath = extractPathFromUrl(sourceUrl);
    if (!sourcePath) {
      throw new Error("Could not extract path from source URL");
    }
    
    // Copy the file within the storage
    const { data: copyData, error: copyError } = await supabase.storage
      .from('files')
      .copy(sourcePath, destinationKey);
      
    if (copyError) {
      throw copyError;
    }
    
    // Get the public URL for the copied file
    const { data: urlData } = await supabase.storage
      .from('files')
      .getPublicUrl(destinationKey);
      
    if (!urlData) {
      throw new Error("Failed to get public URL for copied file");
    }
    
    console.log(`Successfully copied file to ${destinationKey}`);
    console.log(`Public URL: ${urlData.publicUrl}`);
    
    // Dispatch an event to notify that a test file has been assigned
    const event = new CustomEvent('testFileAssigned', {
      detail: {
        testId,
        destinationKey,
        publicUrl: urlData.publicUrl
      }
    });
    document.dispatchEvent(event);
    
    return urlData.publicUrl;
  } catch (error: any) {
    console.error("Error copying file:", error);
    throw error;
  }
};

/**
 * Extracts the path from a Supabase storage URL
 */
function extractPathFromUrl(url: string): string | null {
  try {
    // Remove query parameters
    const baseUrl = url.split('?')[0];
    
    // Check if this is a Supabase storage URL
    const storagePattern = /\/storage\/v1\/object\/public\/([^/]+)\/(.*)/;
    const match = baseUrl.match(storagePattern);
    
    if (match && match.length >= 3) {
      const bucket = match[1];
      const path = match[2];
      
      if (bucket === 'files') {
        return path;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error extracting path from URL:", error);
    return null;
  }
}
