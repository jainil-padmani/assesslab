
// Import the correct functions from the UploadThing React package
import { generateClientDropzoneAccept } from "uploadthing/client";
import {
  generateUploadButton,
  generateUploadDropzone,
  generateUploader
} from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthingConfig";

// Create and export UI components and upload helper functions
export const { UploadButton } = generateUploadButton<OurFileRouter>();
export const { UploadDropzone } = generateUploadDropzone<OurFileRouter>();
export const { startUpload } = generateUploader<OurFileRouter>();
export const { genAcceptFromExtension, getAcceptedFiles } = generateClientDropzoneAccept();

// Export types
export type { UploadFileResponse } from "uploadthing/types";
