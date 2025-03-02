
import React, { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger
} from "@/components/ui/tabs";
import {
  FilePlus, 
  FileCheck, 
  Trash2, 
  FileUp 
} from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Test } from "@/types/tests";
import type { SubjectFile } from "@/types/dashboard";
import { useQuery } from "@tanstack/react-query";
import { 
  fetchSubjectFiles, 
  assignSubjectFilesToTest, 
  uploadTestFiles,
  fetchTestFiles
} from "@/utils/subjectFilesUtils";

interface TestPapersProps {
  test: Test & { subjects: { name: string, subject_code: string } };
}

interface TestFile {
  id: string;
  test_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
}

export function TestPapersManagement({ test }: TestPapersProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [uploadTab, setUploadTab] = useState<"new" | "existing">("new");
  const [questionPaper, setQuestionPaper] = useState<File | null>(null);
  const [answerKey, setAnswerKey] = useState<File | null>(null);
  const [topicName, setTopicName] = useState<string>(test.name || ""); // Pre-fill with test name
  const [selectedExistingFile, setSelectedExistingFile] = useState<string | null>(null);

  // Fetch existing test files
  const { data: testFiles, refetch: refetchTestFiles } = useQuery({
    queryKey: ["testFiles", test.id],
    queryFn: () => fetchTestFiles(test.id)
  });

  // Fetch subject files that could be assigned to this test
  const { data: subjectFiles } = useQuery({
    queryKey: ["subjectFiles", test.subject_id],
    queryFn: () => fetchSubjectFiles(test.subject_id)
  });

  const uploadTestPaper = async () => {
    if (uploadTab === "new") {
      if (!test.id || !questionPaper || !answerKey || !topicName) {
        toast.error("Please provide a topic name and select both question paper and answer key");
        return;
      }

      setIsUploading(true);

      try {
        // Use sanitized topic name for consistency
        const sanitizedTopic = topicName.trim().replace(/\s+/g, '_');
        
        // Use the utility function to upload files with null for handwritten paper
        const success = await uploadTestFiles(
          test.id, 
          test.subject_id, 
          sanitizedTopic, 
          questionPaper, 
          answerKey, 
          null // Pass null for handwritten paper
        );
        
        if (success) {
          toast.success("Files uploaded successfully!");
          
          setQuestionPaper(null);
          setAnswerKey(null);
          setOpenUploadDialog(false);
          
          // Refresh the file list
          refetchTestFiles();
        }
      } catch (error: any) {
        console.error("Error uploading files:", error);
        toast.error(`Failed to upload files: ${error.message}`);
      } finally {
        setIsUploading(false);
      }
    } else {
      // Assign existing subject file
      if (!selectedExistingFile) {
        toast.error("Please select a file to assign");
        return;
      }

      setIsUploading(true);
      
      try {
        const fileToAssign = subjectFiles?.find(file => file.id === selectedExistingFile);
        
        if (!fileToAssign) {
          throw new Error("Selected file not found");
        }
        
        const success = await assignSubjectFilesToTest(test.id, fileToAssign);
        
        if (success) {
          setOpenUploadDialog(false);
          setSelectedExistingFile(null);
          refetchTestFiles();
        }
      } catch (error) {
        console.error("Error assigning files:", error);
        toast.error("Failed to assign files. Please try again.");
      } finally {
        setIsUploading(false);
      }
    }
  };

  const handleDeleteFile = async (file: TestFile) => {
    try {
      const { data: storageFiles, error: listError } = await supabase
        .storage
        .from('files')
        .list();
        
      if (listError) throw listError;
      
      const groupPrefix = `${file.test_id}_${file.topic}_`;
      const filesToDelete = storageFiles?.filter(storageFile => 
        storageFile.name.startsWith(groupPrefix)
      ) || [];
        
      for (const storageFile of filesToDelete) {
        const { error: deleteError } = await supabase
          .storage
          .from('files')
          .remove([storageFile.name]);
            
        if (deleteError) throw deleteError;
      }

      // Also delete the corresponding subject files if they exist
      const subjectPrefix = `${test.subject_id}_${file.topic}_`;
      const subjectFilesToDelete = storageFiles?.filter(storageFile => 
        storageFile.name.startsWith(subjectPrefix)
      ) || [];
      
      for (const storageFile of subjectFilesToDelete) {
        await supabase
          .storage
          .from('files')
          .remove([storageFile.name]);
      }

      toast.success("Files deleted successfully");
      refetchTestFiles();
    } catch (error) {
      console.error("Error deleting files:", error);
      toast.error("Failed to delete files");
    }
  };

  return (
    <Card className="mb-8">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <div>
          <CardTitle>Test Papers</CardTitle>
          <CardDescription>Manage question papers and answer keys for this test</CardDescription>
        </div>
        <Dialog open={openUploadDialog} onOpenChange={setOpenUploadDialog}>
          <DialogTrigger asChild>
            <Button>
              <FilePlus className="mr-2 h-4 w-4" />
              Upload Papers
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Upload Test Papers</DialogTitle>
              <DialogDescription>
                Add a question paper and its answer key for {test.name}.
              </DialogDescription>
            </DialogHeader>
            
            <Tabs defaultValue="new" value={uploadTab} onValueChange={(value) => setUploadTab(value as "new" | "existing")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="new">Upload New Files</TabsTrigger>
                <TabsTrigger value="existing">Use Existing Files</TabsTrigger>
              </TabsList>
              
              <TabsContent value="new" className="mt-4">
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="topic-name" className="text-right">
                      Topic Name
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="topic-name"
                        value={topicName}
                        onChange={(e) => setTopicName(e.target.value)}
                        placeholder="e.g., Chapter 5"
                      />
                    </div>
                  </div>
                
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="question-paper" className="text-right">
                      Question Paper
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="question-paper"
                        type="file"
                        accept=".pdf,.docx,.png,.jpeg,.jpg"
                        onChange={(e) => setQuestionPaper(e.target.files?.[0] || null)}
                      />
                      {questionPaper && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {questionPaper.name}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 items-center gap-4">
                    <Label htmlFor="answer-key" className="text-right">
                      Answer Key
                    </Label>
                    <div className="col-span-3">
                      <Input
                        id="answer-key"
                        type="file"
                        accept=".pdf,.docx,.png,.jpeg,.jpg"
                        onChange={(e) => setAnswerKey(e.target.files?.[0] || null)}
                      />
                      {answerKey && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {answerKey.name}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="existing" className="mt-4">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="existing-file">Select Existing Subject Paper</Label>
                    <Select 
                      value={selectedExistingFile || ""} 
                      onValueChange={setSelectedExistingFile}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a paper" />
                      </SelectTrigger>
                      <SelectContent>
                        {subjectFiles && subjectFiles.length > 0 ? (
                          subjectFiles.map(file => (
                            <SelectItem key={file.id} value={file.id}>
                              {file.topic}
                            </SelectItem>
                          ))
                        ) : (
                          <SelectItem value="none" disabled>
                            No subject papers available
                          </SelectItem>
                        )}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedExistingFile && (
                    <div className="border rounded-md p-3 bg-muted/30">
                      <p className="text-sm font-medium mb-1">
                        Selected Paper: {subjectFiles?.find(f => f.id === selectedExistingFile)?.topic}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        This will create a copy of the selected paper for this test.
                      </p>
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
            
            <DialogFooter>
              <Button
                type="submit"
                onClick={uploadTestPaper}
                disabled={isUploading || (uploadTab === "new" ? (!questionPaper || !answerKey || !topicName) : !selectedExistingFile)}
              >
                {isUploading ? 'Uploading...' : uploadTab === "new" ? 'Upload Papers' : 'Assign Papers'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {!testFiles || testFiles.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-muted-foreground">No papers uploaded yet for this test.</p>
            <Button variant="outline" className="mt-4" onClick={() => setOpenUploadDialog(true)}>
              <FilePlus className="mr-2 h-4 w-4" />
              Add Papers
            </Button>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {testFiles.map((file) => (
              <Card key={file.id} className="overflow-hidden">
                <CardHeader className="bg-muted/50 py-3">
                  <div className="flex justify-between items-center">
                    <CardTitle className="text-base truncate" title={file.topic}>
                      {file.topic}
                    </CardTitle>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteFile(file)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardHeader>
                <CardContent className="p-4">
                  <div className="space-y-3">
                    <a 
                      href={file.question_paper_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
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
                      className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
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
                        className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
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
  );
}
