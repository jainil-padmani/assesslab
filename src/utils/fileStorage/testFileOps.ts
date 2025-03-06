
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
    
    // Filter out incomplete entries
    const files = Array.from(filesMap.values()).filter(
      file => file.question_paper_url && (questionPaperOnly || file.answer_key_url)
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
  subjectFile: SubjectFile,
  questionPaperOnly: boolean = false
): Promise<boolean> => {
  try {
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
      file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic.replace(/\s+/g, '_')}_`) && 
      file.name.includes('questionPaper')
    );
    
    if (!questionPaperOnly) {
      answerKeyFile = storageData?.find(file => 
        file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic.replace(/\s+/g, '_')}_`) && 
        file.name.includes('answerKey')
      );
      
      handwrittenPaperFile = storageData?.find(file => 
        file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic.replace(/\s+/g, '_')}_`) && 
        file.name.includes('handwrittenPaper')
      );
    }

    // 2. If not found, try with spaces in topic
    if (!questionPaperFile) {
      questionPaperFile = storageData?.find(file => 
        file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
        file.name.includes('questionPaper')
      );
    }
    
    if (!questionPaperOnly && !answerKeyFile) {
      answerKeyFile = storageData?.find(file => 
        file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
        file.name.includes('answerKey')
      );
    }
    
    if (!questionPaperOnly && !handwrittenPaperFile) {
      handwrittenPaperFile = storageData?.find(file => 
        file.name.startsWith(`${subjectFile.subject_id}_${cleanTopic}_`) && 
        file.name.includes('handwrittenPaper')
      );
    }

    // 3. If not found, try looking for test file format
    if (!questionPaperFile || (!questionPaperOnly && !answerKeyFile)) {
      // Extract test ID if present in the ID
      const idParts = subjectFile.id.split(':');
      if (idParts.length > 1) {
        const originalTestId = idParts[1];
        
        questionPaperFile = storageData?.find(file => 
          file.name.startsWith(`test_${originalTestId}_${cleanTopic.replace(/\s+/g, '_')}_`) && 
          file.name.includes('questionPaper')
        );
        
        if (!questionPaperOnly) {
          answerKeyFile = storageData?.find(file => 
            file.name.startsWith(`test_${originalTestId}_${cleanTopic.replace(/\s+/g, '_')}_`) && 
            file.name.includes('answerKey')
          );
          
          handwrittenPaperFile = storageData?.find(file => 
            file.name.startsWith(`test_${originalTestId}_${cleanTopic.replace(/\s+/g, '_')}_`) && 
            file.name.includes('handwrittenPaper')
          );
        }
      }
    }

    // 4. If still not found, try a more general search
    if (!questionPaperFile) {
      questionPaperFile = storageData?.find(file => 
        file.name.includes(`_${cleanTopic.replace(/\s+/g, '_')}_`) && 
        file.name.includes('questionPaper')
      );
      
      if (!questionPaperOnly && !answerKeyFile) {
        answerKeyFile = storageData?.find(file => 
          file.name.includes(`_${cleanTopic.replace(/\s+/g, '_')}_`) && 
          file.name.includes('answerKey')
        );
      }
      
      if (!questionPaperOnly && !handwrittenPaperFile) {
        handwrittenPaperFile = storageData?.find(file => 
          file.name.includes(`_${cleanTopic.replace(/\s+/g, '_')}_`) && 
          file.name.includes('handwrittenPaper')
        );
      }
    }

    // For question paper only mode, we only need to validate the question paper
    if (!questionPaperFile) {
      throw new Error("Could not find the question paper to copy");
    }
    
    // For full mode, we also need to validate the answer key
    if (!questionPaperOnly && !answerKeyFile) {
      throw new Error("Could not find both question paper and answer key to copy");
    }

    // Copy the files with new names for the test
    const timestamp = Date.now();
    const questionPaperExt = questionPaperFile.name.split('.').pop();

    // Create new filenames prefixed with test ID
    const testPrefix = `test_${testId}`;
    const sanitizedTopic = cleanTopic.replace(/\s+/g, '_');
    const newQuestionPaperName = `${testPrefix}_${sanitizedTopic}_questionPaper_${timestamp}.${questionPaperExt}`;

    // Copy question paper
    await copyStorageFile(questionPaperFile.name, newQuestionPaperName);

    // If not in question paper only mode, copy answer key and handwritten paper
    if (!questionPaperOnly && answerKeyFile) {
      const answerKeyExt = answerKeyFile.name.split('.').pop();
      const newAnswerKeyName = `${testPrefix}_${sanitizedTopic}_answerKey_${timestamp}.${answerKeyExt}`;
      await copyStorageFile(answerKeyFile.name, newAnswerKeyName);
      
      // Copy handwritten paper if it exists
      if (handwrittenPaperFile) {
        const handwrittenExt = handwrittenPaperFile.name.split('.').pop();
        const newHandwrittenName = `${testPrefix}_${sanitizedTopic}_handwrittenPaper_${timestamp}.${handwrittenExt}`;
        await copyStorageFile(handwrittenPaperFile.name, newHandwrittenName);
      }
    } else if (questionPaperOnly) {
      // In question paper only mode, we need to create a stub answer key file
      // so the file group will show up properly in the UI
      const newAnswerKeyName = `${testPrefix}_${sanitizedTopic}_answerKey_${timestamp}.txt`;
      
      // We'll just copy the question paper again as the answer key
      // This is a workaround to ensure the file shows up in the UI
      await copyStorageFile(questionPaperFile.name, newAnswerKeyName);
    }

    toast.success(questionPaperOnly 
      ? "Question paper assigned to test successfully" 
      : "Files assigned to test successfully"
    );
    return true;
  } catch (error: any) {
    console.error('Error assigning files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};
