
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { SubjectFile } from "@/types/dashboard";
import { uploadService } from "@/services/uploadService";

// Fetch subject files from database
export const fetchSubjectFiles = async (subjectId: string): Promise<SubjectFile[]> => {
  try {
    console.log('Fetching subject files for subject ID:', subjectId);
    
    // Get the current user ID to filter by ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    // Fetch subject files from the database
    const { data: subjectDocuments, error } = await supabase
      .from('subject_documents')
      .select('*')
      .eq('subject_id', subjectId)
      .eq('user_id', user.id);
      
    if (error) throw error;
    
    // Group files by topic to create SubjectFile objects
    const filesByTopic: Record<string, SubjectFile> = {};
    
    for (const doc of subjectDocuments || []) {
      // Extract topic from file_name if present, or use the document_type
      const nameParts = doc.file_name?.split('_') || [];
      const topic = nameParts.length > 1 ? nameParts[1] : doc.document_type;
      const topicKey = `${subjectId}_${topic}`;
      
      if (!filesByTopic[topicKey]) {
        filesByTopic[topicKey] = {
          id: topicKey,
          subject_id: subjectId,
          topic: topic.replace(/_/g, ' '),
          question_paper_url: '',
          answer_key_url: '',
          handwritten_paper_url: null,
          created_at: doc.created_at,
          user_id: doc.user_id
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
    
    // Filter to include files with at least a question paper
    const files = Object.values(filesByTopic).filter(
      file => file.question_paper_url
    );
    
    console.log('Found subject files:', files.length);
    return files;
  } catch (error: any) {
    console.error('Error fetching subject files:', error);
    toast.error('Failed to fetch subject files');
    return [];
  }
};

// Function to delete files by group
export const deleteFileGroup = async (filePrefix: string, topic: string): Promise<boolean> => {
  try {
    console.log(`Attempting to delete file group with prefix: ${filePrefix}, topic: ${topic}`);
    
    // Get current user to verify ownership
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    // For UploadThing, we only need to delete the database records
    // The URLs will remain but that's fine as they're managed by UploadThing
    
    // Delete database records
    const { error } = await supabase
      .from('subject_documents')
      .delete()
      .filter('file_name', 'ilike', `${filePrefix}_${topic}_%`);
      
    if (error) throw error;
    
    toast.success("Files deleted successfully");
    return true;
  } catch (error) {
    console.error("Error deleting files:", error);
    toast.error("Failed to delete files");
    return false;
  }
};

// Function to upload a new file for a subject
export const uploadSubjectFile = async (
  subjectId: string,
  topic: string,
  file: File,
  fileType: 'questionPaper' | 'answerKey' | 'handwrittenPaper'
): Promise<string> => {
  try {
    // Verify ownership of the subject
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data: subject } = await supabase
      .from('subjects')
      .select('user_id')
      .eq('id', subjectId)
      .single();
      
    if (!subject || subject.user_id !== user.id) {
      throw new Error("You don't have permission to upload files to this subject");
    }
    
    // Upload to UploadThing
    const fileUrl = await uploadService.uploadFile(file, fileType);
    
    // Create a unique filename for database record
    const sanitizedTopic = topic.replace(/\s+/g, '_');
    const fileName = `${subjectId}_${sanitizedTopic}_${fileType}_${Date.now()}`;
    
    // Insert record into subject_documents
    await supabase.from('subject_documents').insert({
      subject_id: subjectId,
      user_id: user.id,
      file_name: fileName,
      document_type: fileType,
      document_url: fileUrl,
      file_type: file.name.split('.').pop() || '',
      file_size: file.size
    });
    
    return fileUrl;
  } catch (error) {
    console.error(`Error uploading ${fileType}:`, error);
    throw error;
  }
};
