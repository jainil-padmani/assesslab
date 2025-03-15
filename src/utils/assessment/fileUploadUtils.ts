
import { supabase } from "@/integrations/supabase/client";

/**
 * Uploads a file to Supabase storage
 */
export const uploadAnswerSheetFile = async (file: File, textContent?: string) => {
  const fileName = `${crypto.randomUUID()}.pdf`;
  
  const { error } = await supabase.storage
    .from('documents')
    .upload(`answer-sheets/${fileName}`, file);

  if (error) throw error;

  const { data: { publicUrl } } = supabase.storage
    .from('documents')
    .getPublicUrl(`answer-sheets/${fileName}`);
    
  return { fileName, publicUrl, textContent };
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

/**
 * Extract text from PDF using OCR
 * Note: This function doesn't perform OCR itself but serves as a placeholder
 * for the extraction process that happens in the edge function
 */
export const extractTextFromPdf = async (file: File): Promise<string | null> => {
  try {
    // In a real implementation, we would send the PDF to an OCR service
    // For now, we'll return a placeholder message
    return "Text extraction is handled server-side during evaluation";
  } catch (error) {
    console.error("Error extracting text from PDF:", error);
    return null;
  }
};
