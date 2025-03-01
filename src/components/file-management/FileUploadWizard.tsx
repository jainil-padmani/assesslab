
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  ChevronLeft, 
  ChevronRight, 
  FileText, 
  Upload, 
  Check, 
  X,
  FileUp,
  BookOpen, 
  PenTool
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";

interface FileUploadWizardProps {
  subject: Subject;
  onClose: () => void;
}

type UploadStep = {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  required: boolean;
};

export function FileUploadWizard({ subject, onClose }: FileUploadWizardProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const [files, setFiles] = useState<{
    questionPaper: File | null;
    answerKey: File | null;
    handwrittenPaper: File | null;
  }>({
    questionPaper: null,
    answerKey: null,
    handwrittenPaper: null,
  });

  const steps: UploadStep[] = [
    {
      id: "questionPaper",
      title: "Upload Question Paper",
      description: "Upload the question paper for this subject. Supported formats: PDF, DOCX, PNG, JPEG.",
      icon: <BookOpen className="h-6 w-6" />,
      required: true,
    },
    {
      id: "answerKey",
      title: "Upload Answer Key",
      description: "Upload the answer key for this subject. Supported formats: PDF, DOCX, PNG, JPEG.",
      icon: <FileText className="h-6 w-6" />,
      required: true,
    },
    {
      id: "handwrittenPaper",
      title: "Upload Handwritten Paper (Optional)",
      description: "Upload handwritten answer sheets if available. Supported formats: PDF, PNG, JPEG.",
      icon: <PenTool className="h-6 w-6" />,
      required: false,
    },
  ];

  const currentStep = steps[currentStepIndex];

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileType = file.type;
    const validTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'image/png',
      'image/jpeg',
    ];

    if (!validTypes.includes(fileType)) {
      toast.error('Please upload PDF, DOCX, PNG, or JPEG files only');
      return;
    }

    setFiles({
      ...files,
      [currentStep.id]: file,
    });
  };

  const handlePrevStep = () => {
    if (currentStepIndex > 0) {
      setCurrentStepIndex(currentStepIndex - 1);
    }
  };

  const handleNextStep = () => {
    if (currentStep.required && !files[currentStep.id as keyof typeof files]) {
      toast.error(`Please upload a ${currentStep.title.toLowerCase()} first`);
      return;
    }

    if (currentStepIndex < steps.length - 1) {
      setCurrentStepIndex(currentStepIndex + 1);
    } else {
      handleUploadAll();
    }
  };

  const handleSkip = () => {
    if (!currentStep.required) {
      if (currentStepIndex < steps.length - 1) {
        setCurrentStepIndex(currentStepIndex + 1);
      } else {
        handleUploadAll();
      }
    }
  };

  const handleUploadAll = async () => {
    setIsUploading(true);
    try {
      const uploads = [];

      // Upload each file that exists
      for (const step of steps) {
        const file = files[step.id as keyof typeof files];
        if (file) {
          const fileExt = file.name.split('.').pop();
          const fileName = `${subject.id}_${step.id}_${Date.now()}.${fileExt}`;
          
          const { data, error } = await supabase.storage
            .from('subject-documents')
            .upload(fileName, file);

          if (error) throw error;

          const fileUrl = supabase.storage
            .from('subject-documents')
            .getPublicUrl(fileName).data.publicUrl;

          // Store file reference in database
          const { error: dbError } = await supabase
            .from('subject_documents')
            .insert({
              subject_id: subject.id,
              document_type: step.id,
              document_url: fileUrl,
              file_name: file.name,
              file_type: file.type,
              file_size: file.size,
            });

          if (dbError) throw dbError;
          uploads.push(step.id);
        }
      }

      toast.success(`Successfully uploaded ${uploads.join(', ')} for ${subject.name}`);
      onClose();
    } catch (error: any) {
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileUp className="h-5 w-5 text-accent" />
            <span>Upload Documents for {subject.name}</span>
          </div>
          <div className="text-sm font-normal text-muted-foreground">
            Step {currentStepIndex + 1} of {steps.length}
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col md:flex-row gap-8">
          {/* Step navigation sidebar */}
          <div className="w-full md:w-1/4">
            <ul className="space-y-4">
              {steps.map((step, index) => (
                <li 
                  key={step.id}
                  className={`flex items-center gap-3 p-3 rounded-md cursor-pointer ${
                    index === currentStepIndex 
                      ? 'bg-accent/20 border-l-4 border-accent' 
                      : 'text-muted-foreground hover:bg-muted/50'
                  }`}
                  onClick={() => {
                    if (!steps[index].required || files[steps[index].id as keyof typeof files]) {
                      setCurrentStepIndex(index);
                    } else if (index > 0 && !files[steps[index-1].id as keyof typeof files] && steps[index-1].required) {
                      toast.error(`Please complete step ${index} first`);
                    } else {
                      setCurrentStepIndex(index);
                    }
                  }}
                >
                  <div className={`p-2 rounded-full ${
                    files[step.id as keyof typeof files] 
                      ? 'bg-green-100 text-green-600' 
                      : index === currentStepIndex 
                        ? 'bg-accent/10 text-accent' 
                        : 'bg-muted'
                  }`}>
                    {files[step.id as keyof typeof files] ? (
                      <Check className="h-4 w-4" />
                    ) : (
                      step.icon
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-sm">{step.title}</p>
                    {step.required ? (
                      <span className="text-xs text-red-500">Required</span>
                    ) : (
                      <span className="text-xs text-muted-foreground">Optional</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Current step content */}
          <div className="w-full md:w-3/4 space-y-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-3 bg-accent/10 rounded-md text-accent">
                {currentStep.icon}
              </div>
              <div>
                <h3 className="text-lg font-medium">{currentStep.title}</h3>
                <p className="text-muted-foreground">{currentStep.description}</p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-8 text-center">
                <div className="flex flex-col items-center gap-4">
                  <Upload className="h-10 w-10 text-muted-foreground/50" />
                  
                  {files[currentStep.id as keyof typeof files] ? (
                    <div className="flex flex-col items-center">
                      <p className="text-sm font-medium">
                        {files[currentStep.id as keyof typeof files]?.name}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {(files[currentStep.id as keyof typeof files]?.size || 0) / 1024 < 1000 
                          ? `${Math.round((files[currentStep.id as keyof typeof files]?.size || 0) / 1024)} KB` 
                          : `${Math.round((files[currentStep.id as keyof typeof files]?.size || 0) / 1024 / 1024 * 10) / 10} MB`}
                      </p>
                      <Button 
                        variant="destructive" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => {
                          setFiles({
                            ...files,
                            [currentStep.id]: null,
                          });
                        }}
                      >
                        <X className="mr-1 h-4 w-4" />
                        Remove File
                      </Button>
                    </div>
                  ) : (
                    <>
                      <div className="space-y-1 text-center">
                        <p className="text-sm font-medium">
                          Drag and drop your file here or
                        </p>
                        <p className="text-xs text-muted-foreground">
                          PDF, DOCX, PNG, or JPEG up to 10MB
                        </p>
                      </div>

                      <Label htmlFor="file-upload" className="cursor-pointer">
                        <div className="bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md text-sm font-medium flex items-center">
                          <Upload className="mr-2 h-4 w-4" />
                          Browse Files
                        </div>
                        <Input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          onChange={handleFileChange}
                          accept=".pdf,.docx,.png,.jpg,.jpeg"
                        />
                      </Label>
                    </>
                  )}
                </div>
              </div>

              {/* Progress indicator */}
              <div className="w-full bg-muted rounded-full h-2.5 mt-6">
                <div 
                  className="bg-accent h-2.5 rounded-full" 
                  style={{ width: `${((currentStepIndex + 1) / steps.length) * 100}%` }} 
                ></div>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div>
          <Button
            variant="outline"
            onClick={onClose}
          >
            Cancel
          </Button>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handlePrevStep}
            disabled={currentStepIndex === 0}
          >
            <ChevronLeft className="mr-1 h-4 w-4" />
            Previous
          </Button>
          
          {!currentStep.required && (
            <Button
              variant="outline"
              onClick={handleSkip}
            >
              Skip
            </Button>
          )}
          
          <Button
            onClick={handleNextStep}
            disabled={isUploading || (currentStep.required && !files[currentStep.id as keyof typeof files])}
          >
            {isUploading ? "Uploading..." : currentStepIndex === steps.length - 1 ? "Finish" : "Next"}
            {!isUploading && currentStepIndex !== steps.length - 1 && <ChevronRight className="ml-1 h-4 w-4" />}
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
}
