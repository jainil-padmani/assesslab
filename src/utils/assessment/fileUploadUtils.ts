
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
import { processPdfToImages } from "./pdfProcessingUtils";

/**
 * Uploads an answer sheet file to Supabase storage
 * For PDF files and images, it processes them into optimized JPEG images for better OCR
 */
export const uploadAnswerSheetFile = async (file: File, studentId?: string): Promise<{ publicUrl: string, zipUrl?: string, textContent?: string }> => {
  try {
    // For PDF files and images, use the specialized converter
    if (validateFileFormat(file)) {
      console.log(`Processing ${file.type} file for student: ${studentId || 'unknown'}`);
      
      // Process PDF or image to optimized JPEG images
      const fileIdentifier = studentId || uuidv4();
      const { imageUrls } = await processPdfToImages(file, fileIdentifier, 'answer_sheets');
      const zipUrl = imageUrls.length > 0 ? imageUrls[0] : undefined;
      
      // For image conversion workflow, we still need to upload the original file
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
      
      console.log(`Successfully uploaded answer sheet file with image conversion. Original: ${urlData.publicUrl}, Image URL: ${zipUrl}`);
      
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
 * For PDF and image files, it processes them into optimized JPEG images for better OCR
 */
export const uploadTestFile = async (file: File, fileType: string): Promise<string> => {
  try {
    // Process PDF or image files into optimized JPEG images
    if (validateFileFormat(file)) {
      const folderPath = `test_${fileType}`;
      const fileIdentifier = uuidv4();
      
      // Convert to optimized JPEG images
      console.log(`Converting ${fileType} file to optimized JPEG images`);
      const { imageUrls } = await processPdfToImages(file, fileIdentifier, folderPath);
      
      // For question papers and answer keys, we'll use the first image URL
      if (imageUrls.length > 0) {
        console.log(`Using image URL for ${fileType}: ${imageUrls[0]}`);
        return imageUrls[0];
      }
    }
    
    // For other file types or if image conversion fails, use the regular upload process
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

/**
 * Saves answer sheet information to the database
 */
export const saveTestAnswer = async ({
  studentId,
  testId,
  subjectId,
  answerSheetUrl,
  zipUrl,
  textContent
}: {
  studentId: string;
  testId: string;
  subjectId: string;
  answerSheetUrl: string;
  zipUrl?: string;
  textContent?: string;
}): Promise<boolean> => {
  try {
    // First check if an entry already exists
    const { data: existingData, error: checkError } = await supabase
      .from('test_answers')
      .select('id')
      .eq('student_id', studentId)
      .eq('test_id', testId)
      .eq('subject_id', subjectId);
      
    if (checkError) throw checkError;
    
    if (existingData && existingData.length > 0) {
      // Update existing entry
      const { error: updateError } = await supabase
        .from('test_answers')
        .update({
          answer_sheet_url: answerSheetUrl,
          zip_url: zipUrl,
          text_content: textContent
        })
        .eq('student_id', studentId)
        .eq('test_id', testId)
        .eq('subject_id', subjectId);
        
      if (updateError) throw updateError;
    } else {
      // Insert new entry
      const { error: insertError } = await supabase
        .from('test_answers')
        .insert({
          student_id: studentId,
          test_id: testId,
          subject_id: subjectId,
          answer_sheet_url: answerSheetUrl,
          zip_url: zipUrl,
          text_content: textContent
        });
        
      if (insertError) throw insertError;
    }
    
    return true;
  } catch (error) {
    console.error('Error saving test answer:', error);
    return false;
  }
};

// Re-export the other utility functions
export {
  validatePdfFile,
  validateFileFormat,
  deletePreviousFiles,
  getAnswerSheetUrl,
  getAnswerSheetZipUrl
};
