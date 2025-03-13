
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedQuestions, Question } from "@/types/papers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";
import { File, FileText, Download, RefreshCw } from "lucide-react";
import { useSubjects } from "@/hooks/test-selection/useSubjects";

export default function SavedQuestions() {
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [selectedTopic, setSelectedTopic] = useState<string>("all");
  const [savedQuestions, setSavedQuestions] = useState<GeneratedQuestions[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<GeneratedQuestions[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [selectedQuestionSet, setSelectedQuestionSet] = useState<GeneratedQuestions | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});
  const [isGeneratingPaper, setIsGeneratingPaper] = useState(false);
  const [paperUrl, setPaperUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const { subjects } = useSubjects();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSavedQuestions();
  }, []);

  useEffect(() => {
    if (savedQuestions.length > 0) {
      // Extract unique topics
      const topics = [...new Set(savedQuestions.map(sq => sq.topic))];
      setTopicOptions(topics);
      
      // Apply filters
      filterQuestions();
    }
  }, [selectedSubject, selectedTopic, savedQuestions]);

  const fetchSavedQuestions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("generated_questions")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        const mappedData = data.map((item: any) => ({
          ...item,
          subject_name: item.subjects?.name || "Unknown Subject",
          questions: item.questions as Question[] | any
        }));
        
        setSavedQuestions(mappedData as GeneratedQuestions[]);
        setFilteredQuestions(mappedData as GeneratedQuestions[]);
      }
    } catch (error: any) {
      console.error("Error fetching saved questions:", error);
      toast.error("Failed to load saved questions");
    } finally {
      setIsLoading(false);
    }
  };

  const filterQuestions = () => {
    let filtered = [...savedQuestions];
    
    if (selectedSubject !== "all") {
      filtered = filtered.filter(sq => sq.subject_id === selectedSubject);
    }
    
    if (selectedTopic !== "all") {
      filtered = filtered.filter(sq => sq.topic === selectedTopic);
    }
    
    setFilteredQuestions(filtered);
  };

  const handleSelectQuestionSet = (questionSet: GeneratedQuestions) => {
    setSelectedQuestionSet(questionSet);
    
    // Initialize all questions as selected
    if (Array.isArray(questionSet.questions)) {
      const initialSelected = {};
      (questionSet.questions as Question[]).forEach(q => {
        initialSelected[q.id] = true;
      });
      setSelectedQuestions(initialSelected);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setSelectedQuestions(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const handleCreatePaper = async () => {
    if (!selectedQuestionSet) return;
    
    const selectedQuestionsArray = Array.isArray(selectedQuestionSet.questions) 
      ? (selectedQuestionSet.questions as Question[]).filter(q => selectedQuestions[q.id])
      : [];
    
    if (selectedQuestionsArray.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    
    setIsGeneratingPaper(true);
    toast.info("Creating paper, please wait...");
    
    try {
      // Get subject details
      const { data: subjectData } = await supabase
        .from("subjects")
        .select("name, subject_code")
        .eq("id", selectedQuestionSet.subject_id)
        .single();
      
      const response = await supabase.functions.invoke('generate-paper', {
        body: {
          subjectName: subjectData?.name || selectedQuestionSet.subject_name,
          subjectCode: subjectData?.subject_code || "",
          topicName: selectedQuestionSet.topic,
          questions: selectedQuestionsArray
        }
      });
      
      if (response.error) {
        throw new Error(response.error.message);
      }
      
      const paperUrl = response.data.paperUrl;
      const pdfUrl = response.data.pdfUrl;
      
      setPaperUrl(paperUrl);
      setPdfUrl(pdfUrl || "");
      
      // Save the generated paper to history
      const { data, error } = await supabase
        .from('generated_papers')
        .insert({
          subject_id: selectedQuestionSet.subject_id,
          topic: selectedQuestionSet.topic,
          paper_url: paperUrl,
          pdf_url: pdfUrl || null,
          questions: selectedQuestionsArray as any,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        })
        .select();
      
      if (error) {
        console.error("Error saving paper:", error);
        toast.error("Paper created but failed to save to history");
      } else {
        toast.success("Paper created and saved successfully");
      }
    } catch (error: any) {
      console.error("Error creating paper:", error);
      toast.error("Failed to create paper: " + error.message);
    } finally {
      setIsGeneratingPaper(false);
    }
  };

  const downloadPaper = () => {
    if (pdfUrl) {
      window.open(pdfUrl, '_blank');
    }
  };

  return (
    <div className="container max-w-6xl mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Saved Questions</h1>
        <p className="text-muted-foreground">Create papers from previously generated questions</p>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Filter Questions</CardTitle>
          <CardDescription>
            Filter by subject and topic to find your saved questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="filter-subject">Subject</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger id="filter-subject">
                  <SelectValue placeholder="All subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Subjects</SelectItem>
                  {subjects && subjects.length > 0 && subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="filter-topic">Topic</Label>
              <Select 
                value={selectedTopic} 
                onValueChange={setSelectedTopic}
              >
                <SelectTrigger id="filter-topic">
                  <SelectValue placeholder="All topics" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Topics</SelectItem>
                  {topicOptions.map((topic) => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <div className="mt-6">
        {isLoading ? (
          <Card className="p-8">
            <div className="flex justify-center items-center">
              <RefreshCw className="h-6 w-6 animate-spin text-primary" />
              <span className="ml-2">Loading saved questions...</span>
            </div>
          </Card>
        ) : filteredQuestions.length === 0 ? (
          <Card className="p-8">
            <div className="text-center">
              <p className="text-muted-foreground">No saved questions found</p>
              <Button
                className="mt-4"
                onClick={() => navigate("/dashboard/paper-generation")}
              >
                Generate New Questions
              </Button>
            </div>
          </Card>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredQuestions.map((questionSet) => (
                <TableRow key={questionSet.id}>
                  <TableCell>
                    {format(new Date(questionSet.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>{questionSet.subject_name}</TableCell>
                  <TableCell>{questionSet.topic}</TableCell>
                  <TableCell>
                    {Array.isArray(questionSet.questions) 
                      ? (questionSet.questions as Question[]).length 
                      : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="outline"
                      onClick={() => handleSelectQuestionSet(questionSet)}
                    >
                      Create Paper
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </div>

      {/* Question Set Dialog */}
      <Dialog 
        open={!!selectedQuestionSet} 
        onOpenChange={(open) => !open && setSelectedQuestionSet(null)}
      >
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedQuestionSet && (
            <>
              <DialogHeader>
                <DialogTitle>Create Paper: {selectedQuestionSet.topic}</DialogTitle>
              </DialogHeader>
              
              <div className="mt-4">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="font-medium">Select Questions to Include</h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleCreatePaper}
                    disabled={isGeneratingPaper}
                  >
                    {isGeneratingPaper ? (
                      <>
                        <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : 'Create Paper'}
                  </Button>
                </div>
                
                {Array.isArray(selectedQuestionSet.questions) ? (
                  <div className="space-y-2 max-h-[40vh] overflow-y-auto">
                    {(selectedQuestionSet.questions as Question[]).map((question, idx) => (
                      <div 
                        key={question.id} 
                        className={`p-3 border rounded-md ${
                          selectedQuestions[question.id] ? 'border-primary bg-primary/5' : 'border-gray-200'
                        }`}
                      >
                        <div className="flex items-start space-x-3">
                          <Checkbox 
                            id={`question-${question.id}`}
                            checked={selectedQuestions[question.id]}
                            onCheckedChange={() => toggleQuestionSelection(question.id)}
                          />
                          <div className="flex-1">
                            <Label htmlFor={`question-${question.id}`} className="font-medium cursor-pointer">
                              Q{idx + 1}. {question.text}
                            </Label>
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {question.type}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {question.level}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {question.marks} marks
                              </span>
                              {question.courseOutcome && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
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
                  <p className="text-muted-foreground">No questions available</p>
                )}
                
                {pdfUrl && (
                  <div className="mt-6">
                    <h3 className="font-medium mb-4">Generated Paper</h3>
                    <div className="aspect-[3/4] border rounded-md overflow-hidden bg-white">
                      <iframe 
                        src={pdfUrl} 
                        className="w-full h-full"
                        title="Generated Paper PDF"
                      />
                    </div>
                    <div className="flex justify-center mt-4">
                      <Button onClick={downloadPaper}>
                        <Download className="mr-2 h-4 w-4" />
                        Download PDF
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
