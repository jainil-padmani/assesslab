import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFileUpload } from '@/hooks/useFileUpload';
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  FileText, 
  Upload, 
  Clock, 
  ChevronRight, 
  BarChart, 
  PieChart, 
  LineChart
} from "lucide-react";
import { useSubjects } from "@/hooks/useSubjects";
import { toast } from "sonner";

export default function Analysis() {
  const navigate = useNavigate();
  const [analysisType, setAnalysisType] = useState<"question-paper" | "answer-key" | "comparison">("question-paper");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const { subjects } = useSubjects();
  
  // File upload handling
  const questionPaperUpload = useFileUpload({
    accept: ".pdf,.docx,.doc",
    maxSize: 10, // MB
    onUploadSuccess: (fileUrl) => {
      navigate('/dashboard/analysis-result', { 
        state: { 
          fileUrl,
          analysisType,
          subjectId: selectedSubject
        } 
      });
    },
    onUploadError: (error) => {
      toast.error(`Upload failed: ${error}`);
    }
  });

  const answerKeyUpload = useFileUpload({
    accept: ".pdf,.docx,.doc",
    maxSize: 10, // MB
    onUploadSuccess: (fileUrl) => {
      navigate('/dashboard/analysis-result', { 
        state: { 
          fileUrl,
          analysisType,
          subjectId: selectedSubject
        } 
      });
    },
    onUploadError: (error) => {
      toast.error(`Upload failed: ${error}`);
    }
  });

  // Fetch recent analysis history
  const { data: recentAnalysis = [], isLoading: isHistoryLoading } = useQuery({
    queryKey: ['analysis-history'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('analysis_history')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (error) throw error;
      return data;
    }
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const handleSubmit = () => {
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }

    if (analysisType === "question-paper") {
      questionPaperUpload.openFileDialog();
    } else if (analysisType === "answer-key") {
      answerKeyUpload.openFileDialog();
    } else {
      // Handle comparison type - requires both files
      toast.info("Please upload both question paper and answer key");
      questionPaperUpload.openFileDialog();
    }
  };

  return (
    <div className="container mx-auto space-y-8">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Analytics</h1>
          <p className="text-muted-foreground mt-1">Analyze question papers and test insights</p>
        </div>
        <Button 
          variant="outline" 
          onClick={() => navigate('/dashboard/analysis-history')}
          className="flex items-center gap-2"
        >
          <Clock className="h-4 w-4" />
          View Analysis History
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>New Analysis</CardTitle>
            <CardDescription>Upload a question paper or answer key for analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="question-paper" className="w-full" onValueChange={(value) => setAnalysisType(value as any)}>
              <TabsList className="grid w-full grid-cols-3">
                <TabsTrigger value="question-paper">Question Paper</TabsTrigger>
                <TabsTrigger value="answer-key">Answer Key</TabsTrigger>
                <TabsTrigger value="comparison">Compare Both</TabsTrigger>
              </TabsList>
              
              <TabsContent value="question-paper" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="subject-select">Select Subject</label>
                    <select 
                      id="subject-select"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                      <option value="">Select a subject</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.subject_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-center p-6 border-2 border-dashed rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="mx-auto bg-blue-50 dark:bg-blue-900/20 h-14 w-14 rounded-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Upload question paper</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX (Max 10MB)</p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => questionPaperUpload.openFileDialog()}
                        className="mx-auto"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Select File
                      </Button>
                      {questionPaperUpload.fileName && (
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          Selected: {questionPaperUpload.fileName}
                        </p>
                      )}
                      {questionPaperUpload.isUploading && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          Uploading... {questionPaperUpload.progress}%
                        </p>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={questionPaperUpload.fileInputRef}
                      onChange={questionPaperUpload.handleFileChange}
                      accept={questionPaperUpload.accept}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSubmit} disabled={!selectedSubject || questionPaperUpload.isUploading}>
                    Analyze Paper
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="answer-key" className="space-y-4 mt-4">
                <div className="grid gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium" htmlFor="subject-select-ak">Select Subject</label>
                    <select 
                      id="subject-select-ak"
                      className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                      value={selectedSubject}
                      onChange={(e) => setSelectedSubject(e.target.value)}
                    >
                      <option value="">Select a subject</option>
                      {subjects.map(subject => (
                        <option key={subject.id} value={subject.id}>
                          {subject.name} ({subject.subject_code})
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex justify-center p-6 border-2 border-dashed rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="mx-auto bg-green-50 dark:bg-green-900/20 h-14 w-14 rounded-full flex items-center justify-center">
                        <FileText className="h-6 w-6 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Upload answer key</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX (Max 10MB)</p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        onClick={() => answerKeyUpload.openFileDialog()}
                        className="mx-auto"
                      >
                        <Upload className="mr-2 h-4 w-4" />
                        Select File
                      </Button>
                      {answerKeyUpload.fileName && (
                        <p className="text-sm font-medium text-green-600 dark:text-green-400">
                          Selected: {answerKeyUpload.fileName}
                        </p>
                      )}
                      {answerKeyUpload.isUploading && (
                        <p className="text-sm text-amber-600 dark:text-amber-400">
                          Uploading... {answerKeyUpload.progress}%
                        </p>
                      )}
                    </div>
                    <input
                      type="file"
                      ref={answerKeyUpload.fileInputRef}
                      onChange={answerKeyUpload.handleFileChange}
                      accept={answerKeyUpload.accept}
                      style={{ display: "none" }}
                    />
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSubmit} disabled={!selectedSubject || answerKeyUpload.isUploading}>
                    Analyze Answer Key
                  </Button>
                </div>
              </TabsContent>
              
              <TabsContent value="comparison" className="space-y-4 mt-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium" htmlFor="subject-select-comp">Select Subject</label>
                  <select 
                    id="subject-select-comp"
                    className="w-full h-10 rounded-md border border-input bg-background px-3 py-2"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">Select a subject</option>
                    {subjects.map(subject => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name} ({subject.subject_code})
                      </option>
                    ))}
                  </select>
                </div>
                
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex justify-center p-6 border-2 border-dashed rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="mx-auto bg-blue-50 dark:bg-blue-900/20 h-12 w-12 rounded-full flex items-center justify-center">
                        <FileText className="h-5 w-5 text-blue-600 dark:text-blue-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Question Paper</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX (Max 10MB)</p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => questionPaperUpload.openFileDialog()}
                        className="mx-auto"
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        Select File
                      </Button>
                      {questionPaperUpload.fileName && (
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">
                          Selected: {questionPaperUpload.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex justify-center p-6 border-2 border-dashed rounded-lg">
                    <div className="text-center space-y-4">
                      <div className="mx-auto bg-green-50 dark:bg-green-900/20 h-12 w-12 rounded-full flex items-center justify-center">
                        <FileText className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div>
                        <p className="text-sm font-medium">Answer Key</p>
                        <p className="text-xs text-muted-foreground mt-1">PDF, DOCX (Max 10MB)</p>
                      </div>
                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => answerKeyUpload.openFileDialog()}
                        className="mx-auto"
                      >
                        <Upload className="mr-2 h-3 w-3" />
                        Select File
                      </Button>
                      {answerKeyUpload.fileName && (
                        <p className="text-xs font-medium text-green-600 dark:text-green-400">
                          Selected: {answerKeyUpload.fileName}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="flex justify-end">
                  <Button onClick={handleSubmit} disabled={!selectedSubject}>
                    Compare Both
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Analysis</CardTitle>
              <Button variant="ghost" size="sm" onClick={() => navigate('/dashboard/analysis-history')}>
                View All
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {isHistoryLoading ? (
              <div className="py-4 text-center">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : recentAnalysis.length === 0 ? (
              <div className="text-center py-8 px-4">
                <div className="mx-auto mb-4 h-12 w-12 rounded-full bg-muted flex items-center justify-center">
                  <BarChart className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-muted-foreground">No analysis history found</p>
                <p className="text-xs text-muted-foreground mt-1">Upload a file to analyze</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentAnalysis.map((analysis: any) => (
                  <div 
                    key={analysis.id}
                    className="flex justify-between items-center p-3 rounded-lg border hover:bg-muted/50 cursor-pointer"
                    onClick={() => navigate('/dashboard/analysis-result', { state: { historyId: analysis.id } })}
                  >
                    <div className="flex items-center space-x-3">
                      {analysis.analysis?.type === 'question-paper' ? (
                        <BarChart className="h-8 w-8 text-blue-500" />
                      ) : analysis.analysis?.type === 'answer-key' ? (
                        <PieChart className="h-8 w-8 text-green-500" />
                      ) : (
                        <LineChart className="h-8 w-8 text-purple-500" />
                      )}
                      <div>
                        <p className="font-medium text-sm">{analysis.title}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(analysis.created_at)}</p>
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      {/* Analytics Charts Section */}
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Overview Analytics</CardTitle>
          <CardDescription>Summary of recent test metrics and performance trends</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-8 text-muted-foreground">
            <div className="text-center">
              <BarChart className="h-12 w-12 mx-auto mb-2 opacity-20" />
              <p>Analytics dashboard coming soon</p>
              <p className="text-sm mt-1">Run analysis on question papers to see insights here</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
