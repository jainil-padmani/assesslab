import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";
import { 
  listStorageFiles, 
  copyStorageFile,
  getPublicUrl,
  forceRefreshStorage
} from "./storageHelpers";
import { mapTestFiles } from "./fileMappers";

// Function to fetch test files
export const fetchTestFiles = async (testId: string): Promise<any[]> => {
  try {
    console.log('Fetching test files for test ID:', testId);
    
    // Force a refresh to ensure we get the latest files
    await forceRefreshStorage();
    
    // Verify test exists and get ownership info
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('user_id, subject_id')
      .eq('id', testId)
      .single();
      
    if (testError) throw testError;
    
    // Get all files from storage
    const storageData = await listStorageFiles();

    // Map the files to test files
    const filesMap = mapTestFiles(storageData, testId);
    
    // Filter to include files with at least a question paper
    const files = Array.from(filesMap.values()).filter(
      file => file.question_paper_url
    );
    
    console.log("Fetched test files:", files.length);
    return files;
  } catch (error) {
    console.error('Error fetching test files:', error);
    toast.error('Failed to fetch test files');
    return [];
  }
};

// Function to assign existing subject files to a test
export const assignSubjectFilesToTest = async (
  testId: string,
  subjectFile: SubjectFile
): Promise<boolean> => {
  try {
    console.log('Assigning subject file to test:', { testId, subjectFile });
    
    // Verify ownership of test and subject
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data: test } = await supabase
      .from('tests')
      .select('user_id, subject_id')
      .eq('id', testId)
      .single();
      
    if (!test) throw new Error("Test not found");
    if (test.user_id !== user.id) {
      throw new Error("You don't have permission to modify this test");
    }
    
    if (test.subject_id !== subjectFile.subject_id) {
      throw new Error("The selected file belongs to a different subject");
    }

    // Force a refresh to ensure we get the latest files
    await forceRefreshStorage();

    // Extract topic and sanitize it
    const topicParts = subjectFile.topic.split(': ');
    const cleanTopic = topicParts.length > 1 ? topicParts[1] : subjectFile.topic;
    const sanitizedTopic = cleanTopic.replace(/\s+/g, '_');

    // Get the original files from storage
    const storageData = await listStorageFiles();
    
    // Find question paper (required)
    const questionPaperFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${sanitizedTopic}_`) && 
      file.name.includes('questionPaper')
    );

    if (!questionPaperFile) {
      throw new Error("Could not find the question paper to copy");
    }

    // Find optional answer key and handwritten paper
    const answerKeyFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${sanitizedTopic}_`) && 
      file.name.includes('answerKey')
    );
    
    const handwrittenPaperFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${sanitizedTopic}_`) && 
      file.name.includes('handwrittenPaper')
    );

    // Copy the files with new names for the test
    const timestamp = Date.now();
    const testPrefix = `test_${testId}`;

    // Copy question paper (required)
    const questionPaperExt = questionPaperFile.name.split('.').pop();
    const newQuestionPaperName = `${testPrefix}_${sanitizedTopic}_questionPaper_${timestamp}.${questionPaperExt}`;
    await copyStorageFile(questionPaperFile.name, newQuestionPaperName);
    
    // Copy answer key if it exists
    if (answerKeyFile) {
      const answerKeyExt = answerKeyFile.name.split('.').pop();
      const newAnswerKeyName = `${testPrefix}_${sanitizedTopic}_answerKey_${timestamp}.${answerKeyExt}`;
      await copyStorageFile(answerKeyFile.name, newAnswerKeyName);
    }
    
    // Copy handwritten paper if it exists
    if (handwrittenPaperFile) {
      const handwrittenExt = handwrittenPaperFile.name.split('.').pop();
      const newHandwrittenName = `${testPrefix}_${sanitizedTopic}_handwrittenPaper_${timestamp}.${handwrittenExt}`;
      await copyStorageFile(handwrittenPaperFile.name, newHandwrittenName);
    }

    // Insert records into subject_documents for test files
    await supabase.from('subject_documents').insert({
      subject_id: test.subject_id,
      user_id: user.id,
      file_name: newQuestionPaperName,
      document_type: 'questionPaper',
      document_url: getPublicUrl(newQuestionPaperName).data.publicUrl,
      file_type: questionPaperExt,
      file_size: questionPaperFile.metadata?.size || 0
    });

    // Force a final refresh to ensure storage is updated
    await forceRefreshStorage();

    toast.success("Files assigned to test successfully");
    return true;
  } catch (error: any) {
    console.error('Error assigning files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};
