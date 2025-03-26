
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// Define StorageFile type for use across the application
export interface StorageFile {
  name: string;
  id: string;
  publicUrl: string;
  created_at?: string;
  updated_at?: string;
  last_accessed_at?: string;
  metadata?: any;
}

// Get public URL for a file in storage
export const getPublicUrl = (fileName: string, bucket = 'files') => {
  return supabase
    .storage
    .from(bucket)
    .getPublicUrl(fileName);
};

// List all files in a storage bucket
export const listStorageFiles = async (bucket = 'files'): Promise<StorageFile[]> => {
  try {
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .list();
      
    if (error) throw error;
    
    // Transform the storage items to include public URLs
    const filesWithUrls = (data || []).map(file => {
      const { data: { publicUrl } } = getPublicUrl(file.name, bucket);
      return {
        ...file,
        publicUrl
      };
    });
    
    console.log(`Listed ${filesWithUrls.length || 0} files from storage`);
    return filesWithUrls;
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

/**
 * Force a refresh of the storage listing
 * This uploads and then deletes a temporary file to trigger a cache refresh
 */
export const forceRefreshStorage = async (): Promise<void> => {
  try {
    // Create a small text file
    const timestamp = Date.now();
    const fileName = `refresh_${timestamp}.txt`;
    const content = "refresh";
    
    console.log(`Uploading file: ${fileName}, size: ${content.length} bytes`);
    
    // Create a file object
    const file = new File([content], fileName, {
      type: "text/plain",
    });
    
    // Upload the file
    const { error: uploadError } = await supabase.storage
      .from('files')
      .upload(fileName, file);
      
    if (uploadError) {
      console.error(`Error during refresh upload: ${uploadError.message}`);
      return;
    }
    
    console.log(`Successfully uploaded: ${fileName}`);
    
    // Delete the file immediately
    console.log(`Attempting to delete: ${fileName}`);
    const { error: deleteError } = await supabase.storage
      .from('files')
      .remove([fileName]);
      
    if (deleteError) {
      console.error(`Error during refresh delete: ${deleteError.message}`);
      return;
    }
    
    console.log(`Successfully deleted: ${fileName}`);
  } catch (error) {
    console.error("Error during storage refresh:", error);
  }
};
