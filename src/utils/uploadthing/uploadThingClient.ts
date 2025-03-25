
import { generateReactHelpers } from "@uploadthing/react";
import type { OurFileRouter } from "./uploadthingConfig";

// Generate React hooks for UploadThing
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();
