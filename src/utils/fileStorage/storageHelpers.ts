
import { toast } from "sonner";

// These functions are no longer used with UploadThing but are kept as stubs
// to prevent any code referencing them from breaking

// Get public URL for a file in storage (now just returns the input URL)
export const getPublicUrl = (fileName: string, bucket = 'files') => {
  return {
    data: {
      publicUrl: fileName
    }
  };
};

// List all files in a storage bucket - no longer needed
export const listStorageFiles = async (bucket = 'files') => {
  console.log("Storage listing no longer used with UploadThing");
  return [];
};

// Upload a file to storage - now handled by UploadThing
export const uploadStorageFile = async (fileName: string, file: File, bucket = 'files') => {
  console.error("Direct storage uploads are no longer used, use uploadService instead");
  toast.error("Storage method not supported");
  throw new Error("Storage upload method not supported");
};

// Copy a file within storage - no longer needed
export const copyStorageFile = async (sourceFileName: string, destinationFileName: string, bucket = 'files') => {
  console.error("File copying not supported in UploadThing integration");
  toast.error("File copying not supported");
  throw new Error("File copying not supported");
};

// Delete a file from storage - no longer needed with UploadThing
export const deleteStorageFile = async (fileName: string, bucket = 'files') => {
  console.log("File deletion within storage no longer used with UploadThing");
  return true;
};

// Force refresh files from storage - no longer needed
export const forceRefreshStorage = async () => {
  console.log("Storage refresh no longer needed with UploadThing");
  return true;
};
