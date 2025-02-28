
import { generateReactHelpers } from "@uploadthing/react/hooks";
 
import type { OurFileRouter } from "@/api/uploadthing";
 
export const { useUploadThing, uploadFiles } = generateReactHelpers<OurFileRouter>();
