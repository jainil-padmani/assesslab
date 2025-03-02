
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
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .upload(fileName, file);
      
    if (error) throw error;
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
    const { data, error } = await supabase
      .storage
      .from(bucket)
      .copy(sourceFileName, destinationFileName);
      
    if (error) throw error;
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
    const { error } = await supabase
      .storage
      .from(bucket)
      .remove([fileName]);
      
    if (error) throw error;
    return true;
  } catch (error: any) {
    console.error('Error deleting file:', error);
    toast.error(`Failed to delete file: ${error.message}`);
    throw error;
  }
};
