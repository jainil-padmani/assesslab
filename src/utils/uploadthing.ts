
import { generateReactHelpers } from "@uploadthing/react";
 
import type { OurFileRouter } from "@/api/uploadthing";
 
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();
