
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileUp, FilePlus, FileCheck, FileX, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Subject } from "@/types/dashboard";
import { Alert, AlertDescription } from "@/components/ui/alert";

export type UploadStep = {
  id: number;
  title: string;
  description: string;
  fileTypes: string[];
  isRequired: boolean;
}

export type FileUploadState = {
  questionPaper: File | null;
  answerKey: File | null;
  handwrittenPaper: File | null;
  subjectId: string;
  topic: string;
  currentStep: number;
}

interface FileUploadStepsProps {
  uploadSteps: UploadStep[];
  fileUploadState: FileUploadState;
  subjects: Subject[];
  isUploading: boolean;
  onFileSelect: (event: React.ChangeEvent<HTMLInputElement>, stepId: number) => void;
  onSubjectChange: (value: string) => void;
  onTopicChange: (value: string) => void;
  onNextStep: () => void;
  onPrevStep: () => void;
  onSkipStep: () => void;
  onSubmitFiles: () => void;
}

const FileUploadSteps: React.FC<FileUploadStepsProps> = ({
  uploadSteps,
  fileUploadState,
  subjects,
  isUploading,
  onFileSelect,
  onSubjectChange,
  onTopicChange,
  onNextStep,
  onPrevStep,
  onSkipStep,
  onSubmitFiles
}) => {
  const currentStep = uploadSteps.find(step => step.id === fileUploadState.currentStep);
  
  if (!currentStep) return null;

  const canProceed = (step: UploadStep) => {
    if (step.id === 3) {
      // Answer key is now required, regardless of the isRequired flag
      return !!fileUploadState.answerKey;
    } else if (!step.isRequired) {
      return true;
    } else {
      switch (step.id) {
        case 1:
          return !!fileUploadState.subjectId && !!fileUploadState.topic.trim();
        case 2:
          return !!fileUploadState.questionPaper;
        case 4:
          return true;
        default:
          return false;
      }
    }
  };

  return (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold">Upload Files</h2>
        <div className="text-sm text-muted-foreground">
          Step {fileUploadState.currentStep} of {uploadSteps.length}
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
            {step.id < uploadSteps.length && (
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
              {fileUploadState.currentStep === 2 && <FilePlus className="h-5 w-5 text-primary" />}
              {fileUploadState.currentStep === 3 && <FileCheck className="h-5 w-5 text-primary" />}
              {fileUploadState.currentStep === 4 && <FileUp className="h-5 w-5 text-primary" />}
            </div>
            <CardTitle>{currentStep.title}</CardTitle>
          </div>
          <CardDescription>{currentStep.description}</CardDescription>
          
          {fileUploadState.currentStep === 3 && (
            <Alert className="mt-4 flex items-center space-x-2 rounded-md bg-amber-50 border-amber-300 text-amber-900 dark:bg-amber-950 dark:border-amber-700 dark:text-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
              <AlertDescription className="text-sm">
                Answer key is now required for all paper uploads.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fileUploadState.currentStep === 1 ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select 
                    value={fileUploadState.subjectId}
                    onValueChange={onSubjectChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="topic">Topic</Label>
                  <Input
                    id="topic"
                    placeholder="Enter topic or title for these files"
                    value={fileUploadState.topic}
                    onChange={(e) => onTopicChange(e.target.value)}
                  />
                </div>
              </div>
            ) : (
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
                    onChange={(e) => onFileSelect(e, currentStep.id)}
                  />
                  <Button
                    onClick={() => document.getElementById(`file-upload-${currentStep.id}`)?.click()}
                    variant="outline"
                  >
                    Select File
                  </Button>
                </div>

                {(
                  (currentStep.id === 2 && fileUploadState.questionPaper) ||
                  (currentStep.id === 3 && fileUploadState.answerKey) ||
                  (currentStep.id === 4 && fileUploadState.handwrittenPaper)
                ) && (
                  <div className="p-4 border rounded-lg bg-background">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <FileUp className="h-4 w-4 text-primary" />
                        <span className="text-sm font-medium">
                          {currentStep.id === 2 && fileUploadState.questionPaper?.name}
                          {currentStep.id === 3 && fileUploadState.answerKey?.name}
                          {currentStep.id === 4 && fileUploadState.handwrittenPaper?.name}
                        </span>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => {
                          switch (currentStep.id) {
                            case 2:
                              onFileSelect({ target: { files: null } } as any, 2);
                              break;
                            case 3:
                              onFileSelect({ target: { files: null } } as any, 3);
                              break;
                            case 4:
                              onFileSelect({ target: { files: null } } as any, 4);
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
            )}
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            onClick={onPrevStep}
            disabled={fileUploadState.currentStep === 1}
          >
            Previous
          </Button>
          <div className="flex space-x-2">
            {fileUploadState.currentStep !== 3 && !currentStep.isRequired && (
              <Button
                variant="ghost"
                onClick={onSkipStep}
              >
                Skip
              </Button>
            )}
            {fileUploadState.currentStep < uploadSteps.length ? (
              <Button
                onClick={onNextStep}
                disabled={!canProceed(currentStep)}
              >
                Next
              </Button>
            ) : (
              <Button
                onClick={onSubmitFiles}
                disabled={!canProceed(currentStep) || isUploading}
              >
                {isUploading ? "Uploading..." : "Submit Files"}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default FileUploadSteps;
