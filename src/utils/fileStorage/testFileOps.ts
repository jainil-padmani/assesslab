
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";

// Function to fetch test files from database
export const fetchTestFiles = async (testId: string): Promise<any[]> => {
  try {
    console.log('Fetching test files for test ID:', testId);
    
    // Verify test exists and get ownership info
    const { data: test, error: testError } = await supabase
      .from('tests')
      .select('user_id, subject_id')
      .eq('id', testId)
      .single();
      
    if (testError) throw testError;
    
    // Query the database for test files
    const { data: testDocuments, error } = await supabase
      .from('subject_documents')
      .select('*')
      .eq('test_id', testId);
      
    if (error) throw error;
    
    // Group files by topic to create test file objects
    const filesByTopic: Record<string, any> = {};
    
    for (const doc of testDocuments || []) {
      // Extract topic from file_name if present, or use the document_type
      const topic = doc.topic || 'general';
      const topicKey = `test_${testId}_${topic}`;
      
      if (!filesByTopic[topicKey]) {
        filesByTopic[topicKey] = {
          id: topicKey,
          test_id: testId,
          subject_id: test.subject_id,
          topic: topic.replace(/_/g, ' '),
          question_paper_url: '',
          answer_key_url: '',
          handwritten_paper_url: null,
          created_at: doc.created_at
        };
      }
      
      // Set URL based on document_type
      if (doc.document_type === 'questionPaper') {
        filesByTopic[topicKey].question_paper_url = doc.document_url;
      } else if (doc.document_type === 'answerKey') {
        filesByTopic[topicKey].answer_key_url = doc.document_url;
      } else if (doc.document_type === 'handwrittenPaper') {
        filesByTopic[topicKey].handwritten_paper_url = doc.document_url;
      }
    }
    
    // Filter to include files with at least a question paper and answer key
    const files = Object.values(filesByTopic).filter(
      file => file.question_paper_url && file.answer_key_url
    );
    
    console.log("Fetched test files:", files.length);
    return files;
  } catch (error) {
    console.error('Error fetching test files:', error);
    toast.error('Failed to fetch test files');
    return [];
  }
};

// Function to assign existing subject files to a test
export const assignSubjectFilesToTest = async (
  testId: string,
  subjectFile: SubjectFile
): Promise<boolean> => {
  try {
    console.log('Assigning subject file to test:', { testId, subjectFile });
    
    // Verify ownership of test and subject
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data: test } = await supabase
      .from('tests')
      .select('user_id, subject_id')
      .eq('id', testId)
      .single();
      
    if (!test) throw new Error("Test not found");
    if (test.user_id !== user.id) {
      throw new Error("You don't have permission to modify this test");
    }
    
    if (test.subject_id !== subjectFile.subject_id) {
      throw new Error("The selected file belongs to a different subject");
    }

    // Validate both question paper and answer key are present
    if (!subjectFile.question_paper_url) {
      throw new Error("Question paper URL is missing");
    }
    
    if (!subjectFile.answer_key_url) {
      throw new Error("Answer key URL is missing - this is now required");
    }
    
    // Create a record for the question paper
    await supabase.from('subject_documents').insert({
      subject_id: test.subject_id,
      test_id: testId,
      user_id: user.id,
      document_type: 'questionPaper',
      document_url: subjectFile.question_paper_url,
      file_name: `test_${testId}_${subjectFile.topic.replace(/\s+/g, '_')}_questionPaper`,
      file_type: 'url',
      file_size: 0,
      topic: subjectFile.topic.replace(/\s+/g, '_')
    });
    
    // Create a record for the answer key
    await supabase.from('subject_documents').insert({
      subject_id: test.subject_id,
      test_id: testId,
      user_id: user.id,
      document_type: 'answerKey',
      document_url: subjectFile.answer_key_url,
      file_name: `test_${testId}_${subjectFile.topic.replace(/\s+/g, '_')}_answerKey`,
      file_type: 'url',
      file_size: 0,
      topic: subjectFile.topic.replace(/\s+/g, '_')
    });
    
    // Create a record for the handwritten paper if it exists
    if (subjectFile.handwritten_paper_url) {
      await supabase.from('subject_documents').insert({
        subject_id: test.subject_id,
        test_id: testId,
        user_id: user.id,
        document_type: 'handwrittenPaper',
        document_url: subjectFile.handwritten_paper_url,
        file_name: `test_${testId}_${subjectFile.topic.replace(/\s+/g, '_')}_handwrittenPaper`,
        file_type: 'url',
        file_size: 0,
        topic: subjectFile.topic.replace(/\s+/g, '_')
      });
    }

    toast.success("Files assigned to test successfully");
    return true;
  } catch (error: any) {
    console.error('Error assigning files to test:', error);
    toast.error(`Failed to assign files: ${error.message}`);
    return false;
  }
};
