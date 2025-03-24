
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { processPdfToZip } from "./pdfProcessingUtils";

/**
 * Validates if a file is PDF
 */
export const validatePdfFile = (file: File): boolean => {
  const validTypes = ['application/pdf'];
  return validTypes.includes(file.type);
};

/**
 * Uploads an answer sheet file to Supabase storage
 * For PDF files, it processes them into ZIP archives of PNG images for better OCR
 */
export const uploadAnswerSheetFile = async (file: File, studentId?: string): Promise<{ publicUrl: string, zipUrl?: string, textContent?: string }> => {
  try {
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
    
    let zipUrl: string | undefined;
    
    // If it's a PDF and studentId is provided, process it to a ZIP of PNGs
    if (validatePdfFile(file) && studentId) {
      try {
        console.log("Processing PDF to ZIP for student:", studentId);
        const { zipUrl: newZipUrl } = await processPdfToZip(file, studentId);
        zipUrl = newZipUrl;
        console.log("ZIP URL created:", zipUrl);
      } catch (zipError) {
        console.error("Error processing PDF to ZIP:", zipError);
      }
    }
    
    return { 
      publicUrl: urlData.publicUrl,
      zipUrl
    };
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

/**
 * Saves or updates an answer sheet record using the test_answers table
 */
export const saveTestAnswer = async (
  studentId: string,
  subjectId: string,
  testId: string,
  answerSheetUrl: string,
  textContent?: string,
  zipUrl?: string
): Promise<string> => {
  try {
    // Check for existing test answer
    const { data: existingData, error: checkError } = await supabase
      .from('test_answers')
      .select('id')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('test_id', testId)
      .maybeSingle();
    
    if (checkError && checkError.code !== 'PGRST116') {
      throw checkError;
    }
    
    // Prepare the data
    const answerData = {
      student_id: studentId,
      subject_id: subjectId,
      test_id: testId,
      answer_sheet_url: answerSheetUrl,
      text_content: textContent || null,
      zip_url: zipUrl || null
    };
    
    if (existingData?.id) {
      // Update existing record
      const { error: updateError } = await supabase
        .from('test_answers')
        .update(answerData)
        .eq('id', existingData.id);
      
      if (updateError) throw updateError;
      return existingData.id;
    } else {
      // Insert new record
      const { data: newData, error: insertError } = await supabase
        .from('test_answers')
        .insert(answerData)
        .select('id')
        .single();
      
      if (insertError) throw insertError;
      return newData.id;
    }
  } catch (error: any) {
    console.error("Error saving test answer:", error);
    throw new Error(error.message || "Failed to save test answer");
  }
};

/**
 * Retrieves an answer sheet URL for a specific student, subject, and test
 */
export const getAnswerSheetUrl = async (
  studentId: string,
  subjectId: string,
  testId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('test_answers')
      .select('answer_sheet_url, zip_url')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('test_id', testId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching answer sheet URL:', error);
      return null;
    }
    
    // Return null if data doesn't exist
    if (!data) {
      return null;
    }
    
    // Use type assertion to ensure TypeScript knows 'data' exists
    const typedData = data as { answer_sheet_url?: string | null };
    
    // Now check if the property exists
    if ('answer_sheet_url' in typedData && typedData.answer_sheet_url) {
      return typedData.answer_sheet_url;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getAnswerSheetUrl:', error);
    return null;
  }
};

/**
 * Retrieves the ZIP URL containing PNG images of the student's answer sheet
 */
export const getAnswerSheetZipUrl = async (
  studentId: string,
  subjectId: string,
  testId: string
): Promise<string | null> => {
  try {
    const { data, error } = await supabase
      .from('test_answers')
      .select('zip_url')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId)
      .eq('test_id', testId)
      .maybeSingle();
    
    if (error && error.code !== 'PGRST116') {
      console.error('Error fetching answer sheet ZIP URL:', error);
      return null;
    }
    
    // Return null if data doesn't exist
    if (!data) {
      return null;
    }
    
    // Use type assertion to ensure TypeScript knows 'data' exists
    const typedData = data as { zip_url?: string | null };
    
    // Now check if the property exists
    if ('zip_url' in typedData && typedData.zip_url) {
      return typedData.zip_url;
    }
    
    return null;
  } catch (error) {
    console.error('Error in getAnswerSheetZipUrl:', error);
    return null;
  }
};
