
import { uploadFiles } from "@/utils/uploadthing/uploadThingClient";
import { toast } from "sonner";

// Central service for handling file uploads via UploadThing
export const uploadService = {
  uploadFile: async (file: File, type: 'questionPaper' | 'answerKey' | 'handwrittenPaper' | 'answerSheet' | 'subjectFile' | 'generalFile'): Promise<string> => {
    try {
      console.log(`Uploading ${type}: ${file.name}`);
      
      // Map the type to the appropriate UploadThing route
      const endpoint = type === 'handwrittenPaper' ? 'answerSheet' : type;
      
      // Upload the file to UploadThing
      const [res] = await uploadFiles({
        endpoint,
        files: [file],
      });
      
      if (!res || !res.url) {
        throw new Error("Upload failed - no URL returned");
      }
      
      console.log(`Successfully uploaded ${type} to: ${res.url}`);
      return res.url;
    } catch (error) {
      console.error("Error uploading file:", error);
      toast.error("Failed to upload file. Please try again.");
      throw error;
    }
  },
  
  submitFiles: async (
    questionPaper: File | null, 
    answerKey: File | null, 
    handwrittenPaper: File | null
  ): Promise<boolean> => {
    try {
      // Check if required files are provided
      if (!questionPaper || !answerKey) {
        toast.error("Question paper and answer key are required");
        return false;
      }
      
      // Upload each file
      const uploads = [];
      
      if (questionPaper) {
        uploads.push(uploadService.uploadFile(questionPaper, 'questionPaper'));
      }
      
      if (answerKey) {
        uploads.push(uploadService.uploadFile(answerKey, 'answerKey'));
      }
      
      if (handwrittenPaper) {
        uploads.push(uploadService.uploadFile(handwrittenPaper, 'answerSheet'));
      }
      
      // Wait for all uploads to complete
      await Promise.all(uploads);
      
      return true;
    } catch (error) {
      console.error("Error submitting files:", error);
      toast.error("Failed to submit files. Please try again.");
      return false;
    }
  }
};
