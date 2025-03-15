
import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to Supabase storage
 */
export const uploadAnswerSheetFile = async (file: File) => {
  const fileName = `${crypto.randomUUID()}.pdf`;
  
  const { error } = await supabase.storage
    .from('documents')
    .upload(`answer-sheets/${fileName}`, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(`answer-sheets/${fileName}`);
    
  return { fileName, publicUrl };
};

/**
 * Deletes previous files from storage
 */
export const deletePreviousFiles = async (previousUrls: string[]) => {
  for (const prevUrl of previousUrls) {
    try {
      if (prevUrl) {
        const urlPath = new URL(prevUrl).pathname;
        const pathParts = urlPath.split('/');
        const oldFileName = pathParts[pathParts.length - 1];
        
        if (oldFileName) {
          await supabase.storage
            .from('documents')
            .remove([`answer-sheets/${oldFileName}`]);
          
          console.log('Successfully deleted previous file from storage:', oldFileName);
        }
      }
    } catch (deleteError) {
      console.error('Error deleting previous file:', deleteError);
    }
  }
};

/**
 * Validates a file is a PDF
 */
export const validatePdfFile = (file: File): boolean => {
  return file.type === 'application/pdf';
};
