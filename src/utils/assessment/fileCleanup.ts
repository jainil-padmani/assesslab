
import { supabase } from "@/integrations/supabase/client";

/**
 * Deletes previous files when a new one is uploaded
 */
export const deletePreviousFiles = async (urls: string[]): Promise<void> => {
  if (!urls || urls.length === 0) return;
  
  try {
    for (const url of urls) {
      if (!url) continue;
      
      // Extract file path from URL
      const filePathMatch = url.match(/\/files\/([^?]+)/);
      if (!filePathMatch || !filePathMatch[1]) continue;
      
      const filePath = filePathMatch[1];
      
      // Delete the file
      const { error } = await supabase.storage
        .from('files')
        .remove([filePath]);
      
      if (error) {
        console.error("Error removing previous file:", error);
      }
    }
  } catch (error) {
    console.error("Error deleting previous files:", error);
  }
};
