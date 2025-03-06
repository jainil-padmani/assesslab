
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import FileUploadSteps from '@/components/fileManagement/FileUploadSteps';
import FilesList from '@/components/fileManagement/FilesList';
import { useFileManagement } from '@/components/fileManagement/useFileManagement';

const FileManagement = () => {
  const {
    uploadSteps,
    fileUploadState,
    setFileUploadState,
    subjects,
    uploadedFiles,
    isUploading,
    activeTab,
    setActiveTab,
    currentUserId,
    handleFileSelect,
    handleNextStep,
    handlePrevStep,
    handleSkipStep,
    handleSubmitFiles,
    handleDeleteFile,
  } = useFileManagement();

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
          <FileUploadSteps 
            uploadSteps={uploadSteps}
            fileUploadState={fileUploadState}
            subjects={subjects}
            isUploading={isUploading}
            onFileSelect={handleFileSelect}
            onSubjectChange={(value) => {
              setFileUploadState({ ...fileUploadState, subjectId: value });
            }}
            onTopicChange={(value) => {
              setFileUploadState({ ...fileUploadState, topic: value });
            }}
            onNextStep={handleNextStep}
            onPrevStep={handlePrevStep}
            onSkipStep={handleSkipStep}
            onSubmitFiles={handleSubmitFiles}
          />
        </TabsContent>
        
        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Uploaded Files</CardTitle>
              <CardDescription>A list of all uploaded files by subject and topic</CardDescription>
            </CardHeader>
            <CardContent>
              <FilesList 
                uploadedFiles={uploadedFiles}
                currentUserId={currentUserId}
                onDeleteFile={handleDeleteFile}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default FileManagement;
