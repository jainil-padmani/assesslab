
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Get public URL for a file in storage
export const getPublicUrl = (fileName: string, bucket = 'files') => {
  return supabase
    .storage
    .from(bucket)
    .getPublicUrl(fileName);
};

// List all files in a storage bucket
export const listStorageFiles = async (bucket = 'files') => {
  try {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list();
      
    if (error) throw error;
    console.log(`Listed ${data?.length || 0} files from storage`);
    return data || [];
  } catch (error: any) {
    console.error('Error listing files:', error);
    toast.error('Failed to list files');
    return [];
  }
};

// Upload a file to storage
export const uploadStorageFile = async (fileName: string, file: File, bucket = 'files') => {
  try {
    console.log(`Uploading file: ${fileName}, size: ${file.size} bytes`);
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(fileName, file, {
        cacheControl: '3600',
        upsert: true
      });
      
    if (error) throw error;
    console.log(`Successfully uploaded: ${fileName}`);
    return data;
  } catch (error: any) {
    console.error('Error uploading file:', error);
    toast.error(`Failed to upload file: ${error.message}`);
    throw error;
  }
};

// Copy a file within storage
export const copyStorageFile = async (sourceFileName: string, destinationFileName: string, bucket = 'files') => {
  try {
    console.log(`Copying file: ${sourceFileName} to ${destinationFileName}`);
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .copy(sourceFileName, destinationFileName);
      
    if (error) throw error;
    console.log(`Successfully copied file to: ${destinationFileName}`);
    return data;
  } catch (error: any) {
    console.error('Error copying file:', error);
    toast.error(`Failed to copy file: ${error.message}`);
    throw error;
  }
};

// Delete a file from storage
export const deleteStorageFile = async (fileName: string, bucket = 'files') => {
  try {
    console.log(`Attempting to delete: ${fileName}`);
    const { error } = await supabase
      .storage
      .from(bucket)
      .remove([fileName]);
      
    if (error) {
      console.error(`Error deleting ${fileName}:`, error);
      throw error;
    }
    
    console.log(`Successfully deleted: ${fileName}`);
    return true;
  } catch (error: any) {
    console.error('Error deleting file:', error);
    toast.error(`Failed to delete file: ${error.message}`);
    throw error;
  }
};

// Force refresh files from storage
export const forceRefreshStorage = async () => {
  try {
    // This is a workaround to force a refresh of the storage cache
    const dummyFileName = `refresh_${Date.now()}.txt`;
    const dummyFile = new Blob(['refresh'], { type: 'text/plain' });
    
    // Upload a dummy file
    await uploadStorageFile(dummyFileName, dummyFile as File);
    
    // Delete the dummy file
    await deleteStorageFile(dummyFileName);
    
    return true;
  } catch (error) {
    console.error('Error refreshing storage:', error);
    return false;
  }
};
