
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import { uploadService } from "@/services/uploadService";
import type { SubjectFile } from "@/types/dashboard";

/**
 * Uploads a subject file to UploadThing and saves metadata to the database
 */
export const uploadSubjectFile = async (
  subjectId: string,
  topic: string,
  questionPaper: File | null,
  answerKey: File | null
): Promise<boolean> => {
  try {
    let questionPaperUrl = "";
    let answerKeyUrl = "";
    
    // Upload question paper if provided
    if (questionPaper) {
      questionPaperUrl = await uploadService.uploadFile(questionPaper, 'questionPaper');
    }
    
    // Upload answer key if provided
    if (answerKey) {
      answerKeyUrl = await uploadService.uploadFile(answerKey, 'answerKey');
    }
    
    // Save file metadata to the database
    const fileId = uuidv4();
    const { error } = await supabase.from('subject_files').insert({
      id: fileId,
      subject_id: subjectId,
      topic,
      question_paper_url: questionPaperUrl,
      answer_key_url: answerKeyUrl,
      created_at: new Date().toISOString()
    });
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error uploading subject file:", error);
    return false;
  }
};

/**
 * Fetches subject files from the database
 */
export const fetchSubjectFiles = async (subjectId: string): Promise<SubjectFile[]> => {
  try {
    const { data, error } = await supabase
      .from('subject_files')
      .select('*')
      .eq('subject_id', subjectId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    return data || [];
  } catch (error) {
    console.error("Error fetching subject files:", error);
    return [];
  }
};

/**
 * Deletes a group of files from the database
 */
export const deleteFileGroup = async (prefix: string, topic: string): Promise<boolean> => {
  try {
    // With UploadThing, we're just removing the database records
    // The actual files would need to be managed via UploadThing dashboard
    
    // For test files
    if (prefix.startsWith('test_')) {
      const testId = prefix.replace('test_', '');
      const { error } = await supabase
        .from('test_files')
        .delete()
        .eq('test_id', testId)
        .eq('topic', topic);
      
      if (error) throw error;
    } 
    // For subject files
    else {
      const { error } = await supabase
        .from('subject_files')
        .delete()
        .eq('subject_id', prefix)
        .eq('topic', topic);
      
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error deleting file group:", error);
    return false;
  }
};
