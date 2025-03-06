import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";
import { 
  listStorageFiles, 
  getPublicUrl, 
  uploadStorageFile, 
  deleteStorageFile,
  forceRefreshStorage
} from "./storageHelpers";
import { 
  mapSubjectFiles,
  mapTestFilesToSubject 
} from "./fileMappers";

// Fetch subject files including test files related to the subject
export const fetchSubjectFiles = async (subjectId: string): Promise<SubjectFile[]> => {
  try {
    console.log('Fetching subject files for subject ID:', subjectId);
    
    // Force refresh storage to ensure we get the latest files
    await forceRefreshStorage();
    
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
    
    // Filter to include files with at least a question paper
    const files = Array.from(filesMap.values()).filter(
      file => file.question_paper_url
    );
    
    console.log('Found subject files:', files.length);
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
    console.log(`Attempting to delete file group with prefix: ${filePrefix}, topic: ${topic}`);
    
    // Get all files from storage with fresh cache
    await forceRefreshStorage();
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
    
    // Prepare various formats of the topic for matching
    const sanitizedTopic = topic.replace(/\s+/g, '_');
    const originalTopic = topic;
    
    // Create multiple possible prefixes for more flexible matching
    const possiblePrefixes = [
      `${filePrefix}_${sanitizedTopic}_`,
      `${filePrefix}_${originalTopic}_`
    ];
    
    console.log("Looking for files with these prefixes:", possiblePrefixes);
    
    // Find files matching any of the possible prefixes
    const filesToDelete = storageFiles?.filter(file => 
      possiblePrefixes.some(prefix => file.name.startsWith(prefix))
    ) || [];
    
    console.log("Found files to delete:", filesToDelete.length, filesToDelete.map(f => f.name));
        
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
          // Also check for subject copies with various naming patterns
          const subjectPrefixes = [
            `${testData.subject_id}_${sanitizedTopic}_`,
            `${testData.subject_id}_${originalTopic}_`
          ];
          
          const subjectFilesToDelete = storageFiles?.filter(file => 
            subjectPrefixes.some(prefix => file.name.startsWith(prefix))
          ) || [];
          
          console.log("Found subject files to delete:", subjectFilesToDelete.length);
          
          for (const file of subjectFilesToDelete) {
            await deleteStorageFile(file.name);
          }
        }
      }
    }

    // Force a final refresh to ensure the storage is updated
    await forceRefreshStorage();

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
    // Verify ownership of the subject
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data: subject } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', subjectId)
      .single();
      
    if (!subject || subject.user_id !== user.id) {
      throw new Error("You don't have permission to upload files to this subject");
    }
    
    const fileExt = file.name.split('.').pop();
    const sanitizedTopic = topic.replace(/\s+/g, '_');
    const fileName = `${subjectId}_${sanitizedTopic}_${fileType}_${Date.now()}.${fileExt}`;

    await uploadStorageFile(fileName, file);

    // Insert record into subject_documents
    await supabase.from('subject_documents').insert({
      subject_id: subjectId,
      user_id: user.id,
      file_name: fileName,
      document_type: fileType,
      document_url: getPublicUrl(fileName).data.publicUrl,
      file_type: fileExt,
      file_size: file.size
    });

    const { data: { publicUrl } } = getPublicUrl(fileName);
    
    // Force a refresh to update storage
    await forceRefreshStorage();
    
    return publicUrl;
  } catch (error) {
    console.error(`Error uploading ${fileType}:`, error);
    throw error;
  }
};
