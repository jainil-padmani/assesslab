
import { generateComponents } from "@uploadthing/react";
import { generateReactHelpers } from "@uploadthing/react/hooks";
import type { OurFileRouter } from "./uploadthingConfig";

// Generate React components for UploadThing
export const { UploadButton, UploadDropzone, Uploader } = generateComponents<OurFileRouter>();

// Generate React hooks for UploadThing
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();
