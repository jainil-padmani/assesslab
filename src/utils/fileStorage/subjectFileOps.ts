
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";
import { 
  listStorageFiles, 
  getPublicUrl, 
  uploadStorageFile, 
  copyStorageFile 
} from "./storageHelpers";
import { 
  mapSubjectFiles,
  mapTestFilesToSubject 
} from "./fileMappers";

// Fetch subject files including test files related to the subject
export const fetchSubjectFiles = async (subjectId: string): Promise<SubjectFile[]> => {
  try {
    // Get files from storage
    const storageData = await listStorageFiles();
    
    // Initialize the files map
    let filesMap = mapSubjectFiles(storageData, subjectId);
    
    // Get all tests for this subject to include their files too
    const { data: subjectTests, error: testsError } = await supabase
      .from('tests')
      .select('id, name')
      .eq('subject_id', subjectId);
      
    if (testsError) throw testsError;
    
    // Process test files for this subject
    if (subjectTests) {
      filesMap = await mapTestFilesToSubject(storageData, subjectId, subjectTests, filesMap);
    }
    
    // Filter out incomplete entries
    const files = Array.from(filesMap.values()).filter(
      file => file.question_paper_url && file.answer_key_url
    );
    
    return files;
  } catch (error: any) {
    console.error('Error fetching subject files:', error);
    toast.error('Failed to fetch subject files');
    return [];
  }
};

// Function to delete files by group
export const deleteFileGroup = async (filePrefix: string, topic: string): Promise<boolean> => {
  try {
    // Get all files from storage
    const storageFiles = await listStorageFiles();
    
    // Filter files by the group prefix
    const groupPrefix = `${filePrefix}_${topic}_`;
    const filesToDelete = storageFiles?.filter(file => 
      file.name.startsWith(groupPrefix)
    ) || [];
        
    // Delete each file
    for (const file of filesToDelete) {
      await supabase
        .storage
        .from('files')
        .remove([file.name]);
    }

    // If this is a test file, also check for subject copies
    if (filePrefix.startsWith('test_')) {
      const parts = filePrefix.split('_');
      if (parts.length >= 2) {
        const testId = parts[1];
        // Get the subject ID for this test
        const { data: testData } = await supabase
          .from('tests')
          .select('subject_id')
          .eq('id', testId)
          .single();
          
        if (testData?.subject_id) {
          // Also delete subject copies
          const subjectPrefix = `${testData.subject_id}_${topic}_`;
          const subjectFilesToDelete = storageFiles?.filter(file => 
            file.name.startsWith(subjectPrefix)
          ) || [];
          
          for (const file of subjectFilesToDelete) {
            await supabase.storage.from('files').remove([file.name]);
          }
        }
      }
    }

    toast.success("Files deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting files:", error);
    toast.error("Failed to delete files");
    return false;
  }
};

// Function to upload a new file for a subject
export const uploadSubjectFile = async (
  subjectId: string,
  topic: string,
  file: File,
  fileType: 'questionPaper' | 'answerKey' | 'handwrittenPaper'
): Promise<string> => {
  try {
    const fileExt = file.name.split('.').pop();
    const sanitizedTopic = topic.replace(/\s+/g, '_');
    const fileName = `${subjectId}_${sanitizedTopic}_${fileType}_${Date.now()}.${fileExt}`;

    await uploadStorageFile(fileName, file);

    const { data: { publicUrl } } = getPublicUrl(fileName);
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading ${fileType}:`, error);
    throw error;
  }
};
