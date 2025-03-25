
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
  file: File,
  fileType: 'questionPaper' | 'answerKey' | 'handwrittenPaper'
): Promise<boolean> => {
  try {
    if (!file) return false;
    
    // Upload the file to UploadThing
    const fileUrl = await uploadService.uploadFile(file, fileType);
    
    // Save file metadata to the database in the file_uploads table
    const fileId = uuidv4();
    const { error } = await supabase.from('file_uploads').insert({
      id: fileId,
      file_name: file.name,
      file_type: file.type,
      file_size: file.size,
      file_url: fileUrl,
      upload_type: `subject_${fileType}_${subjectId}_${topic}` // Use a consistent pattern for identifying file purpose
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
    // Query file_uploads table and group by topic
    const { data, error } = await supabase
      .from('file_uploads')
      .select('*')
      .like('upload_type', `subject_%_${subjectId}_%`)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    
    // Convert to SubjectFile format
    const subjectFiles: Record<string, SubjectFile> = {};
    
    if (data) {
      data.forEach(file => {
        // Extract topic from upload_type
        const parts = file.upload_type.split('_');
        if (parts.length < 4) return;
        
        const fileType = parts[1]; // questionPaper, answerKey, or handwrittenPaper
        const topic = parts.slice(3).join('_'); // Everything after the 3rd underscore is the topic
        
        if (!subjectFiles[topic]) {
          subjectFiles[topic] = {
            id: `${subjectId}_${topic}`,
            subject_id: subjectId,
            topic,
            question_paper_url: '',
            answer_key_url: '',
            handwritten_paper_url: null,
            created_at: file.created_at
          };
        }
        
        // Set the appropriate URL based on file type
        if (fileType === 'questionPaper') {
          subjectFiles[topic].question_paper_url = file.file_url;
        } else if (fileType === 'answerKey') {
          subjectFiles[topic].answer_key_url = file.file_url;
        } else if (fileType === 'handwrittenPaper') {
          subjectFiles[topic].handwritten_paper_url = file.file_url;
        }
      });
    }
    
    return Object.values(subjectFiles);
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
    // Delete files based on upload_type pattern
    let uploadTypePattern;
    
    // For test files
    if (prefix.startsWith('test_')) {
      const testId = prefix.replace('test_', '');
      uploadTypePattern = `test_%_${testId}_${topic}`;
    } 
    // For subject files
    else {
      uploadTypePattern = `subject_%_${prefix}_${topic}`;
    }
    
    const { error } = await supabase
      .from('file_uploads')
      .delete()
      .like('upload_type', uploadTypePattern);
    
    if (error) throw error;
    
    return true;
  } catch (error) {
    console.error("Error deleting file group:", error);
    return false;
  }
};
