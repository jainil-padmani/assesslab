import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileUp, FilePlus, FileCheck, FileX, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { deleteFileGroup } from "@/utils/subjectFilesUtils";

type UploadStep = {
  id: number;
  title: string;
  description: string;
  fileTypes: string[];
  isRequired: boolean;
}

type FileUploadState = {
  questionPaper: File | null;
  answerKey: File | null;
  handwrittenPaper: File | null;
  subjectId: string;
  topic: string;
  currentStep: number;
}

type UploadedFile = {
  id: string;
  subject_id: string;
  subject_name: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
}

const FileManagement = () => {
  const uploadSteps: UploadStep[] = [
    {
      id: 1,
      title: "Select Subject and Topic",
      description: "Select a subject and add a topic for the files you're uploading.",
      fileTypes: [],
      isRequired: true
    },
    {
      id: 2,
      title: "Add Question Paper",
      description: "Upload the question paper file. This is required to proceed.",
      fileTypes: [".pdf", ".docx", ".png", ".jpeg", ".jpg"],
      isRequired: true
    },
    {
      id: 3,
      title: "Add Answer Key",
      description: "Upload the answer key file. This is required to proceed.",
      fileTypes: [".pdf", ".docx", ".png", ".jpeg", ".jpg"],
      isRequired: true
    },
    {
      id: 4,
      title: "Add Handwritten Paper (Optional)",
      description: "Upload handwritten answer sheets. You can skip this step if not applicable.",
      fileTypes: [".pdf", ".png", ".jpeg", ".jpg"],
      isRequired: false
    }
  ];

  const [fileUploadState, setFileUploadState] = useState<FileUploadState>({
    questionPaper: null,
    answerKey: null,
    handwrittenPaper: null,
    subjectId: "",
    topic: "",
    currentStep: 1
  });

  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [activeTab, setActiveTab] = useState("upload");

  useEffect(() => {
    fetchSubjects();
    fetchUploadedFiles();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error('Error fetching subjects:', error);
      toast.error('Failed to fetch subjects');
    }
  };

  const fetchUploadedFiles = async () => {
    try {
      // Get all files from storage.objects
      const { data: storageData, error: storageError } = await supabase
        .storage
        .from('files')
        .list();

      if (storageError) throw storageError;

      // Group files by prefix (we'll use subject_topic_ or testId_topic_ as prefix patterns)
      const fileGroups: { [key: string]: UploadedFile } = {};
      
      if (storageData) {
        // Process all files and group them
        for (const file of storageData) {
          const fileName = file.name;
          const parts = fileName.split('_');
          
          if (parts.length < 3) continue; // Skip files without proper naming
          
          const filePrefix = parts[0];
          const topic = parts[1];
          const groupKey = `${filePrefix}_${topic}`;
          
          // Determine file type
          const fileTypePart = parts[2].split('.')[0];
          const fileType = fileTypePart.includes('questionPaper') ? 'questionPaper' : 
                           fileTypePart.includes('answerKey') ? 'answerKey' : 
                           fileTypePart.includes('handwrittenPaper') ? 'handwrittenPaper' : null;
                           
          if (!fileType) continue; // Skip if not a recognized file type
          
          // Check if it's a test ID
          let subjectId = filePrefix;
          let subjectName = 'Unknown Subject';
          
          // If it's a test ID, get the subject information
          const { data: testData } = await supabase
            .from('tests')
            .select('subject_id, name')
            .eq('id', filePrefix)
            .maybeSingle();
            
          if (testData) {
            subjectId = testData.subject_id;
            const subject = subjects.find(s => s.id === subjectId);
            subjectName = subject ? `${subject.name} (Test: ${testData.name})` : `Test: ${testData.name}`;
          } else {
            // Regular subject file
            const subject = subjects.find(s => s.id === subjectId);
            subjectName = subject ? subject.name : 'Unknown Subject';
          }
          
          // Create group if it doesn't exist
          if (!fileGroups[groupKey]) {
            fileGroups[groupKey] = {
              id: groupKey,
              subject_id: subjectId,
              subject_name: subjectName,
              topic: topic,
              question_paper_url: '',
              answer_key_url: '',
              handwritten_paper_url: null,
              created_at: file.created_at || new Date().toISOString()
            };
          }
          
          // Get public URL
          const { data: { publicUrl } } = supabase
            .storage
            .from('files')
            .getPublicUrl(fileName);
          
          // Update the appropriate URL based on file type
          if (fileType === 'questionPaper') {
            fileGroups[groupKey].question_paper_url = publicUrl;
          } else if (fileType === 'answerKey') {
            fileGroups[groupKey].answer_key_url = publicUrl;
          } else if (fileType === 'handwrittenPaper') {
            fileGroups[groupKey].handwritten_paper_url = publicUrl;
          }
        }
      }
      
      // Convert groups to array and filter out incomplete entries
      const files = Object.values(fileGroups).filter(
        file => file.question_paper_url && file.answer_key_url
      );
      
      setUploadedFiles(files);
    } catch (error) {
      console.error('Error fetching uploaded files:', error);
      toast.error('Failed to fetch uploaded files');
    }
  };

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>, stepId: number) => {
    if (!event.target.files || event.target.files.length === 0) {
      return;
    }

    const file = event.target.files[0];
    
    switch (stepId) {
      case 2:
        setFileUploadState({ ...fileUploadState, questionPaper: file });
        break;
      case 3:
        setFileUploadState({ ...fileUploadState, answerKey: file });
        break;
      case 4:
        setFileUploadState({ ...fileUploadState, handwrittenPaper: file });
        break;
    }
  };

  const handleNextStep = () => {
    if (fileUploadState.currentStep < uploadSteps.length) {
      setFileUploadState({ 
        ...fileUploadState, 
        currentStep: fileUploadState.currentStep + 1 
      });
    }
  };

  const handlePrevStep = () => {
    if (fileUploadState.currentStep > 1) {
      setFileUploadState({ 
        ...fileUploadState, 
        currentStep: fileUploadState.currentStep - 1 
      });
    }
  };

  const handleSkipStep = () => {
    if (fileUploadState.currentStep === 4) {
      handleSubmitFiles();
    } else {
      handleNextStep();
    }
  };

  const uploadFile = async (file: File, uploadType: string) => {
    try {
      const fileExt = file.name.split('.').pop();
      // Create a filename pattern that contains metadata
      const fileName = `${fileUploadState.subjectId}_${fileUploadState.topic}_${uploadType}_${Date.now()}.${fileExt}`;

      const { data, error } = await supabase.storage
        .from('files')
        .upload(fileName, file);

      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('files')
        .getPublicUrl(fileName);

      return publicUrl;
    } catch (error) {
      console.error(`Error uploading ${uploadType}:`, error);
      throw error;
    }
  };

  const handleSubmitFiles = async () => {
    if (!fileUploadState.subjectId) {
      toast.error("Please select a subject");
      return;
    }

    if (!fileUploadState.topic.trim()) {
      toast.error("Please enter a topic");
      return;
    }

    if (!fileUploadState.questionPaper || !fileUploadState.answerKey) {
      toast.error("Question paper and answer key are required");
      return;
    }

    setIsUploading(true);

    try {
      await uploadFile(fileUploadState.questionPaper, 'questionPaper');
      
      await uploadFile(fileUploadState.answerKey, 'answerKey');
      
      if (fileUploadState.handwrittenPaper) {
        await uploadFile(fileUploadState.handwrittenPaper, 'handwrittenPaper');
      }
      
      toast.success("Files uploaded successfully!");
      
      setFileUploadState({
        questionPaper: null,
        answerKey: null,
        handwrittenPaper: null,
        subjectId: "",
        topic: "",
        currentStep: 1
      });

      fetchUploadedFiles();
      
      setActiveTab("files");
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteFile = async (fileGroup: UploadedFile) => {
    try {
      const [filePrefix, topic] = fileGroup.id.split('_');
      const success = await deleteFileGroup(filePrefix, topic);
      
      if (success) {
        fetchUploadedFiles();
      }
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files");
    }
  };

  const currentStep = uploadSteps.find(step => step.id === fileUploadState.currentStep);
  
  if (!currentStep) return null;

  const canProceed = (step: UploadStep) => {
    if (!step.isRequired) return true;
    
    switch (step.id) {
      case 1:
        return !!fileUploadState.subjectId && !!fileUploadState.topic.trim();
      case 2:
        return !!fileUploadState.questionPaper;
      case 3:
        return !!fileUploadState.answerKey;
      case 4:
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

      <Tabs defaultValue="upload" value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
          <TabsTrigger value="files">Uploaded Files</TabsTrigger>
        </TabsList>
        
        <TabsContent value="upload" className="mt-6">
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
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {fileUploadState.currentStep === 1 ? (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="subject">Subject</Label>
                        <Select 
                          value={fileUploadState.subjectId}
                          onValueChange={(value) => setFileUploadState({...fileUploadState, subjectId: value})}
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
                          onChange={(e) => setFileUploadState({...fileUploadState, topic: e.target.value})}
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
                          onChange={(e) => handleFileSelect(e, currentStep.id)}
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
                                    setFileUploadState({ ...fileUploadState, questionPaper: null });
                                    break;
                                  case 3:
                                    setFileUploadState({ ...fileUploadState, answerKey: null });
                                    break;
                                  case 4:
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
                  {fileUploadState.currentStep < uploadSteps.length ? (
                    <Button
                      onClick={handleNextStep}
                      disabled={!canProceed(currentStep)}
                    >
                      Next
                    </Button>
                  ) : (
                    <Button
                      onClick={handleSubmitFiles}
                      disabled={!canProceed(currentStep) || isUploading}
                    >
                      {isUploading ? "Uploading..." : "Submit Files"}
                    </Button>
                  )}
                </div>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
              <CardDescription>A list of all uploaded files by subject and topic</CardDescription>
            </CardHeader>
            <CardContent>
              {uploadedFiles.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No files uploaded yet
                </p>
              ) : (
                <div className="space-y-6">
                  {uploadedFiles.map((file, index) => (
                    <Card key={index} className="overflow-hidden">
                      <CardHeader className="bg-muted/50 py-3">
                        <div className="flex justify-between items-center">
                          <div>
                            <CardTitle className="text-base">{file.topic}</CardTitle>
                            <CardDescription>{file.subject_name}</CardDescription>
                          </div>
                          <div className="flex space-x-2">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleDeleteFile(file)}
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="p-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          <a 
                            href={file.question_paper_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center p-3 border rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <FilePlus className="h-5 w-5 mr-2 text-primary" />
                            <div>
                              <div className="text-sm font-medium">Question Paper</div>
                              <div className="text-xs text-muted-foreground">View document</div>
                            </div>
                          </a>
                          
                          <a 
                            href={file.answer_key_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center p-3 border rounded-md hover:bg-muted/50 transition-colors"
                          >
                            <FileCheck className="h-5 w-5 mr-2 text-primary" />
                            <div>
                              <div className="text-sm font-medium">Answer Key</div>
                              <div className="text-xs text-muted-foreground">View document</div>
                            </div>
                          </a>
                          
                          {file.handwritten_paper_url && (
                            <a 
                              href={file.handwritten_paper_url} 
                              target="_blank" 
                              rel="noopener noreferrer"
                              className="flex items-center p-3 border rounded-md hover:bg-muted/50 transition-colors"
                            >
                              <FileUp className="h-5 w-5 mr-2 text-primary" />
                              <div>
                                <div className="text-sm font-medium">Handwritten Paper</div>
                                <div className="text-xs text-muted-foreground">View document</div>
                              </div>
                            </a>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FileManagement;
