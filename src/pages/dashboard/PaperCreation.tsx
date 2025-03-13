
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { Loader2, Sparkles, Save, DownloadCloud, File } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import type { Question, CourseOutcomeConfig } from "@/types/papers";
import { useSubjects } from "@/hooks/test-selection/useSubjects";

export default function PaperCreation() {
  const navigate = useNavigate();
  const location = useLocation();
  const { subjects } = useSubjects();
  
  const [selectedSubject, setSelectedSubject] = useState("");
  const [subjectName, setSubjectName] = useState("");
  const [subjectCode, setSubjectCode] = useState("");
  const [topic, setTopic] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isGeneratingPaper, setIsGeneratingPaper] = useState(false);
  const [paperUrl, setPaperUrl] = useState("");
  const [pdfUrl, setPdfUrl] = useState("");
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcomeConfig[]>([]);
  const [selectedCourseOutcomes, setSelectedCourseOutcomes] = useState<string[]>([]);
  
  // Check if we have prefilled questions from the saved questions page
  useEffect(() => {
    if (location.state?.prefillQuestions) {
      setGeneratedQuestions(location.state.prefillQuestions);
      
      // Try to find a subject ID from the first question if it has a courseOutcome
      if (location.state.prefillQuestions.length > 0) {
        const firstQuestion = location.state.prefillQuestions[0];
        if (firstQuestion.subject_id) {
          setSelectedSubject(firstQuestion.subject_id);
        }
      }
    }
  }, [location]);
  
  // Fetch subject data when selectedSubject changes
  useEffect(() => {
    if (selectedSubject) {
      fetchSubjectDetails(selectedSubject);
      fetchCourseOutcomes(selectedSubject);
    }
  }, [selectedSubject]);
  
  const fetchSubjectDetails = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('name, subject_code')
        .eq('id', subjectId)
        .single();
        
      if (error) throw error;
      
      if (data) {
        setSubjectName(data.name);
        setSubjectCode(data.subject_code);
      }
    } catch (error) {
      console.error('Error fetching subject details:', error);
    }
  };
  
  const fetchCourseOutcomes = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('course_outcomes')
        .select('id, co_number, description')
        .eq('subject_id', subjectId)
        .order('co_number');
        
      if (error) throw error;
      
      if (data) {
        const formattedCOs = data.map(co => ({
          id: co.id,
          co_number: co.co_number,
          description: co.description,
          questionCount: 2, // Default number of questions per CO
          selected: false
        }));
        
        setCourseOutcomes(formattedCOs);
      }
    } catch (error) {
      console.error('Error fetching course outcomes:', error);
    }
  };
  
  const handleGenerateQuestions = async () => {
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }
    
    if (!topic) {
      toast.error("Please enter a topic");
      return;
    }
    
    setIsLoading(true);
    
    try {
      // Prepare the selected course outcomes with their question count
      let selectedCOs = courseOutcomes
        .filter(co => selectedCourseOutcomes.includes(co.id))
        .map(co => ({
          co_number: co.co_number,
          description: co.description,
          questionCount: co.questionCount
        }));
      
      // If no COs selected, generate general questions
      const totalQuestions = selectedCOs.length === 0 
        ? numQuestions 
        : selectedCOs.reduce((total, co) => total + co.questionCount, 0);
      
      // Call Supabase Edge Function to generate questions
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          subject: subjectName,
          topic,
          numQuestions: totalQuestions,
          courseOutcomes: selectedCOs,
          subjectCode
        }
      });
      
      if (error) throw error;
      
      if (data && Array.isArray(data.questions)) {
        // Map the generated questions to include selected status
        const questionsWithSelected: Question[] = data.questions.map(q => ({
          ...q,
          selected: true,
          courseOutcome: q.courseOutcome || 0
        }));
        
        setGeneratedQuestions(questionsWithSelected);
        
        // Save the generated questions to the database
        await saveGeneratedQuestions(questionsWithSelected);
        
        toast.success(`Generated ${questionsWithSelected.length} questions`);
      } else {
        toast.error("Failed to generate questions");
      }
    } catch (error) {
      console.error('Error generating questions:', error);
      toast.error("An error occurred while generating questions");
    } finally {
      setIsLoading(false);
    }
  };
  
  const saveGeneratedQuestions = async (questions: Question[]) => {
    try {
      if (!questions || questions.length === 0) return;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Using raw SQL because 'generated_questions' is a new table
      const { error } = await supabase.rpc('insert_generated_questions', {
        p_user_id: user.id,
        p_subject_id: selectedSubject,
        p_topic: topic,
        p_questions: JSON.stringify(questions)
      }).single();
      
      if (error) {
        // Fallback to direct insert if the RPC is not available yet
        const { error: insertError } = await supabase
          .from('generated_questions')
          .insert({
            user_id: user.id,
            subject_id: selectedSubject,
            topic: topic,
            questions: questions
          });
          
        if (insertError) throw insertError;
      }
      
      toast.success("Questions saved for future use");
    } catch (error) {
      console.error('Error saving generated questions:', error);
      // Don't show an error toast as this is a background operation
    }
  };
  
  const handleToggleQuestionSelection = (index: number) => {
    setGeneratedQuestions(prevQuestions => 
      prevQuestions.map((q, i) => 
        i === index ? { ...q, selected: !q.selected } : q
      )
    );
  };
  
  const handleSelectAllQuestions = (selected: boolean) => {
    setGeneratedQuestions(prevQuestions => 
      prevQuestions.map(q => ({ ...q, selected }))
    );
  };
  
  const handleGeneratePaper = async () => {
    const selectedQuestions = generatedQuestions.filter(q => q.selected);
    
    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    
    setIsGeneratingPaper(true);
    setPaperUrl("");
    setPdfUrl("");
    
    try {
      // Call the Supabase Edge Function to generate the paper
      const { data, error } = await supabase.functions.invoke('generate-paper', {
        body: {
          subjectName,
          subjectCode,
          topicName: topic,
          questions: selectedQuestions
        }
      });
      
      if (error) throw error;
      
      if (data) {
        setPaperUrl(data.paperUrl);
        if (data.pdfUrl) {
          setPdfUrl(data.pdfUrl);
        }
        
        // Save the generated paper to the database
        await saveGeneratedPaper(data.paperUrl, data.pdfUrl, selectedQuestions);
        
        toast.success("Paper generated successfully");
      } else {
        toast.error("Failed to generate paper");
      }
    } catch (error) {
      console.error('Error generating paper:', error);
      toast.error("An error occurred while generating the paper");
    } finally {
      setIsGeneratingPaper(false);
    }
  };
  
  const saveGeneratedPaper = async (paperUrl: string, pdfUrl: string | null, questions: Question[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { error } = await supabase
        .from('generated_papers')
        .insert({
          user_id: user.id,
          subject_id: selectedSubject,
          topic: topic,
          paper_url: paperUrl,
          pdf_url: pdfUrl,
          questions: questions
        });
        
      if (error) throw error;
    } catch (error) {
      console.error('Error saving generated paper:', error);
      toast.error("Failed to save paper record");
    }
  };
  
  const handleToggleCourseOutcome = (coId: string) => {
    setSelectedCourseOutcomes(prev => {
      if (prev.includes(coId)) {
        return prev.filter(id => id !== coId);
      } else {
        return [...prev, coId];
      }
    });
  };
  
  const handleUpdateCOQuestionCount = (coId: string, count: number) => {
    setCourseOutcomes(prev => 
      prev.map(co => 
        co.id === coId ? { ...co, questionCount: count } : co
      )
    );
  };
  
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Generate Question Paper</h1>
          <p className="text-muted-foreground">Create custom question papers for your subject</p>
        </div>
        <div className="flex gap-2 mt-4 sm:mt-0">
          <Button onClick={() => navigate("/dashboard/paper-generation/history")}>
            View Paper History
          </Button>
          <Button onClick={() => navigate("/dashboard/paper-generation/saved")}>
            Saved Questions
          </Button>
        </div>
      </div>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Paper Configuration</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Select value={selectedSubject} onValueChange={setSelectedSubject}>
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map(subject => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.subject_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="topic">Topic</Label>
              <Input
                id="topic"
                value={topic}
                onChange={e => setTopic(e.target.value)}
                placeholder="Enter topic for the question paper"
              />
            </div>
            
            {courseOutcomes.length > 0 ? (
              <div className="space-y-2">
                <Label>Course Outcomes</Label>
                <div className="grid gap-2">
                  {courseOutcomes.map(co => (
                    <div key={co.id} className="flex items-center space-x-2 border p-2 rounded">
                      <Checkbox
                        id={`co-${co.id}`}
                        checked={selectedCourseOutcomes.includes(co.id)}
                        onCheckedChange={() => handleToggleCourseOutcome(co.id)}
                      />
                      <Label htmlFor={`co-${co.id}`} className="flex-1">
                        CO{co.co_number}: {co.description}
                      </Label>
                      {selectedCourseOutcomes.includes(co.id) && (
                        <div className="flex items-center">
                          <Label className="mr-2">Questions:</Label>
                          <Input
                            type="number"
                            min="1"
                            max="10"
                            value={co.questionCount}
                            onChange={e => handleUpdateCOQuestionCount(co.id, parseInt(e.target.value) || 1)}
                            className="w-16"
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <Label htmlFor="numQuestions">Number of Questions</Label>
                <Input
                  id="numQuestions"
                  type="number"
                  min="1"
                  max="50"
                  value={numQuestions}
                  onChange={e => setNumQuestions(parseInt(e.target.value) || 10)}
                />
              </div>
            )}
            
            <Button
              onClick={handleGenerateQuestions}
              disabled={isLoading || !selectedSubject || !topic}
              className="w-full"
            >
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Questions
                </>
              )}
            </Button>
          </CardContent>
        </Card>
        
        <Card className="md:row-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Generated Questions</CardTitle>
            {generatedQuestions.length > 0 && (
              <div className="flex items-center space-x-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllQuestions(true)}
                >
                  Select All
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleSelectAllQuestions(false)}
                >
                  Deselect All
                </Button>
              </div>
            )}
          </CardHeader>
          <CardContent>
            {generatedQuestions.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground">
                  No questions generated yet. Configure your paper and click Generate Questions.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {generatedQuestions.map((question, index) => (
                  <div 
                    key={index} 
                    className={`border rounded-lg p-3 ${question.selected ? 'border-primary' : 'border-muted'}`}
                  >
                    <div className="flex items-start space-x-2">
                      <Checkbox
                        checked={question.selected}
                        onCheckedChange={() => handleToggleQuestionSelection(index)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <div className="font-medium">{question.text}</div>
                        <div className="flex flex-wrap gap-2 mt-2">
                          <div className="text-sm bg-muted px-2 py-1 rounded">
                            {question.type}
                          </div>
                          <div className="text-sm bg-muted px-2 py-1 rounded">
                            Level: {question.level}
                          </div>
                          <div className="text-sm bg-muted px-2 py-1 rounded">
                            Marks: {question.marks}
                          </div>
                          {question.courseOutcome > 0 && (
                            <div className="text-sm bg-primary/10 text-primary px-2 py-1 rounded">
                              CO{question.courseOutcome}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
                
                <Button
                  onClick={handleGeneratePaper}
                  disabled={isGeneratingPaper || generatedQuestions.filter(q => q.selected).length === 0}
                  className="w-full"
                >
                  {isGeneratingPaper ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating Paper...
                    </>
                  ) : (
                    <>
                      <Save className="mr-2 h-4 w-4" />
                      Generate Paper
                    </>
                  )}
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
        
        {(paperUrl || pdfUrl) && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Paper</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col gap-4">
                {pdfUrl && (
                  <div className="border rounded p-4 flex flex-col items-center gap-2">
                    <div className="text-center font-medium">PDF Version</div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(pdfUrl, '_blank')}
                      >
                        <File className="mr-2 h-4 w-4" />
                        View PDF
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={pdfUrl} download={`${subjectCode}_${topic}_paper.pdf`}>
                          <DownloadCloud className="mr-2 h-4 w-4" />
                          Download PDF
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
                
                {paperUrl && (
                  <div className="border rounded p-4 flex flex-col items-center gap-2">
                    <div className="text-center font-medium">HTML Version</div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(paperUrl, '_blank')}
                      >
                        <File className="mr-2 h-4 w-4" />
                        View HTML
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        asChild
                      >
                        <a href={paperUrl} download={`${subjectCode}_${topic}_paper.html`}>
                          <DownloadCloud className="mr-2 h-4 w-4" />
                          Download HTML
                        </a>
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
