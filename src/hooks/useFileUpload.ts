
import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

export interface FileUploadOptions {
  bucketName?: string;
  folder?: string;
  fileTypes?: string[];
  maxSizeMB?: number;
  onProgress?: (progress: number) => void;
}

export interface FileUploadResult {
  url: string | null;
  fileName: string | null;
  fileType: string | null;
  fileSize: number | null;
  error: string | null;
}

/**
 * Hook for handling file uploads to Supabase storage
 */
export function useFileUpload() {
  const [isUploading, setIsUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const uploadFile = async (
    file: File,
    options: FileUploadOptions = {}
  ): Promise<FileUploadResult> => {
    const {
      bucketName = 'files',
      folder = '',
      fileTypes,
      maxSizeMB = 50,
      onProgress = (p) => setProgress(p),
    } = options;

    setIsUploading(true);
    setProgress(0);

    try {
      // Validate file type if fileTypes array is provided
      if (fileTypes && fileTypes.length > 0) {
        const fileExt = file.name.split('.').pop()?.toLowerCase();
        const isValidType = fileTypes.some(type => 
          type.startsWith('.') 
            ? `.${fileExt}` === type.toLowerCase()
            : file.type.includes(type.toLowerCase())
        );

        if (!isValidType) {
          throw new Error(`Invalid file type. Allowed types: ${fileTypes.join(', ')}`);
        }
      }

      // Validate file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        throw new Error(`File size exceeds the ${maxSizeMB}MB limit`);
      }

      // Create a unique file name to avoid collisions
      const uniquePrefix = uuidv4();
      const fileName = `${uniquePrefix}_${file.name}`;
      const filePath = folder ? `${folder}/${fileName}` : fileName;

      // Upload the file
      const { data, error } = await supabase.storage
        .from(bucketName)
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: true,
          onUploadProgress: (event) => {
            const progressPercent = (event.loaded / event.total) * 100;
            onProgress(Math.round(progressPercent));
          },
        });

      if (error) throw error;

      // Get the public URL
      const { data: urlData } = supabase.storage
        .from(bucketName)
        .getPublicUrl(data.path);

      return {
        url: urlData.publicUrl,
        fileName,
        fileType: file.type,
        fileSize: file.size,
        error: null,
      };
    } catch (error: any) {
      console.error('Error uploading file:', error);
      return {
        url: null,
        fileName: null,
        fileType: null,
        fileSize: null,
        error: error.message || 'Failed to upload file',
      };
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
