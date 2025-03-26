
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useFileUpload } from '@/hooks/useFileUpload';
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileUp, FileText, Upload, Clock, FileCheck } from "lucide-react";

export default function Analysis() {
  const navigate = useNavigate();
  const [selectedType, setSelectedType] = useState("question_paper");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [uploadedFileUrl, setUploadedFileUrl] = useState<string | null>(null);
  
  // Configure file upload for question papers
  const questionPaperUpload = useFileUpload({
    bucketName: 'files',
    folderPath: 'analysis/question_papers',
    fileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 10,
    onUploadSuccess: (url) => {
      setUploadedFileUrl(url);
      // Trigger analysis or redirect to next step
      if (url) {
        navigate(`/dashboard/analysis/result`, { 
          state: { 
            fileUrl: url, 
            fileType: selectedType,
            subjectId: selectedSubject
          } 
        });
      }
    }
  });
  
  // Configure file upload for answer keys
  const answerKeyUpload = useFileUpload({
    bucketName: 'files',
    folderPath: 'analysis/answer_keys',
    fileTypes: ['application/pdf', 'image/jpeg', 'image/png'],
    maxSize: 10,
    onUploadSuccess: (url) => {
      setUploadedFileUrl(url);
      // Trigger analysis or redirect to next step
      if (url) {
        navigate(`/dashboard/analysis/result`, { 
          state: { 
            fileUrl: url, 
            fileType: selectedType,
            subjectId: selectedSubject
          } 
        });
      }
    }
  });
  
  // Choose which upload hook to use based on selected type
  const fileUpload = selectedType === 'question_paper' ? questionPaperUpload : answerKeyUpload;
  
  return (
    <div className="container mx-auto py-6 space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Paper Analysis</h1>
        <p className="text-muted-foreground mt-1">
          Upload question papers or answer keys for AI analysis
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="col-span-1 md:col-span-2">
          <CardHeader>
            <CardTitle>Upload Paper for Analysis</CardTitle>
            <CardDescription>
              Upload a question paper or answer key to get AI-powered analysis and insights.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="document-type">Document Type</Label>
              <Select 
                value={selectedType} 
                onValueChange={setSelectedType}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select document type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="question_paper">Question Paper</SelectItem>
                  <SelectItem value="answer_key">Answer Key</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                {selectedType === 'question_paper' 
                  ? 'Upload a question paper for difficulty analysis and blooms taxonomy mapping.' 
                  : 'Upload an answer key to generate marking schemes and model answers.'}
              </p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="subject">Subject (Optional)</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No subject</SelectItem>
                  <SelectItem value="physics">Physics</SelectItem>
                  <SelectItem value="chemistry">Chemistry</SelectItem>
                  <SelectItem value="mathematics">Mathematics</SelectItem>
                  <SelectItem value="biology">Biology</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Selecting a subject improves analysis accuracy and enables subject-specific insights.
              </p>
            </div>
            
            <div className="mt-4">
              <input
                type="file"
                className="hidden"
                ref={fileUpload.fileInputRef}
                onChange={fileUpload.handleFileChange}
                accept={fileUpload.accept}
              />
              <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition-colors"
                onClick={fileUpload.openFileDialog}>
                <div className="flex flex-col items-center justify-center">
                  <FileUp className="h-10 w-10 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-medium mb-1">Upload {selectedType === 'question_paper' ? 'Question Paper' : 'Answer Key'}</h3>
                  <p className="text-sm text-muted-foreground mb-4 max-w-md mx-auto">
                    Drag and drop your file here, or click to browse. We support PDF, JPEG, and PNG files up to 10MB.
                  </p>
                  <Button disabled={fileUpload.isUploading}>
                    {fileUpload.isUploading ? (
                      <div className="flex items-center">
                        <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Uploading... {fileUpload.progress}%
                      </div>
                    ) : (
                      <div className="flex items-center">
                        <Upload className="mr-2 h-4 w-4" />
                        Upload File
                      </div>
                    )}
                  </Button>
                  {fileUpload.fileName && (
                    <div className="mt-4 text-sm text-muted-foreground">
                      Selected file: {fileUpload.fileName}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </CardContent>
          <CardFooter className="bg-muted/50 flex flex-col items-start px-6 py-4 border-t">
            <h4 className="font-medium mb-2">What to expect from the analysis:</h4>
            <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
              <li>Difficulty level assessment for each question</li>
              <li>Bloom's Taxonomy mapping and cognitive level distribution</li>
              <li>Course outcome coverage analysis</li>
              <li>Question quality evaluation</li>
              <li>Visual charts and exportable reports</li>
            </ul>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileCheck className="h-5 w-5 text-primary" />
              <CardTitle>Recently Analyzed</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-md">
                <FileText className="h-8 w-8 text-primary/70" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Physics Midterm 2023</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">Question Paper</Badge>
                    <span className="text-xs text-muted-foreground">3 days ago</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/dashboard/analysis/history')}
                >
                  View
                </Button>
              </div>
              
              <div className="flex items-center space-x-3 p-3 bg-secondary/50 rounded-md">
                <FileText className="h-8 w-8 text-primary/70" />
                <div className="flex-1">
                  <p className="font-medium text-sm">Chemistry Final Exam</p>
                  <div className="flex items-center space-x-2 mt-1">
                    <Badge variant="outline">Answer Key</Badge>
                    <span className="text-xs text-muted-foreground">5 days ago</span>
                  </div>
                </div>
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={() => navigate('/dashboard/analysis/history')}
                >
                  View
                </Button>
              </div>
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              variant="ghost" 
              className="w-full flex items-center justify-center"
              onClick={() => navigate('/dashboard/analysis/history')}
            >
              <Clock className="mr-2 h-4 w-4" /> View All Analyzed Papers
            </Button>
          </CardFooter>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center space-x-2">
              <FileUp className="h-5 w-5 text-primary" />
              <CardTitle>What You Can Upload</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="p-3 bg-secondary/50 rounded-md">
              <h4 className="font-medium mb-1">Question Papers</h4>
              <p className="text-sm text-muted-foreground">
                Upload question papers to analyze difficulty levels, bloom's taxonomy distribution, and generate rubrics.
              </p>
            </div>
            
            <div className="p-3 bg-secondary/50 rounded-md">
              <h4 className="font-medium mb-1">Answer Keys</h4>
              <p className="text-sm text-muted-foreground">
                Upload answer keys to generate detailed marking schemes, model answers, and evaluation guidelines.
              </p>
            </div>
            
            <div className="p-3 bg-secondary/50 rounded-md">
              <h4 className="font-medium mb-1">File Formats</h4>
              <p className="text-sm text-muted-foreground">
                We support PDF documents, scanned images (JPG, PNG), and typed documents.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
