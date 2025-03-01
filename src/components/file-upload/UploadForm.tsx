
import React from 'react';
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
import { UTUploadDropzone } from "@/integrations/uploadthing/uploadthing-provider";
import type { OurFileRouter } from "@/integrations/uploadthing/uploadthing";
import { type UploadStep, type UploadEndpoint, type FileUploadState } from '@/types/fileUpload';

interface UploadFormProps {
  currentStep: UploadStep;
  fileUploadState: FileUploadState;
  canProceed: (step: UploadStep) => boolean;
  handlePrevStep: () => void;
  handleNextStep: () => void;
  handleSkipStep: () => void;
  handleSubmitFiles: () => void;
  handleUploadComplete: (endpoint: UploadEndpoint, res: { url: string }) => void;
  handleUploadError: (error: Error) => void;
  handleRemoveFile: (step: UploadStep) => void;
  getCurrentFileUrl: (step: UploadStep) => string | null;
}

export const UploadForm = ({
  currentStep,
  fileUploadState,
  canProceed,
  handlePrevStep,
  handleNextStep,
  handleSkipStep,
  handleSubmitFiles,
  handleUploadComplete,
  handleUploadError,
  handleRemoveFile,
  getCurrentFileUrl
}: UploadFormProps) => {
  return (
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
          {!getCurrentFileUrl(currentStep) ? (
            <UTUploadDropzone<OurFileRouter>
              endpoint={currentStep.endpoint}
              onClientUploadComplete={(res) => {
                if (res && res.length > 0) {
                  handleUploadComplete(currentStep.endpoint, { url: res[0].url });
                }
              }}
              onUploadError={(error) => {
                handleUploadError(error);
              }}
              className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors ut-uploading:opacity-50"
              config={{ mode: "auto" }}
            />
          ) : (
            <div className="p-4 border rounded-lg bg-background">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <FileUp className="h-4 w-4 text-primary" />
                  <span className="text-sm font-medium">
                    File uploaded successfully
                  </span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  onClick={() => handleRemoveFile(currentStep)}
                >
                  <FileX className="h-4 w-4" />
                </Button>
              </div>
              <div className="mt-2">
                <a 
                  href={getCurrentFileUrl(currentStep) || '#'} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-primary hover:underline"
                >
                  View uploaded file
                </a>
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
  );
};
