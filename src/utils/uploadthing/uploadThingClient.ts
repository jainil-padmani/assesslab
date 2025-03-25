
// Import the correct hooks from the UploadThing React package
import { useUploadThing } from "@uploadthing/react";
import { generateUploadButton, generateUploadDropzone } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthingConfig";

// Export the hooks for use in other components
export { useUploadThing };

// Create and export UI components and upload helper functions
export const { StartUpload: startUpload, UploadButton } = generateUploadButton<OurFileRouter>();
export const { UploadDropzone } = generateUploadDropzone<OurFileRouter>();
