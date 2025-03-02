
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";
import { 
  listStorageFiles, 
  copyStorageFile,
  getPublicUrl 
} from "./storageHelpers";
import { mapTestFiles } from "./fileMappers";

// Function to fetch test files
export const fetchTestFiles = async (testId: string): Promise<any[]> => {
  try {
    // Get all files from storage
    const storageData = await listStorageFiles();

    // Map the files to test files
    const filesMap = mapTestFiles(storageData, testId);
    
    // Filter out incomplete entries
    const files = Array.from(filesMap.values()).filter(
      file => file.question_paper_url && file.answer_key_url
    );
    
    console.log("Fetched test files:", files);
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
    // First, fetch the original file names from storage
    const storageData = await listStorageFiles();

    // Extract the topic from the subjectFile
    // For test files that were assigned from subjects, clean up the topic
    const topicParts = subjectFile.topic.split(': ');
    const cleanTopic = topicParts.length > 1 ? topicParts[1] : subjectFile.topic;

    // Try multiple strategies to find the files
    let questionPaperFile = null;
    let answerKeyFile = null;

    // 1. First try with exact subject_id prefix
    questionPaperFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
      file.name.includes('questionPaper')
    );
    
    answerKeyFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
      file.name.includes('answerKey')
    );

    // 2. If not found, try looking for test file format
    if (!questionPaperFile || !answerKeyFile) {
      // Extract test ID if present in the ID
      const idParts = subjectFile.id.split(':');
      if (idParts.length > 1) {
        const originalTestId = idParts[1];
        
        questionPaperFile = storageData?.find(file => 
          file.name.startsWith(`${originalTestId}_${cleanTopic}_`) && 
          file.name.includes('questionPaper')
        );
        
        answerKeyFile = storageData?.find(file => 
          file.name.startsWith(`${originalTestId}_${cleanTopic}_`) && 
          file.name.includes('answerKey')
        );
      }
    }

    // 3. If still not found, try a more general search
    if (!questionPaperFile || !answerKeyFile) {
      questionPaperFile = storageData?.find(file => 
        file.name.includes(`_${cleanTopic}_`) && 
        file.name.includes('questionPaper')
      );
      
      answerKeyFile = storageData?.find(file => 
        file.name.includes(`_${cleanTopic}_`) && 
        file.name.includes('answerKey')
      );
    }

    if (!questionPaperFile || !answerKeyFile) {
      throw new Error("Could not find the original files to copy");
    }

    // Copy the files with new names for the test
    const timestamp = Date.now();
    const questionPaperExt = questionPaperFile.name.split('.').pop();
    const answerKeyExt = answerKeyFile.name.split('.').pop();

    // Create new filenames prefixed with test ID
    const newQuestionPaperName = `${testId}_${cleanTopic}_questionPaper_${timestamp}.${questionPaperExt}`;
    const newAnswerKeyName = `${testId}_${cleanTopic}_answerKey_${timestamp}.${answerKeyExt}`;

    // Copy question paper
    await copyStorageFile(questionPaperFile.name, newQuestionPaperName);

    // Copy answer key
    await copyStorageFile(answerKeyFile.name, newAnswerKeyName);

    toast.success("Files assigned to test successfully");
    return true;
  } catch (error: any) {
    console.error('Error assigning files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};
