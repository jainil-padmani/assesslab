
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
 * Maps test files to subject file objects
 * 
 * @param files Array of storage files
 * @param subjectId The subject ID
 * @param subjectTests Array of test objects belonging to the subject
 * @param existingMap Existing subject file map to merge with
 * @returns Updated subject file map
 */
export const mapTestFilesToSubject = async (
  files: StorageFile[], 
  subjectId: string, 
  subjectTests: { id: string, name: string }[],
  existingMap: SubjectFileMap
): Promise<SubjectFileMap> => {
  const combinedMap = { ...existingMap };
  
  console.log(`Mapping test files for ${subjectTests.length} tests in subject ${subjectId}`);
  
  // Process each test's files
  for (const test of subjectTests) {
    const testPrefix = `test_${test.id}`;
    
    // Filter for files that match this test prefix
    const testFiles = files.filter(file => 
      file.name.startsWith(testPrefix) || 
      file.name.includes(`/${testPrefix}_`)
    );
    
    console.log(`Found ${testFiles.length} files for test ID: ${test.id}`);
    
    // Process each file
    for (const file of testFiles) {
      // Extract filename without path
      const fileName = file.name.includes('/') 
        ? file.name.split('/').pop() || file.name
        : file.name;
      
      // Extract parts from filename
      const parts = fileName.split('_');
      if (parts.length < 4) continue;
      
      // Extract test ID and make sure it matches
      const fileTestId = parts[1];
      if (fileTestId !== test.id) continue;
      
      // Extract topic from filename (handling potential underscores in topic)
      const typeIndex = Math.max(
        fileName.lastIndexOf('_questionPaper_'),
        fileName.lastIndexOf('_answerKey_'),
        fileName.lastIndexOf('_handwrittenPaper_')
      );
      
      if (typeIndex === -1) continue;
      
      // Extract topic
      const topicStart = testPrefix.length + 1; // +1 for the underscore
      const topic = fileName.substring(topicStart, typeIndex).replace(/_/g, ' ').trim();
      
      // Create map key using subject ID and topic
      const mapKey = `${subjectId}_${topic}`;
      
      // Initialize the entry if it doesn't exist
      if (!combinedMap[mapKey]) {
        combinedMap[mapKey] = {
          id: mapKey,
          subject_id: subjectId,
          topic,
          created_at: new Date().toISOString()
        };
      }
      
      // Set the appropriate URL based on file type
      if (fileName.includes('_questionPaper_')) {
        combinedMap[mapKey].question_paper_url = file.publicUrl;
      } else if (fileName.includes('_answerKey_')) {
        combinedMap[mapKey].answer_key_url = file.publicUrl;
      } else if (fileName.includes('_handwrittenPaper_')) {
        combinedMap[mapKey].handwritten_paper_url = file.publicUrl;
      }
    }
  }
  
  return combinedMap;
};
