
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
  ): Promise<{
    questionPaperUrl: string | null;
    answerKeyUrl: string | null;
    handwrittenPaperUrl: string | null;
  }> => {
    try {
      // Check if required files are provided
      if (!questionPaper || !answerKey) {
        toast.error("Question paper and answer key are required");
        return {
          questionPaperUrl: null,
          answerKeyUrl: null,
          handwrittenPaperUrl: null
        };
      }
      
      // Upload each file
      const uploads = {
        questionPaperUrl: questionPaper ? uploadService.uploadFile(questionPaper, 'questionPaper') : Promise.resolve(null),
        answerKeyUrl: answerKey ? uploadService.uploadFile(answerKey, 'answerKey') : Promise.resolve(null),
        handwrittenPaperUrl: handwrittenPaper ? uploadService.uploadFile(handwrittenPaper, 'answerSheet') : Promise.resolve(null)
      };
      
      // Wait for all uploads to complete
      const [questionPaperUrl, answerKeyUrl, handwrittenPaperUrl] = await Promise.all([
        uploads.questionPaperUrl,
        uploads.answerKeyUrl,
        uploads.handwrittenPaperUrl
      ]);
      
      return {
        questionPaperUrl: questionPaperUrl || null,
        answerKeyUrl: answerKeyUrl || null,
        handwrittenPaperUrl: handwrittenPaperUrl || null
      };
    } catch (error) {
      console.error("Error submitting files:", error);
      toast.error("Failed to submit files. Please try again.");
      return {
        questionPaperUrl: null,
        answerKeyUrl: null,
        handwrittenPaperUrl: null
      };
    }
  }
};
