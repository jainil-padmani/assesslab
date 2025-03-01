
import { UploadButton, UploadDropzone, Uploader } from "@uploadthing/react";
import { generateComponents } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthing";

export const { UploadButton: UTUploadButton, UploadDropzone: UTUploadDropzone, Uploader: UTUploader } = 
  generateComponents<OurFileRouter>();
