
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

    // First, fetch the original file names from storage
    const storageData = await listStorageFiles();

    // Extract the topic from the subjectFile
    // For test files that were assigned from subjects, clean up the topic
    const topicParts = subjectFile.topic.split(': ');
    const cleanTopic = topicParts.length > 1 ? topicParts[1] : subjectFile.topic;
    const sanitizedTopic = cleanTopic.replace(/\s+/g, '_');

    console.log('Looking for files for topic:', cleanTopic, 'sanitized as:', sanitizedTopic);

    // Try multiple strategies to find the files
    let questionPaperFile = null;
    let answerKeyFile = null;
    let handwrittenPaperFile = null;

    // 1. First try with exact subject_id prefix and sanitized topic
    questionPaperFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${sanitizedTopic}_`) && 
      file.name.includes('questionPaper')
    );
    
    // Answer key is now optional
    answerKeyFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${sanitizedTopic}_`) && 
      file.name.includes('answerKey')
    );
    
    handwrittenPaperFile = storageData?.find(file => 
      file.name.startsWith(`${subjectFile.subject_id}_${sanitizedTopic}_`) && 
      file.name.includes('handwrittenPaper')
    );

    // 2. If not found, try with original spaces in topic
    if (!questionPaperFile) {
      questionPaperFile = storageData?.find(file => 
        file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
        file.name.includes('questionPaper')
      );
    }
    
    if (!answerKeyFile) {
      answerKeyFile = storageData?.find(file => 
        file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
        file.name.includes('answerKey')
      );
    }
    
    if (!handwrittenPaperFile) {
      handwrittenPaperFile = storageData?.find(file => 
        file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
        file.name.includes('handwrittenPaper')
      );
    }

    // 3. If not found, try looking for test file format
    if (!questionPaperFile) {
      // Extract test ID if present in the ID
      const idParts = subjectFile.id.split(':');
      if (idParts.length > 1) {
        const originalTestId = idParts[1];
        
        questionPaperFile = storageData?.find(file => 
          file.name.startsWith(`test_${originalTestId}_${sanitizedTopic}_`) && 
          file.name.includes('questionPaper')
        );
        
        if (!answerKeyFile) {
          answerKeyFile = storageData?.find(file => 
            file.name.startsWith(`test_${originalTestId}_${sanitizedTopic}_`) && 
            file.name.includes('answerKey')
          );
        }
        
        if (!handwrittenPaperFile) {
          handwrittenPaperFile = storageData?.find(file => 
            file.name.startsWith(`test_${originalTestId}_${sanitizedTopic}_`) && 
            file.name.includes('handwrittenPaper')
          );
        }
      }
    }

    // 4. If still not found, try a more general search
    if (!questionPaperFile) {
      questionPaperFile = storageData?.find(file => 
        file.name.includes(`_${sanitizedTopic}_`) && 
        file.name.includes('questionPaper')
      );
      
      if (!answerKeyFile) {
        answerKeyFile = storageData?.find(file => 
          file.name.includes(`_${sanitizedTopic}_`) && 
          file.name.includes('answerKey')
        );
      }
      
      if (!handwrittenPaperFile) {
        handwrittenPaperFile = storageData?.find(file => 
          file.name.includes(`_${sanitizedTopic}_`) && 
          file.name.includes('handwrittenPaper')
        );
      }
    }

    // Now only require question paper
    if (!questionPaperFile) {
      throw new Error("Could not find the question paper to copy");
    }
    
    console.log('Found files to copy:', {
      questionPaper: questionPaperFile?.name,
      answerKey: answerKeyFile?.name,
      handwrittenPaper: handwrittenPaperFile?.name
    });

    // Copy the files with new names for the test
    const timestamp = Date.now();
    const questionPaperExt = questionPaperFile.name.split('.').pop();

    // Create new filenames prefixed with test ID
    const testPrefix = `test_${testId}`;
    const newQuestionPaperName = `${testPrefix}_${sanitizedTopic}_questionPaper_${timestamp}.${questionPaperExt}`;
    
    // Copy question paper
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
