
import { createUploadthing, type FileRouter } from "uploadthing/server";
 
const f = createUploadthing();
 
// Define file types and permissions
export const ourFileRouter = {
  // Define different file upload types with different size limits
  questionPaper: f({ pdf: { maxFileSize: "4MB" }, image: { maxFileSize: "4MB" }, text: { maxFileSize: "1MB" } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for question paper", file.url);
      // Handle the possibly undefined metadata
      return { uploadedBy: metadata?.userId || "anonymous", url: file.url };
    }),
  answerKey: f({ pdf: { maxFileSize: "4MB" }, image: { maxFileSize: "4MB" }, text: { maxFileSize: "1MB" } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for answer key", file.url);
      // Handle the possibly undefined metadata
      return { uploadedBy: metadata?.userId || "anonymous", url: file.url };
    }),
  handwrittenPaper: f({ pdf: { maxFileSize: "8MB" }, image: { maxFileSize: "8MB" } })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for handwritten paper", file.url);
      // Handle the possibly undefined metadata
      return { uploadedBy: metadata?.userId || "anonymous", url: file.url };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
