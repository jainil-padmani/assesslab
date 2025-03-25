
import { supabase } from "@/integrations/supabase/client";
import { v4 as uuidv4 } from "uuid";
import type { SubjectFile } from "@/types/dashboard";

export interface TestFile {
  id: string;
  test_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
}

/**
 * Assigns existing subject files to a test by creating a copy in the file_uploads table
 */
export const assignSubjectFilesToTest = async (
  testId: string,
  subjectFile: SubjectFile
): Promise<boolean> => {
  try {
    const now = new Date().toISOString();
    const entries = [];
    
    // Create an entry for question paper
    if (subjectFile.question_paper_url) {
      entries.push({
        id: uuidv4(),
        file_name: `${subjectFile.topic}_question.pdf`,
        file_type: 'application/pdf',
        file_size: 0, // We don't know the size, but we need to provide a value
        file_url: subjectFile.question_paper_url,
        upload_type: `test_questionPaper_${testId}_${subjectFile.topic}`,
        created_at: now
      });
    }
    
    // Create an entry for answer key
    if (subjectFile.answer_key_url) {
      entries.push({
        id: uuidv4(),
        file_name: `${subjectFile.topic}_answer.pdf`,
        file_type: 'application/pdf',
        file_size: 0,
        file_url: subjectFile.answer_key_url,
        upload_type: `test_answerKey_${testId}_${subjectFile.topic}`,
        created_at: now
      });
    }
    
    // Create an entry for handwritten paper if it exists
    if (subjectFile.handwritten_paper_url) {
      entries.push({
        id: uuidv4(),
        file_name: `${subjectFile.topic}_handwritten.pdf`,
        file_type: 'application/pdf',
        file_size: 0,
        file_url: subjectFile.handwritten_paper_url,
        upload_type: `test_handwrittenPaper_${testId}_${subjectFile.topic}`,
        created_at: now
      });
    }
    
    // Insert all entries
    if (entries.length > 0) {
      const { error } = await supabase.from('file_uploads').insert(entries);
      if (error) throw error;
    }
    
    return true;
  } catch (error) {
    console.error("Error assigning files to test:", error);
    return false;
  }
};

/**
 * Fetches test files from the database
 */
export const fetchTestFiles = async (testId: string): Promise<TestFile[]> => {
  try {
    // Query file_uploads table and group by topic
    const { data, error } = await supabase
      .from('file_uploads')
      .select('*')
      .like('upload_type', `test_%_${testId}_%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Convert to TestFile format
    const testFiles: Record<string, TestFile> = {};
    
    if (data) {
      data.forEach(file => {
        // Extract topic from upload_type
        const parts = file.upload_type.split('_');
        if (parts.length < 4) return;
        
        const fileType = parts[1]; // questionPaper, answerKey, or handwrittenPaper
        const topic = parts.slice(3).join('_'); // Everything after the 3rd underscore is the topic
        
        if (!testFiles[topic]) {
          testFiles[topic] = {
            id: `${testId}_${topic}`,
            test_id: testId,
            topic,
            question_paper_url: '',
            answer_key_url: '',
            handwritten_paper_url: null,
            created_at: file.created_at
          };
        }
        
        // Set the appropriate URL based on file type
        if (fileType === 'questionPaper') {
          testFiles[topic].question_paper_url = file.file_url;
        } else if (fileType === 'answerKey') {
          testFiles[topic].answer_key_url = file.file_url;
        } else if (fileType === 'handwrittenPaper') {
          testFiles[topic].handwritten_paper_url = file.file_url;
        }
      });
    }
    
    return Object.values(testFiles);
  } catch (error) {
    console.error("Error fetching test files:", error);
    return [];
  }
};
