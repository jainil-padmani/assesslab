import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { forceRefreshStorage } from "./storageHelpers";
import { mapSubjectFiles } from "./mappers";

/**
 * Uploads a subject file
 * 
 * @param subjectId The subject ID
 * @param topic The topic name
 * @param file The file to upload
 * @returns Promise indicating success
 */
export const uploadSubjectFile = async (
  subjectId: string,
  topic: string,
  file: File,
  fileType: 'questionPaper' | 'answerKey' | 'handwrittenPaper'
): Promise<boolean> => {
  try {
    if (!file) {
      throw new Error("No file provided");
    }

    // Sanitize the topic for storage
    const sanitizedTopic = topic.replace(/\s+/g, '_');
    
    // Create a unique filename
    const timestamp = Date.now();
    const uniqueId = Math.random().toString(36).substring(2, 8);
    const fileExtension = file.name.split('.').pop();
    const fileName = `subject_${subjectId}_${sanitizedTopic}_${fileType}_${timestamp}_${uniqueId}.${fileExtension}`;
    
    // Upload the file
    const { data, error } = await supabase.storage
      .from('documents')
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: false
      });
      
    if (error) throw error;
    
    // Get the public URL for the file
    const { data: urlData } = supabase.storage.from('documents').getPublicUrl(fileName);
    
    // Create a database record for this file
    const { error: recordError } = await supabase
      .from('subject_documents')
      .insert({
        subject_id: subjectId,
        document_type: fileType,
        document_url: urlData.publicUrl,
        file_name: fileName,
        file_type: fileExtension,
        file_size: file.size
      });
      
    if (recordError) throw recordError;
    
    // Force a refresh to ensure storage cache is updated
    await forceRefreshStorage();
    
    return true;
  } catch (error) {
    console.error("Error uploading subject file:", error);
    throw error;
  }
};

/**
 * Fetches subject files 
 * 
 * @param subjectId The subject ID
 * @returns Array of subject files
 */
export const fetchSubjectFiles = async (subjectId: string): Promise<any[]> => {
  try {
    console.log('Fetching subject files for subject ID:', subjectId);
    
    // Get all files from storage
    const storageData = await listStorageFiles();
    
    // Map the files to subject files
    const filesMap = mapSubjectFiles(storageData, subjectId);
    
    // Convert the map to an array
    const files = Object.values(filesMap);
    
    console.log("Fetched subject files:", files.length);
    return files;
  } catch (error) {
    console.error('Error fetching subject files:', error);
    toast.error('Failed to fetch subject files');
    return [];
  }
};

/**
 * Deletes a group of files
 * 
 * @param prefix The file prefix
 * @param topic The topic name
 * @returns Boolean indicating success
 */
export const deleteFileGroup = async (prefix: string, topic: string): Promise<boolean> => {
  try {
    console.log(`Deleting file group for prefix: ${prefix}, topic: ${topic}`);
    
    // Get all files from storage
    const files = await listStorageFiles();
    
    // Filter files that match the prefix and topic
    const filesToDelete = files.filter(file => file.name.startsWith(prefix) && file.name.includes(topic.replace(/ /g, '_')));
    
    // Delete each file
    for (const file of filesToDelete) {
      await deleteStorageFile(file.name);
    }
    
    toast.success('Files deleted successfully');
    return true;
  } catch (error: any) {
    console.error('Error deleting file group:', error);
    toast.error(`Failed to delete files: ${error.message}`);
    return false;
  }
};

// Re-export helper function to avoid circular dependencies
const listStorageFiles = async () => {
  const { listStorageFiles } = await import('./storageHelpers');
  return listStorageFiles();
};
