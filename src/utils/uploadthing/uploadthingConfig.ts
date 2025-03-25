
import { createUploadthing, type FileRouter } from "uploadthing/next";

// Create a new instance of UploadThing
export const uploadthing = createUploadthing();

// Define your file router (handler)
export const uploadRouter = {
  // Define the "answerSheet" route - accepts PDFs and images up to 10MB
  answerSheet: uploadthing({ image: { maxFileSize: "10MB" }, pdf: { maxFileSize: "10MB" } })
    .onUploadComplete(({ file }) => {
      console.log("Upload complete:", file.url);
      return { url: file.url };
    }),

  // Define the "questionPaper" route - accepts PDFs and images up to 8MB
  questionPaper: uploadthing({ image: { maxFileSize: "8MB" }, pdf: { maxFileSize: "8MB" } })
    .onUploadComplete(({ file }) => {
      console.log("Question paper uploaded:", file.url);
      return { url: file.url };
    }),

  // Define the "answerKey" route - accepts PDFs and docs up to 8MB
  answerKey: uploadthing({ image: { maxFileSize: "8MB" }, pdf: { maxFileSize: "8MB" }, blob: { maxFileSize: "8MB" } })
    .onUploadComplete(({ file }) => {
      console.log("Answer key uploaded:", file.url);
      return { url: file.url };
    }),

  // Define the "subjectFile" route - accepts PDFs, docs and images up to 10MB
  subjectFile: uploadthing({ image: { maxFileSize: "10MB" }, pdf: { maxFileSize: "10MB" }, blob: { maxFileSize: "10MB" } })
    .onUploadComplete(({ file }) => {
      console.log("Subject file uploaded:", file.url);
      return { url: file.url };
    }),

  // Define the "generalFile" route for all other file types
  generalFile: uploadthing({ blob: { maxFileSize: "20MB" } })
    .onUploadComplete(({ file }) => {
      console.log("File uploaded:", file.url);
      return { url: file.url };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof uploadRouter;
