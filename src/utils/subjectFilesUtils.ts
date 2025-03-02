
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
      // Process files: both direct subject files and test files
      storageData.forEach(file => {
        const parts = file.name.split('_');
        
        if (parts.length < 3) return; // Skip files without proper naming
        
        const filePrefix = parts[0];
        const topic = parts[1];
        
        // Get file type from the filename
        const fileTypePart = parts[2].split('.')[0];
        const fileType = fileTypePart.includes('questionPaper') ? 'questionPaper' : 
                         fileTypePart.includes('answerKey') ? 'answerKey' : 
                         fileTypePart.includes('handwrittenPaper') ? 'handwrittenPaper' : null;
        
        if (!fileType) return; // Skip if not a recognized file type
        
        // Check if it's a subject file or test file
        const isSubjectFile = filePrefix === subjectId;
        const isTestFile = !isSubjectFile;
        
        // For test files, we need to check if they belong to this subject
        if (isTestFile) {
          // Load test information to verify subject relationship
          const checkTestSubject = async () => {
            const { data: testData } = await supabase
              .from('tests')
              .select('subject_id')
              .eq('id', filePrefix)
              .single();
              
            return testData?.subject_id === subjectId;
          };
          
          // We'll process test files separately below
          return;
        }
        
        // Generate a unique key for this file group
        const groupKey = `${filePrefix}_${topic}`;
        
        // Get the public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('files')
          .getPublicUrl(file.name);
        
        // Add or update file in the map
        if (!filesMap.has(groupKey)) {
          filesMap.set(groupKey, {
            id: groupKey,
            subject_id: subjectId,
            topic: topic,
            question_paper_url: fileType === 'questionPaper' ? publicUrl : '',
            answer_key_url: fileType === 'answerKey' ? publicUrl : '',
            handwritten_paper_url: fileType === 'handwrittenPaper' ? publicUrl : null,
            created_at: file.created_at || new Date().toISOString()
          });
        } else {
          const existingFile = filesMap.get(groupKey)!;
          if (fileType === 'questionPaper') {
            existingFile.question_paper_url = publicUrl;
          } else if (fileType === 'answerKey') {
            existingFile.answer_key_url = publicUrl;
          } else if (fileType === 'handwrittenPaper') {
            existingFile.handwritten_paper_url = publicUrl;
          }
          filesMap.set(groupKey, existingFile);
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
        if (parts.length < 3) return; // Skip files without proper naming
        
        const filePrefix = parts[0];
        if (!testIds.includes(filePrefix)) return; // Skip if not a test for this subject
        
        const testId = filePrefix;
        const test = subjectTests.find(t => t.id === testId);
        const topic = parts[1];
        
        // Get file type from the filename
        const fileTypePart = parts[2].split('.')[0];
        const fileType = fileTypePart.includes('questionPaper') ? 'questionPaper' : 
                        fileTypePart.includes('answerKey') ? 'answerKey' : 
                        fileTypePart.includes('handwrittenPaper') ? 'handwrittenPaper' : null;
        
        if (!fileType) return; // Skip if not a recognized file type
        
        // Create two entries:
        // 1. One for the test view with test prefix
        const testGroupKey = `test_${testId}_${topic}`;
        
        // 2. For the subject view with subject prefix
        const subjectGroupKey = `${subjectId}_${topic}`;
        
        // Get the public URL
        const { data: { publicUrl } } = supabase
          .storage
          .from('files')
          .getPublicUrl(file.name);
        
        // Add or update test file in the map
        if (!filesMap.has(testGroupKey)) {
          filesMap.set(testGroupKey, {
            id: testGroupKey,
            subject_id: subjectId,
            topic: `${test?.name || 'Test'}: ${topic}`, // Add test name to topic for clarity
            question_paper_url: fileType === 'questionPaper' ? publicUrl : '',
            answer_key_url: fileType === 'answerKey' ? publicUrl : '',
            handwritten_paper_url: fileType === 'handwrittenPaper' ? publicUrl : null,
            created_at: file.created_at || new Date().toISOString()
          });
        } else {
          const existingFile = filesMap.get(testGroupKey)!;
          if (fileType === 'questionPaper') {
            existingFile.question_paper_url = publicUrl;
          } else if (fileType === 'answerKey') {
            existingFile.answer_key_url = publicUrl;
          } else if (fileType === 'handwrittenPaper') {
            existingFile.handwritten_paper_url = publicUrl;
          }
          filesMap.set(testGroupKey, existingFile);
        }
        
        // Also add to subject view if it doesn't conflict with direct subject files
        if (!filesMap.has(subjectGroupKey)) {
          filesMap.set(subjectGroupKey, {
            id: subjectGroupKey,
            subject_id: subjectId,
            topic: topic, // Just the plain topic for subject view
            question_paper_url: fileType === 'questionPaper' ? publicUrl : '',
            answer_key_url: fileType === 'answerKey' ? publicUrl : '',
            handwritten_paper_url: fileType === 'handwrittenPaper' ? publicUrl : null,
            created_at: file.created_at || new Date().toISOString()
          });
        }
      });
    }
    
    // Filter out incomplete entries
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

// Function to assign existing subject files to a test
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

    // Copy handwritten paper if it exists
    if (handwrittenPaperFile) {
      const handwrittenPaperExt = handwrittenPaperFile.name.split('.').pop();
      const newHandwrittenPaperName = `${testId}_${cleanTopic}_handwrittenPaper_${timestamp}.${handwrittenPaperExt}`;
      
      const { error: copyHPError } = await supabase
        .storage
        .from('files')
        .copy(handwrittenPaperFile.name, newHandwrittenPaperName);
        
      if (copyHPError) {
        console.error('Error copying handwritten paper:', copyHPError);
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
      
      const uploadPromise = supabase.storage
        .from('files')
        .upload(fileName, questionPaper)
        .then(response => {
          if (response.error) throw response.error;
          
          // Also create a subject copy for visibility in subject view
          const subjectFileName = `${subjectId}_${topic}_questionPaper_${timestamp}.${fileExt}`;
          return supabase.storage
            .from('files')
            .copy(fileName, subjectFileName);
        });
        
      uploadPromises.push(uploadPromise);
    }

    // Upload answer key
    if (answerKey) {
      const fileExt = answerKey.name.split('.').pop();
      const fileName = `${testId}_${topic}_answerKey_${timestamp}.${fileExt}`;
      
      const uploadPromise = supabase.storage
        .from('files')
        .upload(fileName, answerKey)
        .then(response => {
          if (response.error) throw response.error;
          
          // Also create a subject copy for visibility in subject view
          const subjectFileName = `${subjectId}_${topic}_answerKey_${timestamp}.${fileExt}`;
          return supabase.storage
            .from('files')
            .copy(fileName, subjectFileName);
        });
        
      uploadPromises.push(uploadPromise);
    }

    // Upload handwritten paper (optional)
    if (handwrittenPaper) {
      const fileExt = handwrittenPaper.name.split('.').pop();
      const fileName = `${testId}_${topic}_handwrittenPaper_${timestamp}.${fileExt}`;
      
      const uploadPromise = supabase.storage
        .from('files')
        .upload(fileName, handwrittenPaper)
        .then(response => {
          if (response.error) throw response.error;
          
          // Also create a subject copy for visibility in subject view
          const subjectFileName = `${subjectId}_${topic}_handwrittenPaper_${timestamp}.${fileExt}`;
          return supabase.storage
            .from('files')
            .copy(fileName, subjectFileName);
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

// Function to delete files by group
export const deleteFileGroup = async (filePrefix: string, topic: string): Promise<boolean> => {
  try {
    // Get all files from storage
    const { data: storageFiles, error: listError } = await supabase
      .storage
      .from('files')
      .list();
        
    if (listError) throw listError;
    
    // Filter files by the group prefix
    const groupPrefix = `${filePrefix}_${topic}_`;
    const filesToDelete = storageFiles?.filter(file => 
      file.name.startsWith(groupPrefix)
    ) || [];
        
    // Delete each file
    for (const file of filesToDelete) {
      const { error: deleteError } = await supabase
        .storage
        .from('files')
        .remove([file.name]);
            
      if (deleteError) throw deleteError;
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
          // Also delete subject copies
          const subjectPrefix = `${testData.subject_id}_${topic}_`;
          const subjectFilesToDelete = storageFiles?.filter(file => 
            file.name.startsWith(subjectPrefix)
          ) || [];
          
          for (const file of subjectFilesToDelete) {
            await supabase.storage.from('files').remove([file.name]);
          }
        }
      }
    }

    toast.success("Files deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting files:", error);
    toast.error("Failed to delete files");
    return false;
  }
};
