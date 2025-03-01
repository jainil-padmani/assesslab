
export type UploadEndpoint = "questionPaper" | "answerKey" | "handwrittenPaper";

// Define the upload step interface
export type UploadStep = {
  id: number;
  title: string;
  description: string;
  fileTypes: string[];
  isRequired: boolean;
  endpoint: UploadEndpoint;
}

// Define the file upload form state
export type FileUploadState = {
  questionPaperUrl: string | null;
  answerKeyUrl: string | null;
  handwrittenPaperUrl: string | null;
  currentStep: number;
}

// Define the file upload record type
export type FileUpload = {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  file_url: string;
  upload_type: UploadEndpoint;
  created_at: string;
}
