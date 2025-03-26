
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

// Cache for storageData to avoid constant fetches
let storageDataCache = null;
let lastFetchTime = 0;
const CACHE_EXPIRY = 30000; // 30 seconds

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
    
    // Filter to include files with at least a question paper and answer key
    const files = Array.from(filesMap.values()).filter(
      file => file.question_paper_url && file.answer_key_url
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
    
    // Validate both question paper and answer key are present
    if (!questionPaperUrl) {
      throw new Error("Question paper URL is missing");
    }
    
    if (!answerKeyUrl) {
      throw new Error("Answer key URL is missing - this is now required");
    }
    
    // Extract filenames from URLs
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
    const answerKeyFileName = extractFilenameFromUrl(answerKeyUrl);
    console.log("Extracted question paper filename:", questionPaperFileName);
    console.log("Extracted answer key filename:", answerKeyFileName);
    
    // Create new filenames for test copies
    const timestamp = Date.now();
    const testPrefix = `test_${testId}`;
    
    // Determine file extensions
    const getFileExtension = (filename: string): string => {
      const parts = filename.split('.');
      return parts.length > 1 ? parts[parts.length - 1] : 'pdf';
    };
    
    const questionPaperExt = getFileExtension(questionPaperFileName);
    const answerKeyExt = getFileExtension(answerKeyFileName);
    
    // Create new filenames
    const sanitizedTopic = topic.replace(/\s+/g, '_');
    const newQuestionPaperName = `${testPrefix}_${sanitizedTopic}_questionPaper_${timestamp}.${questionPaperExt}`;
    const newAnswerKeyName = `${testPrefix}_${sanitizedTopic}_answerKey_${timestamp}.${answerKeyExt}`;
    
    console.log("Copying question paper to:", newQuestionPaperName);
    console.log("Copying answer key to:", newAnswerKeyName);
    
    // Copy question paper (required)
    await copyStorageFile(questionPaperFileName, newQuestionPaperName);
    
    // Copy answer key (now required)
    await copyStorageFile(answerKeyFileName, newAnswerKeyName);
    
    // Copy handwritten paper if it exists
    if (subjectFile.handwritten_paper_url) {
      const handwrittenFileName = extractFilenameFromUrl(subjectFile.handwritten_paper_url);
      const handwrittenExt = getFileExtension(handwrittenFileName);
      const newHandwrittenName = `${testPrefix}_${sanitizedTopic}_handwrittenPaper_${timestamp}.${handwrittenExt}`;
      await copyStorageFile(handwrittenFileName, newHandwrittenName);
    }

    // Insert records into subject_documents for test files
    await supabase.from('subject_documents').insert([
      {
        subject_id: test.subject_id,
        user_id: user.id,
        file_name: newQuestionPaperName,
        document_type: 'questionPaper',
        document_url: getPublicUrl(newQuestionPaperName).data.publicUrl,
        file_type: questionPaperExt,
        file_size: 0 // We don't have the actual file size here
      },
      {
        subject_id: test.subject_id,
        user_id: user.id,
        file_name: newAnswerKeyName,
        document_type: 'answerKey',
        document_url: getPublicUrl(newAnswerKeyName).data.publicUrl,
        file_type: answerKeyExt,
        file_size: 0 // We don't have the actual file size here
      }
    ]);

    // Force a final refresh to ensure storage is updated
    await forceRefreshStorage();

    // Clear storage cache to force refetch
    storageDataCache = null;
    
    return true;
  } catch (error: any) {
    console.error('Error assigning files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};
