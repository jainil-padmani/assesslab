
import { saveAs } from "file-saver";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a ZIP file to Supabase storage
 */
export async function uploadZipFile(
  zipBlob: Blob, 
  identifier: string, 
  folderType: string = 'answer_sheets'
): Promise<string> {
  try {
    // Generate a unique filename
    const fileName = `${folderType}_${identifier}_${uuidv4()}.zip`;
    const filePath = `${folderType}_zip/${fileName}`;
    
    console.log(`Uploading ZIP file: ${filePath}, size: ${zipBlob.size} bytes`);
    
    // Upload the ZIP file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, zipBlob);
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get the public URL
    const { data: urlData } = await supabase.storage
      .from('files')
      .getPublicUrl(filePath);
    
    if (!urlData || !urlData.publicUrl) {
      throw new Error("Failed to get public URL for ZIP file");
    }
    
    console.log("ZIP URL created:", urlData.publicUrl);
    return urlData.publicUrl;
  } catch (error) {
    console.error("Error uploading ZIP file:", error);
    throw error;
  }
}

/**
 * Downloads a ZIP file to the user's device
 */
export function downloadZipFile(zipBlob: Blob, fileName: string): void {
  saveAs(zipBlob, fileName);
}
