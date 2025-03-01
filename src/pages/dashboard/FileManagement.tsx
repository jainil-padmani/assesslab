
import React, { useState } from 'react';
import { toast } from "sonner";
import { StepIndicator } from '@/components/file-upload/StepIndicator';
import { UploadForm } from '@/components/file-upload/UploadForm';
import { FileList } from '@/components/file-upload/FileList';
import { type UploadStep, type FileUploadState, type UploadEndpoint } from '@/types/fileUpload';

const FileManagement = () => {
  // Define the upload steps
  const uploadSteps: UploadStep[] = [
    {
      id: 1,
      title: "Add Question Paper",
      description: "Upload the question paper file. This is required to proceed.",
      fileTypes: [".pdf", ".docx", ".png", ".jpeg", ".jpg"],
      isRequired: true,
      endpoint: "questionPaper"
    },
    {
      id: 2,
      title: "Add Answer Key",
      description: "Upload the answer key file. This is required to proceed.",
      fileTypes: [".pdf", ".docx", ".png", ".jpeg", ".jpg"],
      isRequired: true,
      endpoint: "answerKey"
    },
    {
      id: 3,
      title: "Add Handwritten Paper (Optional)",
      description: "Upload handwritten answer sheets. You can skip this step if not applicable.",
      fileTypes: [".pdf", ".png", ".jpeg", ".jpg"],
      isRequired: false,
      endpoint: "handwrittenPaper"
    }
  ];

  // Initialize state for file upload
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    questionPaperUrl: null,
    answerKeyUrl: null,
    handwrittenPaperUrl: null,
    currentStep: 1
  });

  // Handle next step
  const handleNextStep = () => {
    if (fileUploadState.currentStep < 3) {
      setFileUploadState({ 
        ...fileUploadState, 
        currentStep: fileUploadState.currentStep + 1 
      });
    }
  };

  // Handle previous step
  const handlePrevStep = () => {
    if (fileUploadState.currentStep > 1) {
      setFileUploadState({ 
        ...fileUploadState, 
        currentStep: fileUploadState.currentStep - 1 
      });
    }
  };

  // Handle skip step (only for optional steps)
  const handleSkipStep = () => {
    if (fileUploadState.currentStep === 3) {
      handleSubmitFiles();
    }
  };

  // Handle file submission
  const handleSubmitFiles = () => {
    toast.success("Files uploaded successfully!");
    
    // Reset the form state
    setFileUploadState({
      questionPaperUrl: null,
      answerKeyUrl: null,
      handwrittenPaperUrl: null,
      currentStep: 1
    });
  };

  // Handle upload complete
  const handleUploadComplete = (endpoint: UploadEndpoint, res: { url: string }) => {
    toast.success(`${endpoint} uploaded successfully!`);

    if (endpoint === "questionPaper") {
      setFileUploadState({ ...fileUploadState, questionPaperUrl: res.url });
    } else if (endpoint === "answerKey") {
      setFileUploadState({ ...fileUploadState, answerKeyUrl: res.url });
    } else if (endpoint === "handwrittenPaper") {
      setFileUploadState({ ...fileUploadState, handwrittenPaperUrl: res.url });
    }
  };

  // Handle upload error
  const handleUploadError = (error: Error) => {
    toast.error(`Upload failed: ${error.message}`);
  };

  // Get the current step
  const currentStep = uploadSteps.find(step => step.id === fileUploadState.currentStep);
  
  if (!currentStep) return null;

  // Check if we can proceed to the next step
  const canProceed = (step: UploadStep) => {
    if (!step.isRequired) return true;
    
    switch (step.id) {
      case 1:
        return !!fileUploadState.questionPaperUrl;
      case 2:
        return !!fileUploadState.answerKeyUrl;
      case 3:
        return true; // This step is optional
      default:
        return false;
    }
  };

  // Get current file URL based on step
  const getCurrentFileUrl = (step: UploadStep) => {
    switch (step.id) {
      case 1:
        return fileUploadState.questionPaperUrl;
      case 2:
        return fileUploadState.answerKeyUrl;
      case 3:
        return fileUploadState.handwrittenPaperUrl;
      default:
        return null;
    }
  };

  // Handle file removal
  const handleRemoveFile = (step: UploadStep) => {
    switch (step.id) {
      case 1:
        setFileUploadState({ ...fileUploadState, questionPaperUrl: null });
        break;
      case 2:
        setFileUploadState({ ...fileUploadState, answerKeyUrl: null });
        break;
      case 3:
        setFileUploadState({ ...fileUploadState, handwrittenPaperUrl: null });
        break;
    }
    toast.info(`${step.title} has been removed.`);
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold">File Management</h1>
      </div>

      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold">Upload Files</h2>
          <div className="text-sm text-muted-foreground">
            Step {fileUploadState.currentStep} of 3
          </div>
        </div>

        <StepIndicator steps={uploadSteps} currentStep={fileUploadState.currentStep} />

        <UploadForm
          currentStep={currentStep}
          fileUploadState={fileUploadState}
          canProceed={canProceed}
          handlePrevStep={handlePrevStep}
          handleNextStep={handleNextStep}
          handleSkipStep={handleSkipStep}
          handleSubmitFiles={handleSubmitFiles}
          handleUploadComplete={handleUploadComplete}
          handleUploadError={handleUploadError}
          handleRemoveFile={handleRemoveFile}
          getCurrentFileUrl={getCurrentFileUrl}
        />
      </div>

      {/* List of uploaded files */}
      <FileList />
    </div>
  );
};

export default FileManagement;
