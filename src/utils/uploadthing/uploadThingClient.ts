
import { createUploadthing, type FileRouter } from "uploadthing/next";
import { generateComponents } from "@uploadthing/react";

import type { OurFileRouter } from "./uploadthingConfig";

// Generate React hooks for UploadThing
export const { useUploadThing, uploadFiles } = generateComponents<OurFileRouter>();
