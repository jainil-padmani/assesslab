
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";
import { getPublicUrl } from "./storageHelpers";

// Map storage files to SubjectFile format for subjects
export const mapSubjectFiles = (
  storageData: any[],
  subjectId: string
): Map<string, SubjectFile> => {
  const filesMap = new Map<string, SubjectFile>();
  
  if (!storageData || !subjectId) return filesMap;
  
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
      // We'll process test files separately with other functions
      return;
    }
    
    // Generate a unique key for this file group
    const groupKey = `${filePrefix}_${topic}`;
    
    // Get the public URL
    const { data: { publicUrl } } = getPublicUrl(file.name);
    
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
  
  return filesMap;
};

// Map test files to the subject system
export const mapTestFilesToSubject = async (
  storageData: any[],
  subjectId: string,
  subjectTests: { id: string, name: string }[],
  filesMap: Map<string, SubjectFile>
): Promise<Map<string, SubjectFile>> => {
  if (!subjectTests || !storageData) return filesMap;
  
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
    const { data: { publicUrl } } = getPublicUrl(file.name);
    
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
  
  return filesMap;
};

// Map test files for a specific test
export const mapTestFiles = (
  storageData: any[],
  testId: string
): Map<string, any> => {
  const filesMap = new Map<string, any>();
  
  if (storageData) {
    storageData.forEach(file => {
      const parts = file.name.split('_');
      if (parts.length >= 3 && parts[0] === testId) {
        const topic = parts[1];
        // Extract file type correctly - handles timestamps
        const fileType = parts[2].split('.')[0].split('_')[0];
        const groupKey = `${testId}_${topic}`;
        
        const { data: { publicUrl } } = getPublicUrl(file.name);
        
        if (!filesMap.has(groupKey)) {
          filesMap.set(groupKey, {
            id: groupKey,
            test_id: testId,
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
      }
    });
  }
  
  return filesMap;
};
