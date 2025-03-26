import React, { useState, useEffect } from 'react';
import { 
  HelpCircle,
  Upload,
  FileText,
  BookOpen,
  PlusCircle,
  Settings,
  Download
} from 'lucide-react';
import { toast } from 'sonner';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  CardFooter
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { QuestionHistory } from "@/components/paper-generation/QuestionHistory";
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useUser } from '@/hooks/useUser';
import { GeneratedPaper } from '@/types/papers';

export default function PaperGeneration() {
  const { user } = useUser();
  const [activeTab, setActiveTab] = useState("text");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<string[]>([]);
  const [textInput, setTextInput] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [selectedSubject, setSelectedSubject] = useState("");
  const [questionCount, setQuestionCount] = useState("10");
  const [questionType, setQuestionType] = useState("mixed");
  const [difficultyLevel, setDifficultyLevel] = useState("medium");
  
  // Fetch subjects
  const { data: subjects = [] } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id
  });

  // Fetch generated papers for history
  const { data: papers = [], refetch: refetchPapers } = useQuery({
    queryKey: ['generated-papers'],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data, error } = await supabase
        .from('generated_papers')
        .select(`
          id,
          topic,
          created_at,
          subject_id,
          questions,
          subjects:subject_id (name)
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      return data as unknown as GeneratedPaper[];
    },
    enabled: !!user?.id
  });
  
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      // Check if file is PDF
      if (file.type !== 'application/pdf') {
        toast.error("Please upload a PDF file");
        return;
      }
      setSelectedFile(file);
    }
  };
  
  const handleGenerate = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }
    
    if (activeTab === "text" && !textInput.trim()) {
      toast.error("Please enter some text to generate questions from");
      return;
    }
    
    if (activeTab === "file" && !selectedFile) {
      toast.error("Please upload a file to generate questions from");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Simulate API call with timeout
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      // Mock generated questions
      const mockQuestions = [
        "What is the capital of France?",
        "Explain the process of photosynthesis.",
        "Solve for x: 2x + 5 = 15",
        "What are the main causes of World War II?",
        "Describe the structure of a cell membrane.",
        "What is the difference between a simile and a metaphor?",
        "Calculate the area of a circle with radius 5cm.",
        "Explain Newton's third law of motion.",
        "What is the significance of the Declaration of Independence?",
        "Describe the water cycle."
      ];
      
      setGeneratedQuestions(mockQuestions.slice(0, parseInt(questionCount)));
      toast.success("Questions generated successfully!");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions. Please try again.");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const handleSaveQuestions = () => {
    if (generatedQuestions.length === 0) {
      toast.error("No questions to save");
      return;
    }
    
    // Logic to save questions
    toast.success("Questions saved successfully!");
  };
  
  const handleDownloadQuestions = () => {
    if (generatedQuestions.length === 0) {
      toast.error("No questions to download");
      return;
    }
    
    const questionsText = generatedQuestions.map((q, i) => `${i+1}. ${q}`).join('\n\n');
    const blob = new Blob([questionsText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `generated_questions_${new Date().toISOString().split('T')[0]}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="flex flex-col space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold">Question Paper Generation</h1>
          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <HelpCircle className="mr-2 h-4 w-4" />
                How it works
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>How Question Generation Works</DialogTitle>
                <DialogDescription>
                  Our AI-powered question generation system creates high-quality questions based on your input.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <p>You can generate questions in two ways:</p>
                <ol className="list-decimal list-inside space-y-2">
                  <li>Enter text directly in the text area</li>
                  <li>Upload a PDF file containing study material</li>
                </ol>
                <p>The AI will analyze the content and generate questions based on your selected parameters:</p>
                <ul className="list-disc list-inside space-y-2">
                  <li>Number of questions</li>
                  <li>Question type (multiple choice, short answer, etc.)</li>
                  <li>Difficulty level</li>
                </ul>
              </div>
            </DialogContent>
          </Dialog>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Generate Questions</CardTitle>
                <CardDescription>
                  Enter text or upload a file to generate questions
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="text" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="grid w-full grid-cols-2">
                    <TabsTrigger value="text">
                      <FileText className="mr-2 h-4 w-4" />
                      Text Input
                    </TabsTrigger>
                    <TabsTrigger value="file">
                      <Upload className="mr-2 h-4 w-4" />
                      File Upload
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="text" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="text-input">Enter text to generate questions from</Label>
                      <Textarea
                        id="text-input"
                        placeholder="Paste your text here..."
                        className="min-h-[200px]"
                        value={textInput}
                        onChange={(e) => setTextInput(e.target.value)}
                      />
                    </div>
                  </TabsContent>
                  <TabsContent value="file" className="space-y-4 mt-4">
                    <div className="space-y-2">
                      <Label htmlFor="file-upload">Upload a PDF file</Label>
                      <div className="border-2 border-dashed rounded-md p-6 flex flex-col items-center justify-center">
                        <Input
                          id="file-upload"
                          type="file"
                          className="hidden"
                          accept=".pdf"
                          onChange={handleFileChange}
                        />
                        <Label htmlFor="file-upload" className="cursor-pointer flex flex-col items-center">
                          <Upload className="h-10 w-10 text-muted-foreground mb-2" />
                          <span className="text-sm font-medium">
                            {selectedFile ? selectedFile.name : "Click to upload or drag and drop"}
                          </span>
                          <span className="text-xs text-muted-foreground mt-1">
                            PDF (max 10MB)
                          </span>
                        </Label>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
          
          <div>
            <Card>
              <CardHeader>
                <CardTitle>Generation Settings</CardTitle>
                <CardDescription>
                  Configure question generation parameters
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
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
                  <Label htmlFor="question-count">Number of Questions</Label>
                  <Select value={questionCount} onValueChange={setQuestionCount}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select count" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5 questions</SelectItem>
                      <SelectItem value="10">10 questions</SelectItem>
                      <SelectItem value="15">15 questions</SelectItem>
                      <SelectItem value="20">20 questions</SelectItem>
                      <SelectItem value="25">25 questions</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="question-type">Question Type</Label>
                  <Select value={questionType} onValueChange={setQuestionType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                      <SelectItem value="long_answer">Long Answer</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                      <SelectItem value="mixed">Mixed Types</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <Select value={difficultyLevel} onValueChange={setDifficultyLevel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select difficulty" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="easy">Easy</SelectItem>
                      <SelectItem value="medium">Medium</SelectItem>
                      <SelectItem value="hard">Hard</SelectItem>
                      <SelectItem value="mixed">Mixed Difficulty</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
              <CardFooter>
                <Button 
                  className="w-full" 
                  onClick={handleGenerate}
                  disabled={isGenerating}
                >
                  {isGenerating ? "Generating..." : "Generate Questions"}
                </Button>
              </CardFooter>
            </Card>
          </div>
        </div>
        
        {generatedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Questions</CardTitle>
              <CardDescription>
                {generatedQuestions.length} questions generated for {subjects.find(s => s.id === selectedSubject)?.name || "selected subject"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedQuestions.map((question, index) => (
                  <div key={index} className="p-4 border rounded-md">
                    <p className="font-medium">Question {index + 1}</p>
                    <p>{question}</p>
                  </div>
                ))}
              </div>
            </CardContent>
            <CardFooter className="flex justify-between">
              <Button variant="outline" onClick={handleSaveQuestions}>
                <PlusCircle className="mr-2 h-4 w-4" />
                Save to Question Bank
              </Button>
              <Button onClick={handleDownloadQuestions}>
                <Download className="mr-2 h-4 w-4" />
                Download Questions
              </Button>
            </CardFooter>
          </Card>
        )}
        
        <Card>
          <CardHeader>
            <CardTitle>Recent Question Papers</CardTitle>
            <CardDescription>
              Your recently generated question papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QuestionHistory
              papers={papers}
              fetchPapers={refetchPapers}
              viewMode="grid"
              enableFiltering={true}
              showViewAll={true}
              onViewAllClick={() => {/* handle view all click */}}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
