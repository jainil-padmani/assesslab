
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
import { Button } from "@/components/ui/button";
import { FileUp, Filter, Grid, List } from "lucide-react";

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

  const [viewMode, setViewMode] = React.useState<'grid' | 'list'>('grid');
  const [filterType, setFilterType] = React.useState<string>('all');

  // Filter files by type
  const filteredFiles = React.useMemo(() => {
    if (filterType === 'all') return uploadedFiles;
    
    return uploadedFiles.filter(file => {
      if (filterType === 'question_paper') {
        return file.document_type === 'question_paper';
      } else if (filterType === 'answer_key') {
        return file.document_type === 'answer_key';
      } else if (filterType === 'answer_sheet') {
        return file.document_type === 'answer_sheet';
      } else if (filterType === 'study_material') {
        return file.document_type === 'study_material';
      }
      return true;
    });
  }, [uploadedFiles, filterType]);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">File Hub</h1>
          <p className="text-muted-foreground mt-1">Manage your question papers, answer keys, and study materials</p>
        </div>
        <Button onClick={() => setActiveTab('upload')}>
          <FileUp className="mr-2 h-4 w-4" />
          Upload Files
        </Button>
      </div>

      <Tabs defaultValue="files" value={activeTab} onValueChange={setActiveTab} className="w-full mb-8">
        <TabsList className="grid w-full max-w-md grid-cols-2">
          <TabsTrigger value="files">Uploaded Files</TabsTrigger>
          <TabsTrigger value="upload">Upload Files</TabsTrigger>
        </TabsList>
        
        <TabsContent value="files" className="mt-6">
          <Card>
            <CardHeader className="pb-2">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle>Uploaded Files</CardTitle>
                  <CardDescription>A library of all your educational resources</CardDescription>
                </div>
                <div className="flex gap-2">
                  <select 
                    className="h-9 w-[200px] rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                  >
                    <option value="all">All Files</option>
                    <option value="question_paper">Question Papers</option>
                    <option value="answer_key">Answer Keys</option>
                    <option value="answer_sheet">Answer Sheets</option>
                    <option value="study_material">Study Materials</option>
                  </select>
                  <div className="border rounded-md flex">
                    <Button 
                      variant={viewMode === 'grid' ? 'default' : 'ghost'} 
                      size="icon" 
                      onClick={() => setViewMode('grid')}
                      className="rounded-r-none"
                    >
                      <Grid className="h-4 w-4" />
                    </Button>
                    <Button 
                      variant={viewMode === 'list' ? 'default' : 'ghost'} 
                      size="icon" 
                      onClick={() => setViewMode('list')}
                      className="rounded-l-none"
                    >
                      <List className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <FilesList 
                uploadedFiles={filteredFiles}
                currentUserId={currentUserId}
                onDeleteFile={handleDeleteFile}
                viewMode={viewMode}
              />
            </CardContent>
          </Card>
        </TabsContent>
        
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
      </Tabs>
    </div>
  );
};

export default FileManagement;
