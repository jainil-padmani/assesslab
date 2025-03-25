
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { uploadPdfFile } from "./pdf/pdfFileUtils";
import { validatePdfFile, validateFileFormat, isValidFileFormat } from "./fileValidation";
import { deletePreviousFiles } from "./fileCleanup";
import { 
  saveTestAnswer, 
  getAnswerSheetUrl, 
  getAnswerSheetZipUrl 
} from "./testAnswersDb";
import { processPdfToZip } from "./pdfProcessingUtils";

/**
 * Uploads an answer sheet file to Supabase storage
 * For PDF files and images, it processes them into ZIP archives of PNG images for better OCR
 */
export const uploadAnswerSheetFile = async (file: File, studentId?: string): Promise<{ publicUrl: string, zipUrl?: string, textContent?: string }> => {
  try {
    // For PDF files and images, use the specialized converter
    if (validateFileFormat(file)) {
      console.log(`Processing ${file.type} file for student: ${studentId || 'unknown'}`);
      
      // Process PDF or image to ZIP of PNG files
      const fileIdentifier = studentId || uuidv4();
      const { zipUrl } = await processPdfToZip(file, fileIdentifier, 'answer_sheets');
      
      // For PNG conversion workflow, we still need to upload the original file
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
      
      console.log(`Successfully uploaded answer sheet file with ZIP conversion. Original: ${urlData.publicUrl}, ZIP: ${zipUrl}`);
      
      return { 
        publicUrl: urlData.publicUrl,
        zipUrl
      };
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
 * For PDF and image files, it processes them into ZIP archives of PNG images for better OCR
 */
export const uploadTestFile = async (file: File, fileType: string): Promise<string> => {
  try {
    // Process PDF or image files into PNGs and create ZIP
    if (validateFileFormat(file)) {
      const folderPath = `test_${fileType}`;
      const fileIdentifier = uuidv4();
      
      // Convert to PNG images and create ZIP
      console.log(`Converting ${fileType} file to ZIP of PNG images`);
      const { zipUrl } = await processPdfToZip(file, fileIdentifier, folderPath);
      
      // For question papers and answer keys, we'll prefer the ZIP URL
      console.log(`Using ZIP URL for ${fileType}: ${zipUrl}`);
      return zipUrl;
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
