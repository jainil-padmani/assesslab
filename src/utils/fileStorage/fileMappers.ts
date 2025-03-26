
import type { SubjectFile } from "@/types/dashboard";
import { getPublicUrl } from "./storageHelpers";

export const mapSubjectFiles = (storageData: any[], subjectId: string): Map<string, SubjectFile> => {
  const filesMap = new Map<string, SubjectFile>();
  
  if (!storageData) return filesMap;
  
  for (const file of storageData) {
    const fileName = file.name;
    const parts = fileName.split('_');
    
    if (parts.length < 3 || parts[0] !== subjectId) continue;
    
    const topic = parts[1];
    const groupKey = `${subjectId}_${topic}`;
    
    if (!filesMap.has(groupKey)) {
      filesMap.set(groupKey, {
        id: groupKey,
        subject_id: subjectId,
        topic: topic.replace(/_/g, ' '),
        question_paper_url: '',
        answer_key_url: '',
        handwritten_paper_url: null,
        created_at: file.created_at || new Date().toISOString()
      });
    }
    
    const { data: { publicUrl } } = getPublicUrl(fileName);
    const currentFile = filesMap.get(groupKey)!;
    
    if (fileName.includes('questionPaper')) {
      currentFile.question_paper_url = publicUrl;
    } else if (fileName.includes('answerKey')) {
      currentFile.answer_key_url = publicUrl;
    } else if (fileName.includes('handwrittenPaper')) {
      currentFile.handwritten_paper_url = publicUrl;
    }
  }
  
  return filesMap;
};

export const mapTestFiles = (storageData: any[], testId: string): Map<string, any> => {
  const filesMap = new Map();
  const testPrefix = `test_${testId}`;
  
  if (!storageData) return filesMap;
  
  for (const file of storageData) {
    const fileName = file.name;
    const parts = fileName.split('_');
    
    if (parts.length < 3 || !fileName.startsWith(testPrefix)) continue;
    
    const topic = parts[2];
    const groupKey = `${testPrefix}_${topic}`;
    
    if (!filesMap.has(groupKey)) {
      filesMap.set(groupKey, {
        id: groupKey,
        test_id: testId,
        topic: topic.replace(/_/g, ' '),
        question_paper_url: '',
        answer_key_url: '',
        handwritten_paper_url: null,
        created_at: file.created_at || new Date().toISOString()
      });
    }
    
    const { data: { publicUrl } } = getPublicUrl(fileName);
    const currentFile = filesMap.get(groupKey);
    
    if (fileName.includes('questionPaper')) {
      currentFile.question_paper_url = publicUrl;
    } else if (fileName.includes('answerKey')) {
      currentFile.answer_key_url = publicUrl;
    } else if (fileName.includes('handwrittenPaper')) {
      currentFile.handwritten_paper_url = publicUrl;
    }
  }
  
  return filesMap;
};

// Add the missing mapper function for subject-test files relationship
export const mapTestFilesToSubject = async (storageData: any[], subjectId: string, tests: any[], existingMap: Map<string, SubjectFile>): Promise<Map<string, SubjectFile>> => {
  // Create a copy of the existing map to avoid mutation issues
  const filesMap = new Map<string, SubjectFile>(existingMap);
  
  if (!storageData || !tests || tests.length === 0) return filesMap;
  
  // Process each test associated with this subject
  for (const test of tests) {
    const testId = test.id;
    const testPrefix = `test_${testId}`;
    
    // Find files for this test
    for (const file of storageData) {
      const fileName = file.name;
      
      if (!fileName.startsWith(testPrefix)) continue;
      
      const parts = fileName.split('_');
      if (parts.length < 3) continue;
      
      const topic = parts[2];
      const groupKey = `${testPrefix}_${topic}`;
      
      // Add to map if not already present
      if (!filesMap.has(groupKey)) {
        filesMap.set(groupKey, {
          id: groupKey,
          subject_id: subjectId,
          topic: `${test.name}: ${topic.replace(/_/g, ' ')}`,
          question_paper_url: '',
          answer_key_url: '',
          handwritten_paper_url: null,
          created_at: file.created_at || new Date().toISOString()
        });
      }
      
      const { data: { publicUrl } } = getPublicUrl(fileName);
      const currentFile = filesMap.get(groupKey)!;
      
      if (fileName.includes('questionPaper')) {
        currentFile.question_paper_url = publicUrl;
      } else if (fileName.includes('answerKey')) {
        currentFile.answer_key_url = publicUrl;
      } else if (fileName.includes('handwrittenPaper')) {
        currentFile.handwritten_paper_url = publicUrl;
      }
    }
  }
  
  return filesMap;
};
