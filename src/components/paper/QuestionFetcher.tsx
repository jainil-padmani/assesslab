
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Question } from "@/types/papers";
import { Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuestionFetcherProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  subjectId: string;
  level: string;
  courseOutcome?: number;
  marks: number;
  onQuestionSelect: (question: Question) => void;
}

export function QuestionFetcher({
  open,
  onOpenChange,
  subjectId,
  level,
  courseOutcome,
  marks,
  onQuestionSelect
}: QuestionFetcherProps) {
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [questionMode, setQuestionMode] = useState<"all" | "multiple-choice" | "theory">("all");

  // Fetch available topics for the subject
  useEffect(() => {
    if (open && subjectId) {
      fetchTopics();
    }
  }, [open, subjectId]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('generated_questions')
        .select('topic')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Extract unique topics
      const uniqueTopics = [...new Set((data || []).map(item => item.topic))];
      setTopics(uniqueTopics);
      
      // Select first topic if available
      if (uniqueTopics.length > 0) {
        setSelectedTopic(uniqueTopics[0]);
      }
    } catch (error) {
      console.error("Error fetching topics:", error);
      toast.error("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  // Fetch questions when topic is selected
  useEffect(() => {
    if (selectedTopic) {
      fetchQuestions();
    }
  }, [selectedTopic]);

  // Filter questions based on search query and mode
  useEffect(() => {
    if (questions.length === 0) {
      setFilteredQuestions([]);
      return;
    }
    
    let filtered = questions;
    
    // Apply question mode filter
    if (questionMode !== "all") {
      if (questionMode === "multiple-choice") {
        filtered = filtered.filter(q => 
          q.type.toLowerCase().includes("multiple choice") || (q.options && q.options.length > 0)
        );
      } else if (questionMode === "theory") {
        filtered = filtered.filter(q => 
          !q.type.toLowerCase().includes("multiple choice") && (!q.options || q.options.length === 0)
        );
      }
    }
    
    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => q.text.toLowerCase().includes(query));
    }
    
    setFilteredQuestions(filtered);
  }, [questions, searchQuery, questionMode]);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('generated_questions')
        .select('questions, question_mode')
        .eq('subject_id', subjectId)
        .eq('topic', selectedTopic)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0 && data[0].questions) {
        const questionsData = data[0].questions;
        let allQuestions: Question[] = [];
        
        // Validate if it's an array and has the structure we expect
        if (Array.isArray(questionsData)) {
          // Convert from Json[] to Question[] with proper type validation and type casting
          allQuestions = questionsData
            .filter(q => {
              // First check if q is an object and not null
              if (typeof q !== 'object' || q === null) return false;
              
              // Then check if it has all the required properties using type guards
              return (
                'id' in q && 
                ('text' in q || 'question' in q) && // Support both text and question field names
                'type' in q && 
                'marks' in q && 
                'level' in q
              );
            })
            .map(q => {
              // Safely access properties with type assertion
              const question = q as Record<string, any>;
              
              // Support both formats: with 'text' field or with 'question' field
              const questionText = 'text' in question ? question.text : question.question;
              
              return {
                id: String(question.id),
                text: questionText,
                type: String(question.type),
                marks: Number(question.marks),
                level: String(question.level),
                courseOutcome: 'courseOutcome' in question ? Number(question.courseOutcome) : undefined,
                answer: 'answer' in question ? String(question.answer) : 
                         'correct_answer' in question ? String(question.correct_answer) : undefined,
                options: 'options' in question ? 
                  (Array.isArray(question.options) ? 
                    // Handle different options formats
                    (typeof question.options[0] === 'string' ? 
                      // Format: ["Option 1", "Option 2", ...] with separate correct_answer field
                      question.options.map((opt: string) => ({
                        text: opt,
                        isCorrect: opt === question.correct_answer
                      })) : 
                      // Format: [{text: "Option 1", isCorrect: true}, ...]
                      question.options
                    ) : 
                    undefined)
              };
            });
        }
        
        // Filter by level and courseOutcome if provided
        let filteredByAttributes = allQuestions.filter(q => {
          let matchesLevel = q.level === level;
          let matchesCO = courseOutcome ? q.courseOutcome === courseOutcome : true;
          return matchesLevel && matchesCO;
        });
        
        setQuestions(filteredByAttributes);
        
        // Initially set filtered questions to match the filtered questions
        // (actual filtering will happen in the useEffect)
        setFilteredQuestions(filteredByAttributes); 
      } else {
        setQuestions([]);
        setFilteredQuestions([]);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectQuestion = (question: Question) => {
    onQuestionSelect({
      ...question,
      marks: marks // Override with the marks from the paper format
    });
    onOpenChange(false);
  };

  // Format multiple choice question for display
  const renderMultipleChoiceQuestion = (question: Question, index: number) => {
    return (
      <Card key={question.id || index} className="hover:bg-accent/10 cursor-pointer transition-colors" onClick={() => handleSelectQuestion(question)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <div className="border-b pb-2 mb-2">
                <p className="text-sm font-medium">Question {index + 1}: {question.text}</p>
              </div>
              
              {question.options && (
                <div className="space-y-1 mb-2">
                  <p className="text-xs font-medium text-muted-foreground">Options:</p>
                  {question.options.map((option, optIdx) => (
                    <div key={optIdx} className={`text-xs pl-2 ${option.isCorrect ? 'text-green-600 font-medium' : ''}`}>
                      {String.fromCharCode(65 + optIdx)}. {option.text}
                      {option.isCorrect && " ✓"}
                    </div>
                  ))}
                </div>
              )}
              
              {question.answer && (
                <div className="border-t pt-2 mt-2">
                  <p className="text-xs font-medium text-muted-foreground">Correct Answer:</p>
                  <p className="text-xs text-green-600 pl-2">{question.answer}</p>
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-3">
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {question.level}
                </span>
                {question.courseOutcome && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">
                    CO{question.courseOutcome}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                </span>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                  Multiple Choice
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  // Format theory question for display
  const renderTheoryQuestion = (question: Question, index: number) => {
    return (
      <Card key={question.id || index} className="hover:bg-accent/10 cursor-pointer transition-colors" onClick={() => handleSelectQuestion(question)}>
        <CardContent className="p-3">
          <div className="flex items-start gap-2">
            <div className="flex-1">
              <p className="text-sm">{question.text}</p>
              
              {question.answer && (
                <div className="mt-2 pl-2 text-xs text-muted-foreground border-l-2 border-primary/30">
                  <span className="font-medium">Answer: </span>
                  {question.answer.length > 100 
                    ? `${question.answer.substring(0, 100)}...` 
                    : question.answer}
                </div>
              )}
              
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs bg-muted px-2 py-0.5 rounded">
                  {question.level}
                </span>
                {question.courseOutcome && (
                  <span className="text-xs bg-muted px-2 py-0.5 rounded">
                    CO{question.courseOutcome}
                  </span>
                )}
                <span className="text-xs text-muted-foreground">
                  {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                </span>
                <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded">
                  Theory
                </span>
              </div>
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
              <Check className="h-4 w-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Question</DialogTitle>
          <DialogDescription>
            Choose a question from your generated question bank
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex flex-col space-y-4 py-4">
          <div className="flex flex-col space-y-2 sm:flex-row sm:space-y-0 sm:space-x-2">
            <div className="flex-1">
              <Select
                value={selectedTopic}
                onValueChange={setSelectedTopic}
                disabled={loading || topics.length === 0}
              >
                <SelectTrigger id="subject">
                  <SelectValue placeholder="Select topic" />
                </SelectTrigger>
                <SelectContent>
                  {topics.map(topic => (
                    <SelectItem key={topic} value={topic}>
                      {topic}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>
            </div>
          </div>
          
          <Tabs defaultValue="all" onValueChange={(value) => setQuestionMode(value as "all" | "multiple-choice" | "theory")}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="all">All Questions</TabsTrigger>
              <TabsTrigger value="multiple-choice">Multiple Choice</TabsTrigger>
              <TabsTrigger value="theory">Theory Questions</TabsTrigger>
            </TabsList>
          </Tabs>
          
          <div className="bg-muted/30 rounded-md p-2 text-sm">
            <span className="font-medium">Filters:</span>
            <span className="ml-2">Level: {level.charAt(0).toUpperCase() + level.slice(1)}</span>
            {courseOutcome && <span className="ml-2">• CO{courseOutcome}</span>}
            <span className="ml-2">• {marks} marks</span>
            {questionMode !== "all" && (
              <span className="ml-2">• Type: {questionMode === "multiple-choice" ? "Multiple Choice" : "Theory"}</span>
            )}
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading questions...</div>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">
                No questions found matching the criteria
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try selecting a different topic or adjusting your question parameters
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredQuestions.map((question, index) => (
                  question.options && question.options.length > 0
                    ? renderMultipleChoiceQuestion(question, index)
                    : renderTheoryQuestion(question, index)
                ))}
              </div>
            </ScrollArea>
          )}
        </div>
        
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
