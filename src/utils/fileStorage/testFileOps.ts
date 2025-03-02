
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";
import { 
  listStorageFiles, 
  uploadStorageFile,
  copyStorageFile 
} from "./storageHelpers";
import { mapTestFiles } from "./fileMappers";

// Function to fetch test files
export const fetchTestFiles = async (testId: string): Promise<any[]> => {
  try {
    const storageData = await listStorageFiles();
    
    const filesMap = mapTestFiles(storageData, testId);
    
    const files = Array.from(filesMap.values()).filter(
      file => file.question_paper_url && file.answer_key_url
    );
    
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
    let handwrittenPaperFile = null;

    // 1. First try with exact subject_id prefix
    questionPaperFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
      file.name.includes('questionPaper')
    );
    
    answerKeyFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
      file.name.includes('answerKey')
    );

    // Optional handwritten paper
    handwrittenPaperFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
      file.name.includes('handwrittenPaper')
    );

    // 2. If not found, try looking for test file format
    if (!questionPaperFile || !answerKeyFile) {
      // Extract test ID if present in the ID
      const idParts = subjectFile.id.split('_');
      if (idParts.length > 1 && idParts[0] === 'test') {
        const originalTestId = idParts[1];
        
        questionPaperFile = storageData?.find(file => 
          file.name.startsWith(`${originalTestId}_${cleanTopic}_`) && 
          file.name.includes('questionPaper')
        );
        
        answerKeyFile = storageData?.find(file => 
          file.name.startsWith(`${originalTestId}_${cleanTopic}_`) && 
          file.name.includes('answerKey')
        );

        handwrittenPaperFile = storageData?.find(file => 
          file.name.startsWith(`${originalTestId}_${cleanTopic}_`) && 
          file.name.includes('handwrittenPaper')
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

      handwrittenPaperFile = storageData?.find(file => 
        file.name.includes(`_${cleanTopic}_`) && 
        file.name.includes('handwrittenPaper')
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

    // Copy handwritten paper if it exists
    if (handwrittenPaperFile) {
      const handwrittenPaperExt = handwrittenPaperFile.name.split('.').pop();
      const newHandwrittenPaperName = `${testId}_${cleanTopic}_handwrittenPaper_${timestamp}.${handwrittenPaperExt}`;
      
      try {
        await copyStorageFile(handwrittenPaperFile.name, newHandwrittenPaperName);
      } catch (copyError) {
        console.error('Error copying handwritten paper:', copyError);
        // Non-critical error, continue without failing
      }
    }

    toast.success("Files assigned to test successfully");
    return true;
  } catch (error: any) {
    console.error('Error assigning files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};

// Function to upload new test files
export const uploadTestFiles = async (
  testId: string,
  subjectId: string,
  topic: string,
  questionPaper: File | null,
  answerKey: File | null,
  handwrittenPaper: File | null
): Promise<boolean> => {
  if (!testId || !topic || !questionPaper || !answerKey) {
    toast.error("Required files or information missing");
    return false;
  }

  try {
    const timestamp = Date.now();
    const uploadPromises = [];

    // Upload question paper
    if (questionPaper) {
      const fileExt = questionPaper.name.split('.').pop();
      const fileName = `${testId}_${topic}_questionPaper_${timestamp}.${fileExt}`;
      
      const uploadPromise = uploadStorageFile(fileName, questionPaper)
        .then(() => {
          // Also create a subject copy for visibility in subject view
          const subjectFileName = `${subjectId}_${topic}_questionPaper_${timestamp}.${fileExt}`;
          return copyStorageFile(fileName, subjectFileName);
        });
        
      uploadPromises.push(uploadPromise);
    }

    // Upload answer key
    if (answerKey) {
      const fileExt = answerKey.name.split('.').pop();
      const fileName = `${testId}_${topic}_answerKey_${timestamp}.${fileExt}`;
      
      const uploadPromise = uploadStorageFile(fileName, answerKey)
        .then(() => {
          // Also create a subject copy for visibility in subject view
          const subjectFileName = `${subjectId}_${topic}_answerKey_${timestamp}.${fileExt}`;
          return copyStorageFile(fileName, subjectFileName);
        });
        
      uploadPromises.push(uploadPromise);
    }

    // Upload handwritten paper (optional)
    if (handwrittenPaper) {
      const fileExt = handwrittenPaper.name.split('.').pop();
      const fileName = `${testId}_${topic}_handwrittenPaper_${timestamp}.${fileExt}`;
      
      const uploadPromise = uploadStorageFile(fileName, handwrittenPaper)
        .then(() => {
          // Also create a subject copy for visibility in subject view
          const subjectFileName = `${subjectId}_${topic}_handwrittenPaper_${timestamp}.${fileExt}`;
          return copyStorageFile(fileName, subjectFileName);
        });
        
      uploadPromises.push(uploadPromise);
    }

    // Wait for all uploads to complete
    await Promise.all(uploadPromises);

    toast.success("Test files uploaded successfully");
    return true;
  } catch (error: any) {
    console.error("Error uploading test files:", error);
    toast.error(`Failed to upload test files: ${error.message}`);
    return false;
  }
};
