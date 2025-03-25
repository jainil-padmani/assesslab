
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { validatePdfFile, validateFileFormat, isValidFileFormat } from "./fileValidation";
import { deletePreviousFiles } from "./fileCleanup";
import { 
  saveTestAnswer, 
  getAnswerSheetUrl, 
  getAnswerSheetZipUrl 
} from "./testAnswersDb";
import { uploadService } from "@/services/uploadService";

/**
 * Uploads an answer sheet file to UploadThing
 * For PDF files and images, it processes them for better OCR
 */
export const uploadAnswerSheetFile = async (file: File, studentId?: string): Promise<{ publicUrl: string, zipUrl?: string, textContent?: string }> => {
  try {
    // Upload the file directly to UploadThing
    console.log(`Processing ${file.type} file for student: ${studentId || 'unknown'}`);
    
    // Upload to UploadThing
    const publicUrl = await uploadService.uploadFile(file, 'answerSheet');
    
    // For PDFs, we still want to note that it's a PDF for OCR processing
    const isPdf = file.type === 'application/pdf';
    
    return { 
      publicUrl,
      // For PDFs, we're not creating a zip anymore as UploadThing will handle the file as is
      zipUrl: isPdf ? publicUrl : undefined
    };
  } catch (error: any) {
    console.error("Error uploading file:", error);
    throw new Error(error.message || "Failed to upload file");
  }
};

/**
 * Uploads a question paper or answer key file to UploadThing
 */
export const uploadTestFile = async (file: File, fileType: string): Promise<string> => {
  try {
    // Convert fileType to a valid UploadThing endpoint
    const endpoint = fileType.includes('question') ? 'questionPaper' : 
                    fileType.includes('answer') ? 'answerKey' : 'generalFile';
    
    // Upload to UploadThing
    const publicUrl = await uploadService.uploadFile(file, endpoint as any);
    
    console.log(`Successfully uploaded ${fileType} file to: ${publicUrl}`);
    return publicUrl;
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
