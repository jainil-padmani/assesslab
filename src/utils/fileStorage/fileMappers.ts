
// Create this file if it doesn't exist
// If it exists, just update it with this implementation

/**
 * Maps storage files to test files based on file name patterns
 */
export const mapTestFiles = (storageFiles: any[], testId: string): Map<string, any> => {
  const fileMap = new Map();
  const testPrefix = `test_${testId}`;
  
  console.log(`Mapping files for test prefix: ${testPrefix}`);
  
  // Find all files that match the test prefix
  const testFiles = storageFiles.filter(file => 
    file.name.startsWith(testPrefix) || 
    file.name.includes(`/${testPrefix}`)
  );
  
  console.log(`Found ${testFiles.length} files matching test prefix ${testPrefix}`);
  
  // Process each file to extract topic and file type
  testFiles.forEach(file => {
    try {
      // Extract topic and file type from file name
      const parts = file.name.split('_');
      
      // Skip if the file name doesn't have enough parts
      if (parts.length < 4) {
        console.log(`Skipping file with invalid name format: ${file.name}`);
        return;
      }
      
      // The topic is usually between the test ID and the file type
      const topicParts = [];
      let fileType = '';
      
      // Start after test ID (parts[0] is 'test', parts[1] is the ID)
      for (let i = 2; i < parts.length; i++) {
        if (parts[i].includes('questionPaper') || 
            parts[i].includes('answerKey') || 
            parts[i].includes('handwrittenPaper')) {
          fileType = parts[i].includes('questionPaper') 
            ? 'questionPaper' 
            : parts[i].includes('answerKey') 
              ? 'answerKey' 
              : 'handwrittenPaper';
          break;
        }
        topicParts.push(parts[i]);
      }
      
      // Join the topic parts back together
      const topic = topicParts.join('_').replace(/_/g, ' ').trim();
      
      if (!topic || !fileType) {
        console.log(`Skipping file with missing topic or file type: ${file.name}`);
        return;
      }
      
      console.log(`Mapped file: ${file.name} to topic: ${topic}, type: ${fileType}`);
      
      // Get the public URL for the file
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/files/${file.name}`;
      
      // Create or update the test file in the map
      if (!fileMap.has(topic)) {
        fileMap.set(topic, {
          id: `${testId}_${topic}`,
          test_id: testId,
          topic,
          created_at: new Date().toISOString(),
          question_paper_url: fileType === 'questionPaper' ? publicUrl : null,
          answer_key_url: fileType === 'answerKey' ? publicUrl : null,
          handwritten_paper_url: fileType === 'handwrittenPaper' ? publicUrl : null
        });
      } else {
        const existing = fileMap.get(topic);
        if (fileType === 'questionPaper') {
          existing.question_paper_url = publicUrl;
        } else if (fileType === 'answerKey') {
          existing.answer_key_url = publicUrl;
        } else if (fileType === 'handwrittenPaper') {
          existing.handwritten_paper_url = publicUrl;
        }
        fileMap.set(topic, existing);
      }
    } catch (error) {
      console.error(`Error mapping file ${file.name}:`, error);
    }
  });
  
  console.log(`Successfully mapped ${fileMap.size} test files for ${testId}`);
  return fileMap;
};

/**
 * Maps storage files to subject files based on file name patterns
 */
export const mapSubjectFiles = (storageFiles: any[], subjectId: string): Map<string, any> => {
  const fileMap = new Map();
  const subjectPrefix = `${subjectId}`;
  
  // Find all files that match the subject prefix
  const subjectFiles = storageFiles.filter(file => 
    file.name.startsWith(subjectPrefix) || 
    file.name.includes(`/${subjectPrefix}`)
  );
  
  // Process each file to extract topic and file type
  subjectFiles.forEach(file => {
    try {
      // Extract topic and file type from file name
      const parts = file.name.split('_');
      
      // Skip if the file name doesn't have enough parts
      if (parts.length < 3) return;
      
      // The topic is usually between the subject ID and the file type
      const topicParts = [];
      let fileType = '';
      
      // Skip the subject ID part
      for (let i = 1; i < parts.length; i++) {
        if (parts[i].includes('questionPaper') || 
            parts[i].includes('answerKey') || 
            parts[i].includes('handwrittenPaper')) {
          fileType = parts[i].includes('questionPaper') 
            ? 'questionPaper' 
            : parts[i].includes('answerKey') 
              ? 'answerKey' 
              : 'handwrittenPaper';
          break;
        }
        topicParts.push(parts[i]);
      }
      
      // Join the topic parts back together
      const topic = topicParts.join('_').replace(/_/g, ' ').trim();
      
      if (!topic || !fileType) return;
      
      // Get the public URL for the file
      const publicUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/files/${file.name}`;
      
      // Create or update the subject file in the map
      if (!fileMap.has(topic)) {
        fileMap.set(topic, {
          id: `${subjectId}_${topic}`,
          subject_id: subjectId,
          topic,
          created_at: new Date().toISOString(),
          question_paper_url: fileType === 'questionPaper' ? publicUrl : null,
          answer_key_url: fileType === 'answerKey' ? publicUrl : null,
          handwritten_paper_url: fileType === 'handwrittenPaper' ? publicUrl : null
        });
      } else {
        const existing = fileMap.get(topic);
        if (fileType === 'questionPaper') {
          existing.question_paper_url = publicUrl;
        } else if (fileType === 'answerKey') {
          existing.answer_key_url = publicUrl;
        } else if (fileType === 'handwrittenPaper') {
          existing.handwritten_paper_url = publicUrl;
        }
        fileMap.set(topic, existing);
      }
    } catch (error) {
      console.error(`Error mapping file ${file.name}:`, error);
    }
  });
  
  return fileMap;
};
