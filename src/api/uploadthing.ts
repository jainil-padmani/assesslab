
import { createUploadthing, type FileRouter } from "uploadthing/server";
 
const f = createUploadthing();
 
// FileRouter for your app, can contain multiple FileRoutes
export const ourFileRouter = {
  // Define file uploaders for different use cases
  documentUploader: f({ pdf: { maxFileSize: "8MB" } })
    .middleware(() => {
      return { userId: "user-id" };
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  studyMaterialUploader: f({
    pdf: { maxFileSize: "16MB" },
    image: { maxFileSize: "4MB" },
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document": { maxFileSize: "8MB" },
    "application/vnd.openxmlformats-officedocument.presentationml.presentation": { maxFileSize: "16MB" },
  })
    .middleware(() => {
      return { userId: "user-id" };
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { uploadedBy: metadata.userId, url: file.url };
    }),

  answerSheetUploader: f({ pdf: { maxFileSize: "12MB" } })
    .middleware(() => {
      return { userId: "user-id" };
    })
    .onUploadComplete(({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      
      return { uploadedBy: metadata.userId, url: file.url };
    }),
} satisfies FileRouter;
 
export type OurFileRouter = typeof ourFileRouter;
