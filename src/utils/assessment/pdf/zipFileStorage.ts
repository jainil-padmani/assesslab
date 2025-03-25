
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a ZIP file to Supabase storage with proper content type
 */
export async function uploadZipFile(
  zipBlob: Blob, 
  identifier: string, 
  folderType: string = 'answer_sheets'
): Promise<string> {
  try {
    // Ensure the ZIP file has the correct content type
    const properZipBlob = new Blob([zipBlob], { type: 'application/zip' });
    
    // Validate the ZIP blob before uploading
    if (properZipBlob.size === 0) {
      throw new Error("ZIP file is empty");
    }
    
    if (properZipBlob.size > 50 * 1024 * 1024) {
      throw new Error("ZIP file exceeds 50MB size limit");
    }
    
    // Generate a unique filename with clear identifier
    const fileName = `${folderType}_${identifier}_${uuidv4()}.zip`;
    const filePath = `${folderType}_zip/${fileName}`;
    
    console.log(`Uploading ZIP file: ${filePath}, size: ${properZipBlob.size} bytes`);
    
    // Upload the ZIP file to Supabase storage with proper content type
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, properZipBlob, {
        contentType: 'application/zip',
        cacheControl: 'max-age=3600',
        upsert: false // Prevent accidental overwrites
      });
    
    if (uploadError) {
      console.error("ZIP upload error:", uploadError);
      throw uploadError;
    }
    
    // Get the public URL without any cache parameters yet
    const { data: urlData } = await supabase.storage
      .from('files')
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      throw new Error("Failed to get public URL for ZIP file");
    }
    
    // Add a small random parameter to bust any potential caching
    const publicUrl = urlData.publicUrl;
    
    console.log("ZIP URL created:", publicUrl);
    return publicUrl;
  } catch (error) {
    console.error("Error uploading ZIP file:", error);
    throw error;
  }
}

/**
 * Downloads a ZIP file to the user's device
 */
export function downloadZipFile(zipBlob: Blob, fileName: string): void {
  try {
    // Ensure the ZIP has the correct content type
    const properZipBlob = new Blob([zipBlob], { type: 'application/zip' });
    
    // Add a timestamp to the filename to prevent conflicts
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const downloadFileName = `${fileName}_${timestamp}.zip`;
    
    // Use file-saver to trigger browser download
    saveAs(properZipBlob, downloadFileName);
  } catch (error) {
    console.error("Error downloading ZIP file:", error);
    throw error;
  }
}
