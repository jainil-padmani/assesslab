import React, { useState } from 'react';
import { useFileUpload } from '@/hooks/useFileUpload';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from 'sonner';
import { FileText, Upload, AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import { validateFileFormat } from '@/utils/assessment/fileValidation';
import { deletePreviousFiles } from '@/utils/assessment/fileCleanup';

export default function Analysis() {
  const [files, setFiles] = useState<{ question: File | null; answer: File | null }>({
    question: null,
    answer: null,
  });
  const [uploadedFiles, setUploadedFiles] = useState<{ question: string | null; answer: string | null }>({
    question: null,
    answer: null,
  });
  const [analysisResults, setAnalysisResults] = useState<any>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { uploadFile, isUploading, progress } = useFileUpload();

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>, type: 'question' | 'answer') => {
    if (event.target.files && event.target.files[0]) {
      const file = event.target.files[0];
      
      if (!validateFileFormat(file)) {
        toast.error('Invalid file format. Please upload PDF, PNG, or JPG files only.');
        return;
      }
      
      setFiles((prev) => ({
        ...prev,
        [type]: file,
      }));
      
      // Reset the uploaded URL when a new file is selected
      if (uploadedFiles[type]) {
        setUploadedFiles(prev => ({
          ...prev,
          [type]: null
        }));
      }
    }
  };

  const handleUpload = async () => {
    const filesToUpload = [];
    const previousUrls = [];
    
    if (files.question) {
      filesToUpload.push({
        file: files.question,
        type: 'question' as const,
        folder: 'questions',
      });
      
      if (uploadedFiles.question) {
        previousUrls.push(uploadedFiles.question);
      }
    }

    if (files.answer) {
      filesToUpload.push({
        file: files.answer,
        type: 'answer' as const,
        folder: 'answers',
      });
      
      if (uploadedFiles.answer) {
        previousUrls.push(uploadedFiles.answer);
      }
    }
    
    if (filesToUpload.length === 0) {
      toast.error('Please select at least one file to upload');
      return;
    }
    
    // Delete previous files if they exist
    if (previousUrls.length > 0) {
      await deletePreviousFiles(previousUrls);
    }
    
    // Upload new files
    for (const { file, type, folder } of filesToUpload) {
      try {
        const fileTypes = ['.pdf', '.jpg', '.jpeg', '.png'];
        const result = await uploadFile(file, {
          folder,
          fileTypes,
          maxSizeMB: 10,
        });
        
        if (result.error) {
          toast.error(`Error uploading ${type} file: ${result.error}`);
        } else {
          toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} file uploaded successfully`);
          setUploadedFiles(prev => ({
            ...prev,
            [type]: result.url
          }));
        }
      } catch (error: any) {
        toast.error(`Error uploading ${type} file: ${error.message}`);
      }
    }
  };
  
  const handleAnalyze = async () => {
    if (!uploadedFiles.question && !uploadedFiles.answer) {
      toast.error('Please upload at least one file to analyze');
      return;
    }
    
    setIsAnalyzing(true);
    
    try {
      // Mock analysis for now - replace with actual API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      setAnalysisResults({
        difficulty: 'Medium',
        bloomsLevel: {
          remember: 30,
          understand: 25,
          apply: 20,
          analyze: 15,
          evaluate: 5,
          create: 5
        },
        questionTypes: {
          mcq: 60,
          shortAnswer: 25,
          longAnswer: 15
        },
        topicsCovered: ['Algebra', 'Calculus', 'Geometry'],
        suggestedImprovements: [
          'Add more higher-order thinking questions',
          'Balance the distribution of topics better',
          'Consider adding more application-based questions'
        ]
      });
      
      toast.success('Analysis completed successfully');
    } catch (error: any) {
      toast.error(`Analysis failed: ${error.message}`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <div className="container mx-auto py-6">
      <Card>
        <CardHeader>
          <CardTitle>Question Paper Analysis</CardTitle>
          <CardDescription>
            Upload question papers and answer keys to analyze their quality and structure
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="upload">
            <TabsList className="mb-4">
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
              <TabsTrigger value="results" disabled={!analysisResults}>Analysis Results</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload">
              <div className="grid gap-6">
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertTitle>Important</AlertTitle>
                  <AlertDescription>
                    For best results, upload both the question paper and answer key in PDF format.
                  </AlertDescription>
                </Alert>
                
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="questionFile">Question Paper</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="questionFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'question')}
                        className="flex-1"
                      />
                      {files.question && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{files.question.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="answerFile">Answer Key (Optional)</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Input
                        id="answerFile"
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => handleFileChange(e, 'answer')}
                        className="flex-1"
                      />
                      {files.answer && (
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4" />
                          <span className="text-sm">{files.answer.name}</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  {isUploading && (
                    <div className="mt-2">
                      <Progress value={progress} className="h-2" />
                      <p className="text-sm text-center mt-1">Uploading... {progress}%</p>
                    </div>
                  )}
                  
                  <div className="flex gap-2 mt-4">
                    <Button 
                      onClick={handleUpload} 
                      disabled={isUploading || (!files.question && !files.answer)}
                    >
                      <Upload className="mr-2 h-4 w-4" />
                      Upload Files
                    </Button>
                    
                    <Button 
                      onClick={handleAnalyze} 
                      disabled={isAnalyzing || (!uploadedFiles.question && !uploadedFiles.answer)}
                      variant="secondary"
                    >
                      {isAnalyzing ? 'Analyzing...' : 'Analyze Paper'}
                    </Button>
                  </div>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="results">
              {analysisResults && (
                <div className="grid gap-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Difficulty Level</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <p className="text-2xl font-bold">{analysisResults.difficulty}</p>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Question Types</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-1">
                          <li className="flex justify-between">
                            <span>Multiple Choice</span>
                            <span>{analysisResults.questionTypes.mcq}%</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Short Answer</span>
                            <span>{analysisResults.questionTypes.shortAnswer}%</span>
                          </li>
                          <li className="flex justify-between">
                            <span>Long Answer</span>
                            <span>{analysisResults.questionTypes.longAnswer}%</span>
                          </li>
                        </ul>
                      </CardContent>
                    </Card>
                    
                    <Card>
                      <CardHeader className="pb-2">
                        <CardTitle className="text-lg">Topics Covered</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="list-disc list-inside">
                          {analysisResults.topicsCovered.map((topic: string, index: number) => (
                            <li key={index}>{topic}</li>
                          ))}
                        </ul>
                      </CardContent>
                    </Card>
                  </div>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Bloom's Taxonomy Distribution</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {Object.entries(analysisResults.bloomsLevel).map(([level, percentage]: [string, any]) => (
                          <div key={level} className="space-y-1">
                            <div className="flex justify-between text-sm">
                              <span className="capitalize">{level}</span>
                              <span>{percentage}%</span>
                            </div>
                            <div className="w-full bg-secondary rounded-full h-2">
                              <div 
                                className="bg-primary h-2 rounded-full" 
                                style={{ width: `${percentage}%` }}
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                  
                  <Card>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg">Suggested Improvements</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <ul className="list-disc list-inside space-y-1">
                        {analysisResults.suggestedImprovements.map((suggestion: string, index: number) => (
                          <li key={index}>{suggestion}</li>
                        ))}
                      </ul>
                    </CardContent>
                  </Card>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
