
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";

// Map Storage Files to SubjectFiles
export const mapSubjectFiles = (storageData: any[], subjectId: string): Map<string, SubjectFile> => {
  const filesMap = new Map<string, SubjectFile>();
  
  if (storageData) {
    storageData.forEach(file => {
      const parts = file.name.split('_');
      if (parts.length >= 3 && parts[0] === subjectId) {
        const topic = parts[1];
        const fileType = parts[2].split('.')[0].split('_')[0];
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

// Map Test Files to Subject Files
export const mapTestFilesToSubject = async (
  storageData: any[], 
  subjectId: string, 
  subjectTests: { id: string; name: string; }[],
  filesMap: Map<string, SubjectFile>
): Promise<Map<string, SubjectFile>> => {
  if (storageData && subjectTests) {
    for (const test of subjectTests) {
      storageData.forEach(file => {
        const parts = file.name.split('_');
        if (parts.length >= 3 && parts[0] === test.id) {
          const topic = parts[1];
          const fileType = parts[2].split('.')[0].split('_')[0];
          const groupKey = `${subjectId}_${topic}`;
          
          const { data: { publicUrl } } = supabase
            .storage
            .from('files')
            .getPublicUrl(file.name);
          
          if (!filesMap.has(groupKey)) {
            filesMap.set(groupKey, {
              id: groupKey,
              subject_id: subjectId,
              topic: `${test.name}: ${topic}`,  // Include test name for clarity
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
  }
  
  return filesMap;
};

// Map Storage Files to TestFiles
export const mapTestFiles = (storageData: any[], testId: string) => {
  const filesMap = new Map();
  
  if (storageData) {
    storageData.forEach(file => {
      const parts = file.name.split('_');
      // Only process files that belong to this test
      if (parts.length >= 3 && parts[0] === testId) {
        const topic = parts[1];
        const fileType = file.name.includes('questionPaper') ? 'questionPaper' : 
                         file.name.includes('answerKey') ? 'answerKey' : 
                         file.name.includes('handwrittenPaper') ? 'handwrittenPaper' : null;
        
        if (!fileType) return; // Skip if not a recognized file type
        
        const groupKey = `${testId}_${topic}`;
        
        // Get public URL for the file
        const { data: { publicUrl } } = supabase
          .storage
          .from('files')
          .getPublicUrl(file.name);
        
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
          const existingFile = filesMap.get(groupKey);
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
  
  console.log("Mapped test files:", Array.from(filesMap.values()));
  return filesMap;
};
