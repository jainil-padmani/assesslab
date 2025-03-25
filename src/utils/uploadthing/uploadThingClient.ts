
// Import the correct functions from the UploadThing React package
import { generateReactHelpers } from "@uploadthing/react";
import { generateClientDropzoneAccept } from "uploadthing/client";
import type { OurFileRouter } from "./uploadthingConfig";

// Create and export UI components and upload helper functions
export const { useUploadThing, uploadFiles, UploadButton, UploadDropzone } = 
  generateReactHelpers<OurFileRouter>();

export const { genAcceptFromExtension, getAcceptedFiles } = generateClientDropzoneAccept();

// Export types 
export type { UploadFileResponse } from "uploadthing/client";

// For backward compatibility (services using startUpload)
export const startUpload = uploadFiles;
