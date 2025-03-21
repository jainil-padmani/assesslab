
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubjects } from "@/hooks/test-selection/useSubjects";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedPaper, Question, Json } from "@/types/papers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, History, FileX, Upload, RefreshCw, Edit, Check, Plus, Minus, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface CourseOutcome {
  id: string;
  co_number: number;
  description: string;
  questionCount: number;
  selected: boolean;
}

// Types of question generation modes
type QuestionMode = "multiple-choice" | "theory";

// Interface for theory question configuration
interface TheoryQuestionConfig {
  "1 mark": number;
  "2 marks": number;
  "4 marks": number;
  "8 marks": number;
}

export default function PaperGeneration() {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<GeneratedPaper[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<GeneratedPaper | null>(null);
  const { subjects, isLoading: isSubjectsLoading } = useSubjects();
  const navigate = useNavigate();
  
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentUrl, setContentUrl] = useState<string>("");
  const [extractedContent, setExtractedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [difficulty, setDifficulty] = useState<number>(50);
  const [bloomsTaxonomy, setBloomsTaxonomy] = useState<any>({
    remember: 20,
    understand: 20,
    apply: 15,
    analyze: 15,
    evaluate: 15,
    create: 15
  });
  
  // New state for question mode
  const [questionMode, setQuestionMode] = useState<QuestionMode>("multiple-choice");
  
  // State for multiple-choice questions count
  const [multipleChoiceCount, setMultipleChoiceCount] = useState<number>(10);
  
  // State for theory questions configuration by marks
  const [theoryQuestionConfig, setTheoryQuestionConfig] = useState<TheoryQuestionConfig>({
    "1 mark": 5,
    "2 marks": 3,
    "4 marks": 2,
    "8 marks": 1
  });
  
  // New state for course outcomes
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [isLoadingCourseOutcomes, setIsLoadingCourseOutcomes] = useState(false);
  
  // State for editing answers
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editedAnswer, setEditedAnswer] = useState<string>("");

  useEffect(() => {
    if (selectedSubject && papers.length > 0) {
      setFilteredPapers(papers.filter(paper => paper.subject_id === selectedSubject));
    } else {
      setFilteredPapers(papers);
    }
  }, [selectedSubject, papers]);

  useEffect(() => {
    fetchPapers();
  }, []);
  
  // Add effect to fetch course outcomes when subject is selected
  useEffect(() => {
    if (selectedSubject) {
      fetchCourseOutcomes(selectedSubject);
    } else {
      setCourseOutcomes([]);
    }
  }, [selectedSubject]);

  const fetchPapers = async () => {
    try {
      setIsHistoryLoading(true);
      console.log("Fetching papers...");
      const { data, error } = await supabase
        .from("generated_papers")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) {
        console.error("Error fetching papers:", error);
        throw error;
      }
      
      console.log("Papers data:", data);
      
      if (data) {
        const mappedData = data.map((paper: any) => ({
          ...paper,
          subject_name: paper.subjects?.name || "Unknown Subject",
          questions: paper.questions as Question[] | any
        }));
        
        setPapers(mappedData as GeneratedPaper[]);
        setFilteredPapers(mappedData as GeneratedPaper[]);
      } else {
        setPapers([]);
        setFilteredPapers([]);
      }
    } catch (error: any) {
      console.error("Error fetching papers:", error);
      toast.error("Failed to load paper history");
      setPapers([]);
      setFilteredPapers([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };
  
  // Add function to fetch course outcomes
  const fetchCourseOutcomes = async (subjectId: string) => {
    try {
      setIsLoadingCourseOutcomes(true);
      
      const { data, error } = await supabase
        .from('course_outcomes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('co_number', { ascending: true });
      
      if (error) throw error;
      
      if (data) {
        const mappedOutcomes = data.map(co => ({
          id: co.id,
          co_number: co.co_number,
          description: co.description,
          questionCount: 2, // Default count
          selected: true // Default to selected
        }));
        
        setCourseOutcomes(mappedOutcomes);
      } else {
        setCourseOutcomes([]);
      }
    } catch (error) {
      console.error("Error fetching course outcomes:", error);
      toast.error("Failed to load course outcomes");
      setCourseOutcomes([]);
    } finally {
      setIsLoadingCourseOutcomes(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `content_${selectedSubject}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    try {
      const { error: uploadError, data } = await supabase.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) {
        toast.error(`Error uploading file: ${uploadError.message}`);
        return;
      }
      
      const { data: urlData } = await supabase.storage
        .from('files')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      setContentUrl(fileUrl);
      
      setIsGenerating(true);
      toast.info("Extracting content from file...");
      
      try {
        const extractResponse = await supabase.functions.invoke('extract-text', {
          body: { fileUrl, fileName: file.name }
        });
        
        if (extractResponse.error) {
          toast.error(`Error extracting text: ${extractResponse.error.message}`);
          return;
        }
        
        setExtractedContent(extractResponse.data.text);
        toast.success("Content extracted successfully");
      } catch (error) {
        console.error("Error extracting content:", error);
        toast.error("Failed to extract content from file");
      } finally {
        setIsGenerating(false);
      }
      
      toast.success(`File uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading file:`, error);
      toast.error(`Failed to upload file`);
    }
  };

  // Update the generate questions function for both modes
  const generateQuestions = async () => {
    if (!extractedContent && !contentUrl) {
      toast.error("Please upload content material first");
      return;
    }
    
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }
    
    if (!topicName) {
      toast.error("Please enter a topic name");
      return;
    }
    
    // Validate for theory mode with course outcomes
    if (questionMode === "theory") {
      const selectedCourseOutcomes = courseOutcomes.filter(co => co.selected);
      if (selectedCourseOutcomes.length === 0) {
        toast.error("Please select at least one course outcome for theory questions");
        return;
      }
    }
    
    setIsGenerating(true);
    toast.info("Generating questions, this may take a moment...");
    
    try {
      // Filter selected course outcomes
      const selectedCourseOutcomes = courseOutcomes.filter(co => co.selected);
      
      // Prepare question types configuration based on mode
      let questionTypesConfig = {};
      if (questionMode === "multiple-choice") {
        questionTypesConfig = {
          "Multiple Choice (1 mark)": multipleChoiceCount
        };
      } else {
        // For theory mode, map the theory question config
        questionTypesConfig = {
          "Short Answer (1 mark)": theoryQuestionConfig["1 mark"],
          "Short Answer (2 marks)": theoryQuestionConfig["2 marks"],
          "Medium Answer (4 marks)": theoryQuestionConfig["4 marks"],
          "Long Answer (8 marks)": theoryQuestionConfig["8 marks"]
        };
      }
      
      const response = await supabase.functions.invoke('generate-questions', {
        body: {
          topic: topicName,
          content: extractedContent || "No content provided",
          bloomsTaxonomy,
          difficulty,
          courseOutcomes: questionMode === "theory" ? selectedCourseOutcomes : undefined,
          questionTypes: questionTypesConfig,
          questionMode: questionMode // Pass the mode to the edge function
        }
      });
      
      if (response.error) {
        console.error("Error generating questions:", response.error);
        toast.error(`Error generating questions: ${response.error}`);
        setIsGenerating(false);
        return;
      }
      
      setGeneratedQuestions(response.data.questions);
      
      if (response.data.warning) {
        toast.warning(response.data.warning);
      }
      
      try {
        // Save generated questions to Supabase
        const { error: saveQuestionsError } = await supabase.from('generated_questions').insert({
          subject_id: selectedSubject,
          topic: topicName,
          questions: response.data.questions as Json,
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          question_mode: questionMode // Save the mode used for generation
        });
        
        if (saveQuestionsError) throw saveQuestionsError;
        
        // Convert Question[] to a JSON-compatible object before storing in Supabase
        const questionsJson = response.data.questions as Json;
        
        const { error: savePaperError } = await supabase.from('generated_papers').insert({
          subject_id: selectedSubject,
          topic: topicName,
          paper_url: "",
          questions: questionsJson,
          content_url: contentUrl || null,
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          question_mode: questionMode // Save the mode used for generation
        });
        
        if (savePaperError) throw savePaperError;
        
        toast.success("Questions generated and saved successfully");
        fetchPapers();
      } catch (saveError) {
        console.error("Error saving questions:", saveError);
        toast.error("Questions generated but failed to save to history");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const handleBloomsTaxonomyChange = (level: string, value: number[]) => {
    setBloomsTaxonomy(prev => ({
      ...prev,
      [level]: value[0]
    }));
  };
  
  // Functions to handle theory question configuration
  const handleTheoryQuestionCountChange = (markCategory: keyof TheoryQuestionConfig, delta: number) => {
    setTheoryQuestionConfig(prev => ({
      ...prev,
      [markCategory]: Math.max(0, prev[markCategory] + delta)
    }));
  };
  
  const handleTheoryQuestionInputChange = (markCategory: keyof TheoryQuestionConfig, value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 0) {
      setTheoryQuestionConfig(prev => ({
        ...prev,
        [markCategory]: numValue
      }));
    }
  };
  
  // Function to handle multiple choice question count
  const handleMultipleChoiceCountChange = (delta: number) => {
    setMultipleChoiceCount(prev => Math.max(1, prev + delta));
  };
  
  const handleMultipleChoiceInputChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      setMultipleChoiceCount(numValue);
    }
  };
  
  // Handle course outcome selection
  const toggleCourseOutcome = (id: string) => {
    setCourseOutcomes(prev => 
      prev.map(co => 
        co.id === id ? { ...co, selected: !co.selected } : co
      )
    );
  };
  
  // Handle course outcome question count change
  const handleCourseOutcomeCountChange = (id: string, count: number) => {
    setCourseOutcomes(prev => 
      prev.map(co => 
        co.id === id ? { ...co, questionCount: Math.max(1, count) } : co
      )
    );
  };

  const handleViewPaperDetails = (paper: GeneratedPaper) => {
    setSelectedPaper(paper);
  };

  const confirmDeletePaper = (paper: GeneratedPaper, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaperToDelete(paper);
    setIsDeleteDialogOpen(true);
  }

  const handleDeletePaper = async () => {
    if (!paperToDelete) return;
    
    try {
      const { error } = await supabase
        .from('generated_papers')
        .delete()
        .eq('id', paperToDelete.id);
        
      if (error) throw error;
      
      toast.success('Paper deleted successfully');
      fetchPapers();
      setIsDeleteDialogOpen(false);
      setPaperToDelete(null);
      
      if (selectedPaper && selectedPaper.id === paperToDelete.id) {
        setSelectedPaper(null);
      }
    } catch (error: any) {
      console.error('Error deleting paper:', error);
      toast.error('Failed to delete paper');
    }
  };

  const viewQuestionsHistory = () => {
    navigate("/dashboard/paper-generation/questions-history");
  };

  const handleEditAnswer = (question: Question) => {
    setEditingQuestion(question);
    setEditedAnswer(question.answer || "");
  };

  const saveEditedAnswer = async () => {
    if (!editingQuestion || !selectedPaper) return;
    
    try {
      // Update the answer in the local state
      const updatedQuestions = selectedPaper.questions as Question[];
      const questionIndex = updatedQuestions.findIndex(q => q.id === editingQuestion.id);
      
      if (questionIndex >= 0) {
        updatedQuestions[questionIndex] = {
          ...updatedQuestions[questionIndex],
          answer: editedAnswer
        };
        
        // Update the paper in state
        const updatedPaper = {
          ...selectedPaper,
          questions: updatedQuestions
        };
        
        setSelectedPaper(updatedPaper);
        
        // Update in the database
        const { error } = await supabase
          .from('generated_papers')
          .update({ questions: updatedQuestions as Json })
          .eq('id', selectedPaper.id);
          
        if (error) throw error;
        
        // Update in the papers list
        const updatedPapers = papers.map(p => 
          p.id === selectedPaper.id ? updatedPaper : p
        );
        setPapers(updatedPapers);
        setFilteredPapers(updatedPapers.filter(p => p.subject_id === selectedSubject || !selectedSubject));
        
        toast.success("Answer updated successfully");
      }
    } catch (error) {
      console.error("Error updating answer:", error);
      toast.error("Failed to update answer");
    } finally {
      // Clear editing state
      setEditingQuestion(null);
      setEditedAnswer("");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Questions Generation</h1>
        <Button
          variant="outline"
          onClick={viewQuestionsHistory}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          View Questions History
        </Button>
      </div>
      
      {generatedQuestions.length === 0 ? (
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subject Information</CardTitle>
              <CardDescription>
                Select a subject and enter a topic or chapter name to generate a test paper
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSubjectsLoading ? (
                      <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                    ) : subjects.length === 0 ? (
                      <SelectItem value="none" disabled>No subjects available</SelectItem>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.subject_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topic">Topic or Chapter Name</Label>
                <Input
                  id="topic"
                  placeholder="Enter topic or chapter name"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Chapter Material</CardTitle>
              <CardDescription>Upload content to generate questions from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="content-file">Content Material (PDF/DOCX/TXT)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="content-file"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setContentFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => contentFile && handleFileUpload(contentFile)}
                    disabled={!contentFile}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
              </div>
              
              {extractedContent && (
                <div>
                  <Label htmlFor="extracted-content">Extracted Content</Label>
                  <Textarea
                    id="extracted-content"
                    value={extractedContent}
                    onChange={(e) => setExtractedContent(e.target.value)}
                    className="h-48 mt-1"
                    placeholder="Content extracted from file..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Question Types</CardTitle>
              <CardDescription>Choose the type of questions to generate</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Tabs defaultValue="multiple-choice" onValueChange={(value) => setQuestionMode(value as QuestionMode)}>
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="multiple-choice">Multiple Choice</TabsTrigger>
                  <TabsTrigger value="theory">Theory Questions</TabsTrigger>
                </TabsList>
                
                <TabsContent value="multiple-choice" className="space-y-4 pt-4">
                  <div>
                    <Label>Number of Multiple Choice Questions</Label>
                    <div className="flex items-center gap-2 mt-1">
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleMultipleChoiceCountChange(-1)}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                      <Input
                        type="number"
                        min={1}
                        value={multipleChoiceCount}
                        onChange={(e) => handleMultipleChoiceInputChange(e.target.value)}
                        className="h-8 w-20 text-center"
                      />
                      <Button 
                        size="sm" 
                        variant="outline" 
                        className="h-8 w-8 p-0"
                        onClick={() => handleMultipleChoiceCountChange(1)}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      Multiple choice questions will have 4 options each with one correct answer.
                    </p>
                  </div>
                </TabsContent>
                
                <TabsContent value="theory" className="space-y-4 pt-4">
                  <div className="space-y-4">
                    {(Object.keys(theoryQuestionConfig) as Array<keyof TheoryQuestionConfig>).map((markCategory) => (
                      <div key={markCategory} className="space-y-2">
                        <Label>{markCategory} Questions</Label>
                        <div className="flex items-center gap-2">
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleTheoryQuestionCountChange(markCategory, -1)}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            min={0}
                            value={theoryQuestionConfig[markCategory]}
                            onChange={(e) => handleTheoryQuestionInputChange(markCategory, e.target.value)}
                            className="h-8 w-20 text-center"
                          />
                          <Button 
                            size="sm" 
                            variant="outline" 
                            className="h-8 w-8 p-0"
                            onClick={() => handleTheoryQuestionCountChange(markCategory, 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                    
                    <div className="border-t pt-4 mt-4">
                      <div className="flex items-center">
                        <Label className="text-base font-medium">Course Outcome Mapping</Label>
                        <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded flex items-center ml-2">
                          <AlertCircle className="h-3 w-3 mr-1" />
                          Required for theory questions
                        </div>
                      </div>
                      
                      {isLoadingCourseOutcomes ? (
                        <div className="animate-pulse mt-2">Loading course outcomes...</div>
                      ) : courseOutcomes.length === 0 ? (
                        <div className="text-sm text-muted-foreground mt-2">
                          No course outcomes found for this subject. Please select a subject with defined course outcomes.
                        </div>
                      ) : (
                        <div className="space-y-3 mt-3">
                          {courseOutcomes.map((co) => (
                            <div key={co.id} className="flex items-start gap-3 border-b pb-2">
                              <Checkbox 
                                id={`co-${co.id}`}
                                checked={co.selected}
                                onCheckedChange={() => toggleCourseOutcome(co.id)}
                              />
                              <div className="flex-1">
                                <Label htmlFor={`co-${co.id}`} className="text-sm">
                                  CO{co.co_number}: {co.description}
                                </Label>
                                {co.selected && (
                                  <div className="flex items-center gap-2 mt-1">
                                    <Label className="text-xs">Questions:</Label>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleCourseOutcomeCountChange(co.id, co.questionCount - 1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <Input
                                      type="number"
                                      min={1}
                                      value={co.questionCount}
                                      onChange={(e) => {
                                        const count = parseInt(e.target.value);
                                        if (!isNaN(count) && count >= 1) {
                                          handleCourseOutcomeCountChange(co.id, count);
                                        }
                                      }}
                                      className="h-7 w-12 text-center"
                                    />
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-6 w-6 p-0"
                                      onClick={() => handleCourseOutcomeCountChange(co.id, co.questionCount + 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Question Parameters</CardTitle>
              <CardDescription>Configure question generation parameters</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <Label>Difficulty Level: {difficulty}%</Label>
                <Slider
                  value={[difficulty]}
                  onValueChange={(value) => setDifficulty(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="my-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Easy</span>
                  <span>Moderate</span>
                  <span>Hard</span>
                </div>
              </div>
              
              <div className="space-y-4">
                <Label>Bloom's Taxonomy Weights</Label>
                
                {Object.entries(bloomsTaxonomy).map(([level, value]) => (
                  <div key={level} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="capitalize font-medium">{level}</span>
                      <span className="text-sm">{value as number}%</span>
                    </div>
                    <Slider
                      value={[value as number]}
                      onValueChange={(val) => handleBloomsTaxonomyChange(level, val)}
                      min={0}
                      max={50}
                      step={5}
                      className="my-1"
                    />
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full" 
                onClick={generateQuestions}
                disabled={
                  isGenerating || 
                  (!extractedContent && !contentUrl) || 
                  !selectedSubject || 
                  !topicName || 
                  (questionMode === "theory" && courseOutcomes.filter(co => co.selected).length === 0)
                }
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Questions'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>Generated Questions</CardTitle>
            <CardDescription>
              Questions generated for {topicName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {generatedQuestions.map((question, index) => (
                <div 
                  key={question.id} 
                  className="p-4 border rounded-md"
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium">
                        Q{index + 1}. {question.text}
                      </p>
                      
                      {/* Display multiple choice options if available */}
                      {question.options && (
                        <div className="mt-2 space-y-1 pl-4">
                          {question.options.map((option, idx) => (
                            <div key={idx} className={`text-sm ${option.isCorrect ? 'font-bold text-green-600' : ''}`}>
                              {String.fromCharCode(65 + idx)}. {option.text}
                              {option.isCorrect && " ✓"}
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {/* Display answer if available */}
                      {question.answer && (
                        <div className="mt-2 pl-4">
                          <div className="flex items-center justify-between">
                            <p className="text-sm font-medium">Answer:</p>
                            <Button 
                              variant="ghost" 
                              size="sm"
                              className="h-8 px-2"
                              onClick={() => handleEditAnswer(question)}
                            >
                              <Edit className="h-3 w-3 mr-1" />
                              Edit
                            </Button>
                          </div>
                          <p className="text-sm">{question.answer}</p>
                        </div>
                      )}
                      
                      <div className="mt-1 flex flex-wrap gap-2">
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          {question.type}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                          {question.level}
                        </span>
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                          {question.marks} marks
                        </span>
                        {question.courseOutcome && (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                            CO{question.courseOutcome}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
          <CardFooter>
            <Button 
              onClick={() => setGeneratedQuestions([])}
              variant="outline"
              className="ml-auto"
            >
              Generate New Questions
            </Button>
          </CardFooter>
        </Card>
      )}

      <Dialog open={!!selectedPaper} onOpenChange={(open) => !open && setSelectedPaper(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedPaper && (
            <>
              <DialogHeader>
                <DialogTitle>Questions: {selectedPaper.topic}</DialogTitle>
                <DialogDescription>
                  {selectedPaper.subject_name} - Created on {selectedPaper && format(new Date(selectedPaper.created_at), "dd MMM yyyy")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {selectedPaper && Array.isArray(selectedPaper.questions) ? (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {(selectedPaper.questions as Question[]).map((question, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 border rounded-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              Q{idx + 1}. {question.text}
                            </p>
                            
                            {/* Display multiple choice options if available */}
                            {question.options && (
                              <div className="mt-2 space-y-1 pl-4">
                                {question.options.map((option, idx) => (
                                  <div key={idx} className={`text-sm ${option.isCorrect ? 'font-bold text-green-600' : ''}`}>
                                    {String.fromCharCode(65 + idx)}. {option.text}
                                    {option.isCorrect && " ✓"}
                                  </div>
                                ))}
                              </div>
                            )}
                            
                            {/* Display answer section with edit option */}
                            <div className="mt-2 pl-4">
                              {editingQuestion?.id === question.id ? (
                                <div className="space-y-2">
                                  <Label htmlFor="edit-answer">Edit Answer:</Label>
                                  <Textarea
                                    id="edit-answer"
                                    value={editedAnswer}
                                    onChange={(e) => setEditedAnswer(e.target.value)}
                                    className="min-h-[100px] w-full"
                                  />
                                  <div className="flex justify-end gap-2">
                                    <Button 
                                      variant="outline" 
                                      size="sm"
                                      onClick={() => setEditingQuestion(null)}
                                    >
                                      Cancel
                                    </Button>
                                    <Button 
                                      size="sm"
                                      onClick={saveEditedAnswer}
                                    >
                                      <Check className="mr-1 h-4 w-4" />
                                      Save
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium">Answer:</p>
                                    <Button 
                                      variant="ghost" 
                                      size="sm"
                                      className="h-8 px-2"
                                      onClick={() => handleEditAnswer(question)}
                                    >
                                      <Edit className="h-3 w-3 mr-1" />
                                      Edit
                                    </Button>
                                  </div>
                                  <p className="text-sm">{question.answer || "No answer provided"}</p>
                                </>
                              )}
                            </div>
                            
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {question.type}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {question.level}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {question.marks} marks
                              </span>
                              {question.courseOutcome && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  CO{question.courseOutcome}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No questions available</p>
                )}
              </div>
              
              <DialogFooter className="flex justify-between items-center mt-4">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setSelectedPaper(null);
                    setPaperToDelete(selectedPaper);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Questions
                </Button>
                <Button variant="outline" onClick={() => setSelectedPaper(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete these questions? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePaper}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
