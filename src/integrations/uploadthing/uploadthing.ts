
import { createUploadthing, type FileRouter } from "uploadthing/server";
 
const f = createUploadthing();

// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define as many FileRoutes as you like, each with a unique route key
  questionPaper: f({ image: { maxFileSize: "4MB", maxFileCount: 1 }, pdf: { maxFileSize: "4MB", maxFileCount: 1 } })
    // Set permissions and file types for this FileRoute
    .middleware(({ req }) => {
      // This code runs on your server before upload
      return { userId: "user-id", uploadType: "questionPaper" }; // Add metadata here
    })
    .onUploadComplete(({ metadata, file }) => {
      // This code RUNS ON YOUR SERVER after upload
      console.log("Upload complete for userId:", metadata?.userId);
      console.log("File URL:", file.url);
      console.log("Upload type:", metadata?.uploadType);
    }),

  answerKey: f({ image: { maxFileSize: "4MB", maxFileCount: 1 }, pdf: { maxFileSize: "4MB", maxFileCount: 1 } })
    .middleware(({ req }) => {
      return { userId: "user-id", uploadType: "answerKey" };
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata?.userId);
      console.log("File URL:", file.url);
      console.log("Upload type:", metadata?.uploadType);
    }),

  handwrittenPaper: f({ image: { maxFileSize: "4MB", maxFileCount: 3 }, pdf: { maxFileSize: "8MB", maxFileCount: 1 } })
    .middleware(({ req }) => {
      return { userId: "user-id", uploadType: "handwrittenPaper" };
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata?.userId);
      console.log("File URL:", file.url);
      console.log("Upload type:", metadata?.uploadType);
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
