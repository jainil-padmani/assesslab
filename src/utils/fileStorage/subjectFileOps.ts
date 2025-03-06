
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";
import { 
  listStorageFiles, 
  getPublicUrl, 
  uploadStorageFile, 
  deleteStorageFile
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
    
    // Get the current user ID to filter by ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    // Get the subject to verify ownership
    const { data: subject, error: subjectError } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', subjectId)
      .single();
      
    if (subjectError) throw subjectError;
    if (subject?.user_id !== user.id) {
      console.warn("User does not own this subject");
      // Still continue to allow viewing in some contexts
    }
    
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
    
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    // Verify ownership if it's a subject ID
    if (!filePrefix.startsWith('test_')) {
      const { data: subject } = await supabase
        .from('subjects')
        .select('user_id')
        .eq('id', filePrefix)
        .single();
        
      if (subject && subject.user_id !== user.id) {
        toast.error("You don't have permission to delete these files");
        return false;
      }
    } else {
      // If it's a test file, verify ownership of the test
      const parts = filePrefix.split('_');
      if (parts.length >= 2) {
        const testId = parts[1];
        const { data: test } = await supabase
          .from('tests')
          .select('user_id')
          .eq('id', testId)
          .single();
          
        if (test && test.user_id !== user.id) {
          toast.error("You don't have permission to delete these files");
          return false;
        }
      }
    }
    
    // Filter files by the group prefix
    // Handle spaces in topic by using both original and URL-encoded versions
    const sanitizedTopic = topic.replace(/\s+/g, '_');
    const groupPrefix = `${filePrefix}_${sanitizedTopic}_`;
    const spacedGroupPrefix = `${filePrefix}_${topic}_`;
    
    const filesToDelete = storageFiles?.filter(file => 
      file.name.startsWith(groupPrefix) || file.name.startsWith(spacedGroupPrefix)
    ) || [];
    
    console.log("Found files to delete:", filesToDelete);
        
    // Delete each file
    for (const file of filesToDelete) {
      await deleteStorageFile(file.name);
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
          const subjectPrefix = `${testData.subject_id}_${sanitizedTopic}_`;
          const subjectSpacedPrefix = `${testData.subject_id}_${topic}_`;
          
          const subjectFilesToDelete = storageFiles?.filter(file => 
            file.name.startsWith(subjectPrefix) || file.name.startsWith(subjectSpacedPrefix)
          ) || [];
          
          for (const file of subjectFilesToDelete) {
            await deleteStorageFile(file.name);
          }
        }
      }
    }

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
    // Verify ownership of the subject
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data: subject } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', subjectId)
      .single();
      
    if (subject && subject.user_id !== user.id) {
      throw new Error("You don't have permission to upload files to this subject");
    }
    
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
