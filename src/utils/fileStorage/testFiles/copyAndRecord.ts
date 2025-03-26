
import { supabase } from "@/integrations/supabase/client";
import { 
  copyStorageFile, 
  getPublicUrl,
  forceRefreshStorage 
} from "../storageHelpers";
import { 
  extractFilenameFromUrl, 
  getFileExtension 
} from "./fileExtractors";

/**
 * Copies a file from one storage location to another
 * and records the operation in the database
 * 
 * @param sourceUrl The source file URL
 * @param destKeyPrefix The destination file key prefix
 * @param testId The test ID to associate with
 * @returns Promise<boolean> indicating success
 */
export const copyAndRecord = async (
  sourceUrl: string,
  destKeyPrefix: string,
  testId: string
): Promise<boolean> => {
  try {
    console.log(`Copying file from ${sourceUrl} to ${destKeyPrefix}`);
    
    // Extract the filename from the URL
    const sourceFileName = extractFilenameFromUrl(sourceUrl);
    const fileExtension = getFileExtension(sourceFileName);
    
    // Create the destination filename
    const destFileName = `${destKeyPrefix}.${fileExtension}`;
    
    // Copy the file
    await copyStorageFile(sourceFileName, destFileName);
    console.log(`Copied file to: ${destFileName}`);
    
    // Get the public URL for the new file
    const publicUrl = getPublicUrl(destFileName).data.publicUrl;
    
    // Force refresh storage to ensure visibility
    await forceRefreshStorage();
    
    return true;
  } catch (error) {
    console.error('Error copying and recording file:', error);
    return false;
  }
};
