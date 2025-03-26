import { StorageFile } from "./storageHelpers";

interface TestFileMap {
  [key: string]: {
    id: string;
    test_id: string;
    topic: string;
    question_paper_url: string;
    answer_key_url?: string;
    handwritten_paper_url?: string | null;
    created_at: string;
  }
}

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

export const mapTestFiles = (files: StorageFile[], testId: string): TestFileMap => {
  const testFilesMap: TestFileMap = {};
  
  console.log(`Mapping ${files.length} files for test ID: ${testId}`);
  
  const testPrefix = `test_${testId}`;
  
  // Filter for files that match the test prefix
  const testFiles = files.filter(file => 
    file.name.startsWith(testPrefix) || 
    file.name.includes(`/${testPrefix}_`)
  );
  
  console.log(`Found ${testFiles.length} files with test prefix ${testPrefix}`);
  
  // Process each file
  for (const file of testFiles) {
    // Extract filename without path
    const fileName = file.name.includes('/') 
      ? file.name.split('/').pop() || file.name
      : file.name;
    
    // Extract parts from filename 
    // Format: test_<testId>_<topic>_<type>_<timestamp>.<ext>
    const parts = fileName.split('_');
    if (parts.length < 4) continue;
    
    // Extract test ID and make sure it matches
    const fileTestId = parts[1];
    if (fileTestId !== testId) continue;
    
    // Extract topic name (may contain multiple parts)
    // We need to account for the fact that the topic itself might contain underscores
    // The format is: test_<testId>_<topic>_<type>_<timestamp>.<ext>
    // So we need to extract everything between the testId and the type
    const typeIndex = Math.max(
      fileName.lastIndexOf('_questionPaper_'),
      fileName.lastIndexOf('_answerKey_'),
      fileName.lastIndexOf('_handwrittenPaper_')
    );
    
    if (typeIndex === -1) continue;
    
    // Extract topic by removing the prefix and suffix
    const topicStart = testPrefix.length + 1; // +1 for the underscore
    const topic = fileName.substring(topicStart, typeIndex).replace(/_/g, ' ').trim();
    
    // Create map key
    const mapKey = `${testId}_${topic}`;
    
    // Initialize the entry if it doesn't exist
    if (!testFilesMap[mapKey]) {
      testFilesMap[mapKey] = {
        id: mapKey,
        test_id: testId,
        topic,
        question_paper_url: '',
        created_at: new Date().toISOString()
      };
    }
    
    // Set the appropriate URL based on file type
    if (fileName.includes('_questionPaper_')) {
      testFilesMap[mapKey].question_paper_url = file.publicUrl;
    } else if (fileName.includes('_answerKey_')) {
      testFilesMap[mapKey].answer_key_url = file.publicUrl;
    } else if (fileName.includes('_handwrittenPaper_')) {
      testFilesMap[mapKey].handwritten_paper_url = file.publicUrl;
    }
  }
  
  console.log(`Mapped ${Object.keys(testFilesMap).length} test file groups`);
  
  return testFilesMap;
};

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
