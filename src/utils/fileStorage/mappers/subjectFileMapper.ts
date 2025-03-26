
import { StorageFile } from "../storageHelpers";

interface SubjectFileMap {
  [key: string]: {
    id: string;
    subject_id: string;
    topic: string;
    question_paper_url?: string;
    answer_key_url?: string;
    handwritten_paper_url?: string | null;
    created_at: string;
  }
}

/**
 * Maps storage files to subject file objects
 * 
 * @param files Array of storage files
 * @param subjectId The subject ID to filter files for
 * @returns Mapped subject files
 */
export const mapSubjectFiles = (files: StorageFile[], subjectId: string): SubjectFileMap => {
  const subjectFilesMap: SubjectFileMap = {};
  
  console.log(`Mapping ${files.length} files for subject ID: ${subjectId}`);
  
  const subjectPrefix = `${subjectId}`;
  
  // Filter for files that match the subject prefix
  const subjectFiles = files.filter(file => file.name.startsWith(subjectPrefix));
  
  console.log(`Found ${subjectFiles.length} files with subject prefix ${subjectPrefix}`);
  
  // Process each file
  for (const file of subjectFiles) {
    // Extract filename without path
    const fileName = file.name.includes('/') 
      ? file.name.split('/').pop() || file.name
      : file.name;
    
    // Extract parts from filename
    const parts = fileName.split('_');
    if (parts.length < 3) continue;
    
    // Extract subject ID and make sure it matches
    const fileSubjectId = parts[0];
    if (fileSubjectId !== subjectId) continue;
    
    // Extract topic name
    const topic = parts[1].replace(/_/g, ' ');
    
    // Create map key
    const mapKey = `${subjectId}_${topic}`;
    
    // Initialize the entry if it doesn't exist
    if (!subjectFilesMap[mapKey]) {
      subjectFilesMap[mapKey] = {
        id: mapKey,
        subject_id: subjectId,
        topic,
        created_at: new Date().toISOString()
      };
    }
    
    // Set the appropriate URL based on file type
    if (fileName.includes('_questionPaper_')) {
      subjectFilesMap[mapKey].question_paper_url = file.publicUrl;
    } else if (fileName.includes('_answerKey_')) {
      subjectFilesMap[mapKey].answer_key_url = file.publicUrl;
    } else if (fileName.includes('_handwrittenPaper_')) {
      subjectFilesMap[mapKey].handwritten_paper_url = file.publicUrl;
    }
  }
  
  console.log(`Mapped ${Object.keys(subjectFilesMap).length} subject file groups`);
  
  return subjectFilesMap;
};
