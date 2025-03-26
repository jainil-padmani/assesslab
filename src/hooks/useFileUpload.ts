
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadOptions {
  bucketName?: string;
  folderPath?: string;
  fileTypes?: string[];
  maxSize?: number; // in MB
}

export function useFileUpload(options: FileUploadOptions = {}) {
  const {
    bucketName = 'files',
    folderPath = '',
    fileTypes = ['image/jpeg', 'image/png', 'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
    maxSize = 10, // Default max size is 10MB
  } = options;
  
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const validateFile = (file: File): boolean => {
    // Check file type
    if (fileTypes.length > 0 && !fileTypes.includes(file.type)) {
      toast.error(`Invalid file type. Allowed types: ${fileTypes.join(', ')}`);
      return false;
    }
    
    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      toast.error(`File size exceeds the maximum allowed size of ${maxSize}MB`);
      return false;
    }
    
    return true;
  };

  const uploadFile = async (file: File, customPath?: string): Promise<string | null> => {
    if (!validateFile(file)) {
      return null;
    }
    
    setIsUploading(true);
    setProgress(0);
    
    try {
      const fileExt = file.name.split('.').pop();
      const filePath = customPath || `${folderPath}${folderPath ? '/' : ''}${uuidv4()}.${fileExt}`;
      
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false,
        });
      
      if (error) {
        throw error;
      }
      
      setProgress(100);
      
      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);
      
      return publicUrl;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error(`Upload failed: ${error.message}`);
      return null;
    } finally {
      setIsUploading(false);
    }
  };

  return {
    uploadFile,
    isUploading,
    progress,
  };
}
