
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

    // Extract topic and sanitize it for use in filenames
    const topic = subjectFile.topic.replace(/\s+/g, '_');
    
    // Log the actual filenames we're looking for to help with debugging
    console.log("Looking for subject files with pattern:", 
      `${subjectFile.subject_id}_${topic}_questionPaper`);
    
    // Get direct file URLs from the SubjectFile object
    const questionPaperUrl = subjectFile.question_paper_url;
    const answerKeyUrl = subjectFile.answer_key_url;
    const handwrittenPaperUrl = subjectFile.handwritten_paper_url;
    
    // Extract filenames from URLs
    if (!questionPaperUrl) {
      throw new Error("Question paper URL is missing");
    }
    
    // Extract filename from URL
    const extractFilenameFromUrl = (url: string): string => {
      try {
        const urlObj = new URL(url);
        const pathParts = urlObj.pathname.split('/');
        // Get the last part of the path which should be the filename
        const fileName = pathParts[pathParts.length - 1];
        // URL decode it to handle spaces and special characters
        return decodeURIComponent(fileName);
      } catch (e) {
        console.error("Failed to extract filename from URL:", url, e);
        throw new Error("Invalid file URL format");
      }
    };
    
    const questionPaperFileName = extractFilenameFromUrl(questionPaperUrl);
    console.log("Extracted question paper filename:", questionPaperFileName);
    
    // Create new filenames for test copies
    const timestamp = Date.now();
    const testPrefix = `test_${testId}`;
    
    // Determine file extensions
    const getFileExtension = (filename: string): string => {
      const parts = filename.split('.');
      return parts.length > 1 ? parts[parts.length - 1] : 'pdf';
    };
    
    const questionPaperExt = getFileExtension(questionPaperFileName);
    
    // Create new filenames
    const sanitizedTopic = topic.replace(/\s+/g, '_');
    const newQuestionPaperName = `${testPrefix}_${sanitizedTopic}_questionPaper_${timestamp}.${questionPaperExt}`;
    
    // Copy question paper (required)
    await copyStorageFile(questionPaperFileName, newQuestionPaperName);
    
    // Copy answer key if it exists
    if (answerKeyUrl) {
      const answerKeyFileName = extractFilenameFromUrl(answerKeyUrl);
      const answerKeyExt = getFileExtension(answerKeyFileName);
      const newAnswerKeyName = `${testPrefix}_${sanitizedTopic}_answerKey_${timestamp}.${answerKeyExt}`;
      await copyStorageFile(answerKeyFileName, newAnswerKeyName);
    }
    
    // Copy handwritten paper if it exists
    if (handwrittenPaperUrl) {
      const handwrittenFileName = extractFilenameFromUrl(handwrittenPaperUrl);
      const handwrittenExt = getFileExtension(handwrittenFileName);
      const newHandwrittenName = `${testPrefix}_${sanitizedTopic}_handwrittenPaper_${timestamp}.${handwrittenExt}`;
      await copyStorageFile(handwrittenFileName, newHandwrittenName);
    }

    // Insert records into subject_documents for test files
    await supabase.from('subject_documents').insert({
      subject_id: test.subject_id,
      user_id: user.id,
      file_name: newQuestionPaperName,
      document_type: 'questionPaper',
      document_url: getPublicUrl(newQuestionPaperName).data.publicUrl,
      file_type: questionPaperExt,
      file_size: 0 // We don't have the actual file size here
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
