import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { StorageFile, uploadStorageFile, deleteStorageFile, getPublicUrl } from "./storageHelpers";
import { extractFilenameFromUrl, getFileExtension, sanitizeTopic } from "./testFiles/fileExtractors";
import { mapSubjectFiles } from './mappers';

/**
 * Fetches subject files for a specific subject ID
 * 
 * @param subjectId The ID of the subject to fetch files for
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
 * Uploads a subject file to storage
 * 
 * @param subjectId The ID of the subject to upload the file for
 * @param topic The topic of the file
 * @param file The file to upload
 */
export const uploadSubjectFile = async (subjectId: string, topic: string, file: File): Promise<void> => {
  try {
    console.log(`Uploading file for subject ID: ${subjectId}, topic: ${topic}`);
    
    // Sanitize the topic to create a valid filename
    const sanitizedTopic = sanitizeTopic(topic);
    
    // Get the file extension
    const fileExtension = getFileExtension(file.name);
    
    // Create a unique filename
    const fileName = `${subjectId}_${sanitizedTopic}_questionPaper_${Date.now()}.${fileExtension}`;
    
    // Upload the file to storage
    await uploadStorageFile(fileName, file);
    
    toast.success('File uploaded successfully');
  } catch (error: any) {
    console.error('Error uploading subject file:', error);
    toast.error(`Failed to upload file: ${error.message}`);
  }
};

/**
 * Deletes a group of files related to a subject and topic
 * 
 * @param subjectPrefix The prefix of the files to delete (subject ID)
 * @param topic The topic of the files to delete
 * @returns True if successful, false otherwise
 */
export const deleteFileGroup = async (subjectPrefix: string, topic: string): Promise<boolean> => {
  try {
    console.log(`Deleting file group for subject prefix: ${subjectPrefix}, topic: ${topic}`);
    
    // Get all files from storage
    const files = await listStorageFiles();
    
    // Filter files that match the subject prefix and topic
    const filesToDelete = files.filter(file => file.name.startsWith(subjectPrefix) && file.name.includes(topic.replace(/ /g, '_')));
    
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
