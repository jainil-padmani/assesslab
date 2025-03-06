
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";

// Map Storage Files to SubjectFiles
export const mapSubjectFiles = (storageData: any[], subjectId: string): Map<string, SubjectFile> => {
  const filesMap = new Map<string, SubjectFile>();
  
  if (storageData) {
    // Process files with the original naming pattern
    storageData.forEach(file => {
      // Try to extract meaningful parts from the filename
      const parts = file.name.split('_');
      if (parts.length >= 3 && parts[0] === subjectId) {
        const topic = parts[1];
        const fileTypeInfo = parts.slice(2).join('_'); // Join the rest for more flexible type detection
        
        // Determine file type more flexibly
        const fileType = 
          fileTypeInfo.includes('questionPaper') ? 'questionPaper' : 
          fileTypeInfo.includes('answerKey') ? 'answerKey' : 
          fileTypeInfo.includes('handwrittenPaper') ? 'handwrittenPaper' : null;
          
        if (!fileType) return; // Skip if not a recognized file type
        
        const groupKey = `${subjectId}_${topic}`;
        
        const { data: { publicUrl } } = supabase
          .storage
          .from('files')
          .getPublicUrl(file.name);
        
        if (!filesMap.has(groupKey)) {
          filesMap.set(groupKey, {
            id: groupKey,
            subject_id: subjectId,
            topic: topic.replace(/_/g, ' '), // Convert underscores back to spaces for display
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
  
  // Filter out files that don't have at least a question paper
  return new Map(
    Array.from(filesMap.entries())
      .filter(([_, file]) => file.question_paper_url)
  );
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
        // Handle test file naming patterns
        if (file.name.startsWith(`test_${test.id}_`)) {
          const parts = file.name.split('_');
          if (parts.length >= 4) {
            const topic = parts[2];
            const fileTypeInfo = parts.slice(3).join('_');
            
            // More flexible file type detection
            const fileType = 
              fileTypeInfo.includes('questionPaper') ? 'questionPaper' : 
              fileTypeInfo.includes('answerKey') ? 'answerKey' : 
              fileTypeInfo.includes('handwrittenPaper') ? 'handwrittenPaper' : null;
              
            if (!fileType) return; // Skip if not a recognized file type
            
            const groupKey = `${subjectId}_${topic}`;
            
            const { data: { publicUrl } } = supabase
              .storage
              .from('files')
              .getPublicUrl(file.name);
            
            if (!filesMap.has(groupKey)) {
              filesMap.set(groupKey, {
                id: `${test.id}:${groupKey}`, // Include test ID in the ID for reference
                subject_id: subjectId,
                topic: `${test.name}: ${topic.replace(/_/g, ' ')}`,  // Include test name for clarity
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
        }
      });
    }
  }
  
  // Filter to include files with at least a question paper
  return new Map(
    Array.from(filesMap.entries())
      .filter(([_, file]) => file.question_paper_url)
  );
};

// Map Storage Files to TestFiles
export const mapTestFiles = (storageData: any[], testId: string) => {
  const filesMap = new Map();
  
  if (storageData) {
    storageData.forEach(file => {
      // Only process files that belong to this test with our expected format
      if (file.name.startsWith(`test_${testId}_`)) {
        const parts = file.name.split('_');
        if (parts.length >= 4) {
          const topic = parts[2];
          const fileTypeInfo = parts.slice(3).join('_');
          
          // More flexible file type detection
          const fileType = 
            fileTypeInfo.includes('questionPaper') ? 'questionPaper' : 
            fileTypeInfo.includes('answerKey') ? 'answerKey' : 
            fileTypeInfo.includes('handwrittenPaper') ? 'handwrittenPaper' : null;
            
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
              topic: topic.replace(/_/g, ' '), // Convert underscores back to spaces for display
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
      }
    });
  }
  
  // Filter to include only files with at least a question paper
  return new Map(
    Array.from(filesMap.entries())
      .filter(([_, file]) => file.question_paper_url)
  );
};
