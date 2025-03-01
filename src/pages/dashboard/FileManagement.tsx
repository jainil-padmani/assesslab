
import React, { useState, useEffect } from 'react';
import { toast } from "sonner";
import { StepIndicator } from '@/components/file-upload/StepIndicator';
import { UploadForm } from '@/components/file-upload/UploadForm';
import { FileList } from '@/components/file-upload/FileList';
import { type UploadStep, type FileUploadState, type UploadEndpoint } from '@/types/fileUpload';
import { supabase } from "@/integrations/supabase/client";

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

  // Store file metadata for each upload
  const [fileMetadata, setFileMetadata] = useState<{
    [key in UploadEndpoint]?: {
      name: string;
      size: number;
      type: string;
    }
  }>({});

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

  // Save file record to Supabase
  const saveFileToSupabase = async (
    fileUrl: string,
    fileName: string,
    fileSize: number,
    fileType: string,
    uploadType: UploadEndpoint
  ) => {
    try {
      const { data, error } = await supabase
        .from('file_uploads')
        .insert({
          file_name: fileName,
          file_type: fileType,
          file_size: fileSize,
          file_url: fileUrl,
          upload_type: uploadType
        })
        .select();

      if (error) {
        throw error;
      }

      console.log('File saved to Supabase:', data);
      return data;
    } catch (error) {
      console.error('Error saving file to Supabase:', error);
      throw error;
    }
  };

  // Handle file submission
  const handleSubmitFiles = async () => {
    try {
      // Save all files to Supabase if they haven't been saved already
      const promises = [];

      if (fileUploadState.questionPaperUrl && fileMetadata.questionPaper) {
        promises.push(
          saveFileToSupabase(
            fileUploadState.questionPaperUrl,
            fileMetadata.questionPaper.name,
            fileMetadata.questionPaper.size,
            fileMetadata.questionPaper.type,
            'questionPaper'
          )
        );
      }

      if (fileUploadState.answerKeyUrl && fileMetadata.answerKey) {
        promises.push(
          saveFileToSupabase(
            fileUploadState.answerKeyUrl,
            fileMetadata.answerKey.name,
            fileMetadata.answerKey.size,
            fileMetadata.answerKey.type,
            'answerKey'
          )
        );
      }

      if (fileUploadState.handwrittenPaperUrl && fileMetadata.handwrittenPaper) {
        promises.push(
          saveFileToSupabase(
            fileUploadState.handwrittenPaperUrl,
            fileMetadata.handwrittenPaper.name,
            fileMetadata.handwrittenPaper.size,
            fileMetadata.handwrittenPaper.type,
            'handwrittenPaper'
          )
        );
      }

      await Promise.all(promises);
      toast.success("Files uploaded and saved successfully!");
      
      // Reset the form state
      setFileUploadState({
        questionPaperUrl: null,
        answerKeyUrl: null,
        handwrittenPaperUrl: null,
        currentStep: 1
      });
      setFileMetadata({});
    } catch (error) {
      console.error('Error during file submission:', error);
      toast.error("Failed to save files. Please try again.");
    }
  };

  // Handle upload complete
  const handleUploadComplete = async (
    endpoint: UploadEndpoint, 
    res: { url: string, name: string, size: number, type: string }
  ) => {
    try {
      toast.success(`${endpoint} uploaded successfully!`);

      // Save file metadata
      setFileMetadata(prev => ({
        ...prev,
        [endpoint]: {
          name: res.name,
          size: res.size,
          type: res.type
        }
      }));

      // Update file URL in state
      if (endpoint === "questionPaper") {
        setFileUploadState({ ...fileUploadState, questionPaperUrl: res.url });
      } else if (endpoint === "answerKey") {
        setFileUploadState({ ...fileUploadState, answerKeyUrl: res.url });
      } else if (endpoint === "handwrittenPaper") {
        setFileUploadState({ ...fileUploadState, handwrittenPaperUrl: res.url });
      }

      // Save to Supabase immediately
      await saveFileToSupabase(
        res.url,
        res.name,
        res.size,
        res.type,
        endpoint
      );
    } catch (error) {
      console.error('Error during upload complete:', error);
      toast.error("Failed to save file. Please try again.");
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
  const handleRemoveFile = async (step: UploadStep) => {
    try {
      // Get the file URL to remove
      let fileUrl: string | null = null;

      switch (step.id) {
        case 1:
          fileUrl = fileUploadState.questionPaperUrl;
          setFileUploadState({ ...fileUploadState, questionPaperUrl: null });
          setFileMetadata(prev => {
            const newMetadata = { ...prev };
            delete newMetadata.questionPaper;
            return newMetadata;
          });
          break;
        case 2:
          fileUrl = fileUploadState.answerKeyUrl;
          setFileUploadState({ ...fileUploadState, answerKeyUrl: null });
          setFileMetadata(prev => {
            const newMetadata = { ...prev };
            delete newMetadata.answerKey;
            return newMetadata;
          });
          break;
        case 3:
          fileUrl = fileUploadState.handwrittenPaperUrl;
          setFileUploadState({ ...fileUploadState, handwrittenPaperUrl: null });
          setFileMetadata(prev => {
            const newMetadata = { ...prev };
            delete newMetadata.handwrittenPaper;
            return newMetadata;
          });
          break;
      }

      if (fileUrl) {
        // Also delete from Supabase if it exists
        const { error } = await supabase
          .from('file_uploads')
          .delete()
          .eq('file_url', fileUrl);

        if (error) {
          console.error('Error deleting file from Supabase:', error);
        }
      }

      toast.info(`${step.title} has been removed.`);
    } catch (error) {
      console.error('Error removing file:', error);
      toast.error("Failed to remove file. Please try again.");
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
