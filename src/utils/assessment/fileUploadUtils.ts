
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { uploadPdfFile } from "./pdf/pdfFileUtils";
import { validatePdfFile, validateFileFormat } from "./fileValidation";
import { deletePreviousFiles } from "./fileCleanup";
import { 
  saveTestAnswer, 
  getAnswerSheetUrl, 
  getAnswerSheetZipUrl 
} from "./testAnswersDb";

/**
 * Uploads an answer sheet file to Supabase storage
 * For PDF files, it processes them into ZIP archives of PNG images for better OCR
 */
export const uploadAnswerSheetFile = async (file: File, studentId?: string): Promise<{ publicUrl: string, zipUrl?: string, textContent?: string }> => {
  try {
    // For PDF files, use the specialized PDF uploader
    if (validatePdfFile(file)) {
      return await uploadPdfFile(file, studentId, 'answer_sheets');
    }
    
    // For other file types, use the regular upload process
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `answer_sheets/${fileName}`;
    
    // Upload the original file to Supabase storage
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
    
    if (!urlData) {
      throw new Error("Failed to get public URL");
    }
    
    return { 
      publicUrl: urlData.publicUrl
    };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    throw new Error(error.message || "Failed to upload file");
  }
};

/**
 * Uploads a question paper or answer key file to Supabase storage
 * For PDF files, it processes them into ZIP archives of PNG images for better OCR
 */
export const uploadTestFile = async (file: File, fileType: string): Promise<string> => {
  try {
    // For PDF files, use the specialized PDF uploader with batch processing
    if (validatePdfFile(file)) {
      const folderPath = `test_${fileType}`;
      const { publicUrl, zipUrl } = await uploadPdfFile(file, undefined, folderPath);
      
      // For question papers and answer keys, we'll prefer the ZIP URL if available
      return zipUrl || publicUrl;
    }
    
    // For other file types, use the regular upload process
    // Generate a unique file name
    const fileExt = file.name.split('.').pop();
    const fileName = `${uuidv4()}.${fileExt}`;
    const filePath = `test_${fileType}/${fileName}`;
    
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
    
    if (!urlData) {
      throw new Error("Failed to get public URL");
    }
    
    return urlData.publicUrl;
  } catch (error: any) {
    console.error(`Error uploading ${fileType} file:`, error);
    throw new Error(error.message || `Failed to upload ${fileType} file`);
  }
};

// Export all the utility functions
export {
  validatePdfFile,
  validateFileFormat,
  deletePreviousFiles,
  saveTestAnswer,
  getAnswerSheetUrl,
  getAnswerSheetZipUrl
};
