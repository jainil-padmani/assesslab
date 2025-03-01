
import React, { useState } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, FilePlus, FileCheck, FileX } from "lucide-react";
import { toast } from "sonner";

// Define the upload step interface
type UploadStep = {
  id: number;
  title: string;
  description: string;
  fileTypes: string[];
  isRequired: boolean;
}

// Define the file upload form state
type FileUploadState = {
  questionPaper: File | null;
  answerKey: File | null;
  handwrittenPaper: File | null;
  currentStep: number;
}

const FileManagement = () => {
  // Define the upload steps
  const uploadSteps: UploadStep[] = [
    {
      id: 1,
      title: "Add Question Paper",
      description: "Upload the question paper file. This is required to proceed.",
      fileTypes: [".pdf", ".docx", ".png", ".jpeg", ".jpg"],
      isRequired: true
    },
    {
      id: 2,
      title: "Add Answer Key",
      description: "Upload the answer key file. This is required to proceed.",
      fileTypes: [".pdf", ".docx", ".png", ".jpeg", ".jpg"],
      isRequired: true
    },
    {
      id: 3,
      title: "Add Handwritten Paper (Optional)",
      description: "Upload handwritten answer sheets. You can skip this step if not applicable.",
      fileTypes: [".pdf", ".png", ".jpeg", ".jpg"],
      isRequired: false
    }
  ];

  // Initialize state for file upload
  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    questionPaper: null,
    answerKey: null,
    handwrittenPaper: null,
    currentStep: 1
  });

  // Handle file selection
  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, stepId: number) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    switch (stepId) {
      case 1:
        setFileUploadState({ ...fileUploadState, questionPaper: file });
        break;
      case 2:
        setFileUploadState({ ...fileUploadState, answerKey: file });
        break;
      case 3:
        setFileUploadState({ ...fileUploadState, handwrittenPaper: file });
        break;
    }
  };

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
    // Here we would integrate with UploadThing's API
    // For now, just show a success toast
    toast.success("Files uploaded successfully!");
    
    // Reset the form state
    setFileUploadState({
      questionPaper: null,
      answerKey: null,
      handwrittenPaper: null,
      currentStep: 1
    });
  };

  // Get the current step
  const currentStep = uploadSteps.find(step => step.id === fileUploadState.currentStep);
  
  if (!currentStep) return null;

  // Check if we can proceed to the next step
  const canProceed = (step: UploadStep) => {
    if (!step.isRequired) return true;
    
    switch (step.id) {
      case 1:
        return !!fileUploadState.questionPaper;
      case 2:
        return !!fileUploadState.answerKey;
      case 3:
        return true; // This step is optional
      default:
        return false;
    }
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

        <div className="flex justify-between mb-8">
          {uploadSteps.map((step) => (
            <div key={step.id} className="flex items-center">
              <div 
                className={`flex items-center justify-center w-8 h-8 rounded-full border ${
                  step.id === fileUploadState.currentStep 
                    ? 'bg-primary text-primary-foreground border-primary' 
                    : step.id < fileUploadState.currentStep 
                      ? 'bg-green-500 text-white border-green-500' 
                      : 'bg-background text-foreground border-muted'
                }`}
              >
                {step.id < fileUploadState.currentStep ? '✓' : step.id}
              </div>
              <div className="ml-2 text-sm font-medium">{step.title}</div>
              {step.id < 3 && (
                <div className="mx-2 h-0.5 w-8 bg-muted"></div>
              )}
            </div>
          ))}
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <div className="p-2 rounded-full bg-primary/10">
                {fileUploadState.currentStep === 1 && <FilePlus className="h-5 w-5 text-primary" />}
                {fileUploadState.currentStep === 2 && <FileCheck className="h-5 w-5 text-primary" />}
                {fileUploadState.currentStep === 3 && <FileUp className="h-5 w-5 text-primary" />}
              </div>
              <CardTitle>{currentStep.title}</CardTitle>
            </div>
            <CardDescription>{currentStep.description}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors">
                <FileUp className="h-8 w-8 mx-auto mb-4 text-muted-foreground" />
                <p className="mb-2 text-sm font-medium">
                  Click to upload or drag and drop
                </p>
                <p className="text-xs text-muted-foreground mb-4">
                  Supported file types: {currentStep.fileTypes.join(', ')}
                </p>
                <input
                  type="file"
                  id={`file-upload-${currentStep.id}`}
                  className="hidden"
                  accept={currentStep.fileTypes.join(',')}
                  onChange={(e) => handleFileSelect(e, currentStep.id)}
                />
                <Button
                  onClick={() => document.getElementById(`file-upload-${currentStep.id}`)?.click()}
                  variant="outline"
                >
                  Select File
                </Button>
              </div>

              {/* Display selected file */}
              {(
                (currentStep.id === 1 && fileUploadState.questionPaper) ||
                (currentStep.id === 2 && fileUploadState.answerKey) ||
                (currentStep.id === 3 && fileUploadState.handwrittenPaper)
              ) && (
                <div className="p-4 border rounded-lg bg-background">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <FileUp className="h-4 w-4 text-primary" />
                      <span className="text-sm font-medium">
                        {currentStep.id === 1 && fileUploadState.questionPaper?.name}
                        {currentStep.id === 2 && fileUploadState.answerKey?.name}
                        {currentStep.id === 3 && fileUploadState.handwrittenPaper?.name}
                      </span>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        switch (currentStep.id) {
                          case 1:
                            setFileUploadState({ ...fileUploadState, questionPaper: null });
                            break;
                          case 2:
                            setFileUploadState({ ...fileUploadState, answerKey: null });
                            break;
                          case 3:
                            setFileUploadState({ ...fileUploadState, handwrittenPaper: null });
                            break;
                        }
                      }}
                    >
                      <FileX className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              variant="outline"
              onClick={handlePrevStep}
              disabled={fileUploadState.currentStep === 1}
            >
              Previous
            </Button>
            <div className="flex space-x-2">
              {!currentStep.isRequired && (
                <Button
                  variant="ghost"
                  onClick={handleSkipStep}
                >
                  Skip
                </Button>
              )}
              {fileUploadState.currentStep < 3 ? (
                <Button
                  onClick={handleNextStep}
                  disabled={!canProceed(currentStep)}
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSubmitFiles}
                  disabled={!canProceed(currentStep)}
                >
                  Submit Files
                </Button>
              )}
            </div>
          </CardFooter>
        </Card>
      </div>

      {/* List of uploaded files would go here */}
      <Card>
        <CardHeader>
          <CardTitle>Uploaded Files</CardTitle>
          <CardDescription>A list of all uploaded files will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-center text-muted-foreground py-8">
            No files uploaded yet
          </p>
        </CardContent>
      </Card>
    </div>
  );
};

export default FileManagement;
