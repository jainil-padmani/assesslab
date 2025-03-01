
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
