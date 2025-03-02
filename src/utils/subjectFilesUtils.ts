
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";

export const fetchSubjectFiles = async (subjectId: string): Promise<SubjectFile[]> => {
  try {
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('files')
      .list();

    if (storageError) throw storageError;

    const filesMap = new Map<string, SubjectFile>();
    
    if (storageData && subjectId) {
      storageData.forEach(file => {
        const parts = file.name.split('_');
        
        // Check for subject-related files (starting with subject ID)
        if (parts.length >= 3 && parts[0] === subjectId) {
          const topic = parts[1];
          const fileType = parts[2].split('.')[0];
          const groupKey = `${subjectId}_${topic}`;
          
          const { data: { publicUrl } } = supabase
            .storage
            .from('files')
            .getPublicUrl(file.name);
          
          if (!filesMap.has(groupKey)) {
            filesMap.set(groupKey, {
              id: groupKey,
              subject_id: subjectId,
              topic: topic,
              question_paper_url: fileType === 'questionPaper' ? publicUrl : '',
              answer_key_url: fileType === 'answerKey' ? publicUrl : '',
              created_at: file.created_at || new Date().toISOString()
            });
          } else {
            const existingFile = filesMap.get(groupKey)!;
            if (fileType === 'questionPaper') {
              existingFile.question_paper_url = publicUrl;
            } else if (fileType === 'answerKey') {
              existingFile.answer_key_url = publicUrl;
            }
            filesMap.set(groupKey, existingFile);
          }
        }
      });
    }
    
    // Get all tests for this subject to include their files too
    const { data: subjectTests, error: testsError } = await supabase
      .from('tests')
      .select('id, name')
      .eq('subject_id', subjectId);
      
    if (testsError) throw testsError;
    
    // Now process test files for this subject
    if (subjectTests && storageData) {
      const testIds = subjectTests.map(test => test.id);
      
      storageData.forEach(file => {
        const parts = file.name.split('_');
        if (parts.length >= 3 && testIds.includes(parts[0])) {
          const testId = parts[0];
          const topic = parts[1];
          const fileType = parts[2].split('.')[0];
          const groupKey = `test_${testId}_${topic}`;
          
          const { data: { publicUrl } } = supabase
            .storage
            .from('files')
            .getPublicUrl(file.name);
          
          if (!filesMap.has(groupKey)) {
            filesMap.set(groupKey, {
              id: groupKey,
              subject_id: subjectId,
              topic: topic,
              question_paper_url: fileType === 'questionPaper' ? publicUrl : '',
              answer_key_url: fileType === 'answerKey' ? publicUrl : '',
              created_at: file.created_at || new Date().toISOString()
            });
          } else {
            const existingFile = filesMap.get(groupKey)!;
            if (fileType === 'questionPaper') {
              existingFile.question_paper_url = publicUrl;
            } else if (fileType === 'answerKey') {
              existingFile.answer_key_url = publicUrl;
            }
            filesMap.set(groupKey, existingFile);
          }
        }
      });
    }
    
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

// New function to assign existing subject files to a test
export const assignSubjectFilesToTest = async (
  testId: string,
  subjectFile: SubjectFile
): Promise<boolean> => {
  try {
    // First, fetch the original file names from storage
    const { data: storageData, error: storageError } = await supabase
      .storage
      .from('files')
      .list();

    if (storageError) throw storageError;

    // Find the original question paper and answer key files
    const subjectPrefix = `${subjectFile.subject_id}_${subjectFile.topic}_`;
    const questionPaperFile = storageData?.find(file => 
      file.name.startsWith(subjectPrefix) && file.name.includes('_questionPaper_')
    );
    
    const answerKeyFile = storageData?.find(file => 
      file.name.startsWith(subjectPrefix) && file.name.includes('_answerKey_')
    );

    if (!questionPaperFile || !answerKeyFile) {
      throw new Error("Original files not found");
    }

    // Copy the files with new names for the test
    const timestamp = Date.now();
    const questionPaperExt = questionPaperFile.name.split('.').pop();
    const answerKeyExt = answerKeyFile.name.split('.').pop();

    const newQuestionPaperName = `${testId}_${subjectFile.topic}_questionPaper_${timestamp}.${questionPaperExt}`;
    const newAnswerKeyName = `${testId}_${subjectFile.topic}_answerKey_${timestamp}.${answerKeyExt}`;

    // Copy question paper
    const { error: copyQPError } = await supabase
      .storage
      .from('files')
      .copy(questionPaperFile.name, newQuestionPaperName);

    if (copyQPError) throw copyQPError;

    // Copy answer key
    const { error: copyAKError } = await supabase
      .storage
      .from('files')
      .copy(answerKeyFile.name, newAnswerKeyName);

    if (copyAKError) throw copyAKError;

    toast.success("Files assigned to test successfully");
    return true;
  } catch (error: any) {
    console.error('Error assigning files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};
