
// Import the correct functions from the UploadThing React package
import { useUploadThing, uploadFiles } from "@uploadthing/react";
import { generateClientDropzoneAccept } from "uploadthing/client";
import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthingConfig";

// Create and export UI components and upload helper functions
export const UploadButton = generateUploadButton<OurFileRouter>();
export const UploadDropzone = generateUploadDropzone<OurFileRouter>();
export { useUploadThing, uploadFiles };

export const { genAcceptFromExtension, getAcceptedFiles } = generateClientDropzoneAccept();

// Export types 
export type { UploadFileResponse } from "uploadthing/client";

// For backward compatibility (services using startUpload)
export const startUpload = uploadFiles;
