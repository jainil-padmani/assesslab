
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";

/**
 * Validates if a file is PDF
 */
export const validatePdfFile = (file: File): boolean => {
  const validTypes = ['application/pdf'];
  return validTypes.includes(file.type);
};

/**
 * Uploads an answer sheet file to Supabase storage
 */
export const uploadAnswerSheetFile = async (file: File): Promise<{ publicUrl: string }> => {
  try {
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `answer_sheets/${fileName}`;
    
    // Upload the file to Supabase storage
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(filePath, file);
    
    if (uploadError) {
      throw uploadError;
    }
    
    // Get the public URL
    const { data: urlData } = await supabase.storage
      .from('files')
      .getPublicUrl(filePath);
    
    return { publicUrl: urlData.publicUrl };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    throw new Error(error.message || "Failed to upload file");
  }
};

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
