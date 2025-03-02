
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
      // Process subject-specific files
      storageData.forEach(file => {
        const parts = file.name.split('_');
        
        // Check for subject-related files (starting with subject ID)
        if (parts.length >= 3 && parts[0] === subjectId) {
          const topic = parts[1];
          // Extract file type correctly - may contain timestamps
          const fileType = parts[2].split('.')[0].split('_')[0]; // Handle format like "questionPaper_123456789.pdf"
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
          const test = subjectTests.find(t => t.id === testId);
          const topic = parts[1];
          // Extract file type correctly - may contain timestamps
          const fileType = parts[2].split('.')[0].split('_')[0]; // Handle format like "questionPaper_123456789.pdf"
          const groupKey = `test_${testId}_${topic}`;
          
          const { data: { publicUrl } } = supabase
            .storage
            .from('files')
            .getPublicUrl(file.name);
          
          if (!filesMap.has(groupKey)) {
            filesMap.set(groupKey, {
              id: groupKey,
              subject_id: subjectId,
              topic: `${test?.name || 'Test'}: ${topic}`, // Add test name to topic for clarity
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

    // Extract the topic from the subjectFile
    // For test files that were assigned from subjects, clean up the topic
    const topicParts = subjectFile.topic.split(': ');
    const cleanTopic = topicParts.length > 1 ? topicParts[1] : subjectFile.topic;

    // Find the original question paper and answer key files
    const subjectPrefix = `${subjectFile.subject_id}_${cleanTopic}_`;
    
    // Use more flexible searching to find files
    const questionPaperFile = storageData?.find(file => 
      file.name.startsWith(subjectPrefix) && file.name.includes('questionPaper')
    );
    
    const answerKeyFile = storageData?.find(file => 
      file.name.startsWith(subjectPrefix) && file.name.includes('answerKey')
    );

    // If we didn't find files with subject prefix, try looking for test files
    // This handles the case where we're copying from a test to another test
    if (!questionPaperFile || !answerKeyFile) {
      const testPrefix = `test_${subjectFile.id.split('_')[1]}_${cleanTopic}_`;
      
      const testQuestionPaperFile = storageData?.find(file => 
        file.name.includes(testPrefix) && file.name.includes('questionPaper')
      );
      
      const testAnswerKeyFile = storageData?.find(file => 
        file.name.includes(testPrefix) && file.name.includes('answerKey')
      );
      
      if (!testQuestionPaperFile || !testAnswerKeyFile) {
        throw new Error("Original files not found");
      }
      
      // Copy the files with new names for the test
      const timestamp = Date.now();
      const questionPaperExt = testQuestionPaperFile.name.split('.').pop();
      const answerKeyExt = testAnswerKeyFile.name.split('.').pop();

      const newQuestionPaperName = `${testId}_${cleanTopic}_questionPaper_${timestamp}.${questionPaperExt}`;
      const newAnswerKeyName = `${testId}_${cleanTopic}_answerKey_${timestamp}.${answerKeyExt}`;

      // Copy question paper
      const { error: copyQPError } = await supabase
        .storage
        .from('files')
        .copy(testQuestionPaperFile.name, newQuestionPaperName);

      if (copyQPError) throw copyQPError;

      // Copy answer key
      const { error: copyAKError } = await supabase
        .storage
        .from('files')
        .copy(testAnswerKeyFile.name, newAnswerKeyName);

      if (copyAKError) throw copyAKError;

      toast.success("Files assigned to test successfully");
      return true;
    }

    // Copy the files with new names for the test
    const timestamp = Date.now();
    const questionPaperExt = questionPaperFile.name.split('.').pop();
    const answerKeyExt = answerKeyFile.name.split('.').pop();

    const newQuestionPaperName = `${testId}_${cleanTopic}_questionPaper_${timestamp}.${questionPaperExt}`;
    const newAnswerKeyName = `${testId}_${cleanTopic}_answerKey_${timestamp}.${answerKeyExt}`;

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
