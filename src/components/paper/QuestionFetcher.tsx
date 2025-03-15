
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Question } from "@/types/papers";
import { Search, Check, Filter, ChevronDown, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";
import { Json } from "@/integrations/supabase/types";
import { Badge } from "@/components/ui/badge";

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
  const [showExactMatches, setShowExactMatches] = useState(false);
  const [topicSelected, setTopicSelected] = useState(false);

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
      
      // Reset state when topics change
      setSelectedTopic("");
      setTopicSelected(false);
      setQuestions([]);
      setFilteredQuestions([]);
      
    } catch (error) {
      console.error("Error fetching topics:", error);
      toast.error("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  // Filter questions based on search query and exact match setting
  useEffect(() => {
    let filtered = questions;
    
    // First filter by search query
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => q.text.toLowerCase().includes(query));
    }
    
    // Then filter by exact matches if enabled
    if (showExactMatches) {
      filtered = filtered.filter(q => {
        const matchesLevel = q.level === level;
        const matchesCO = courseOutcome ? q.courseOutcome === courseOutcome : true;
        const matchesMarks = q.marks === marks;
        return matchesLevel && matchesCO && matchesMarks;
      });
    } else {
      // Apply base filtering by level and CO
      filtered = filtered.filter(q => {
        const matchesLevel = q.level === level;
        const matchesCO = courseOutcome ? q.courseOutcome === courseOutcome : true;
        return matchesLevel && matchesCO;
      });
    }
    
    setFilteredQuestions(filtered);
  }, [questions, searchQuery, showExactMatches, level, courseOutcome, marks]);

  const handleFetchQuestions = () => {
    if (selectedTopic) {
      setTopicSelected(true);
      fetchQuestions();
    } else {
      toast.error("Please select a topic first");
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('generated_questions')
        .select('questions')
        .eq('subject_id', subjectId)
        .eq('topic', selectedTopic)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0 && data[0].questions) {
        // Fix the type conversion issue here
        const questionsData = data[0].questions;
        let allQuestions: Question[] = [];
        
        // Validate if it's an array and has the right structure
        if (Array.isArray(questionsData)) {
          // Convert from Json[] to Question[] with proper type checking
          allQuestions = questionsData
            .filter((q): q is Record<string, Json> => 
              typeof q === 'object' && 
              q !== null && 
              'id' in q && 
              'text' in q && 
              'type' in q && 
              'marks' in q && 
              'level' in q
            )
            .map(q => ({
              id: String(q.id || ''),
              text: String(q.text || ''),
              type: String(q.type || ''),
              marks: Number(q.marks || 0),
              level: String(q.level || ''),
              // Handle optional courseOutcome property
              courseOutcome: q.courseOutcome !== undefined ? Number(q.courseOutcome) : undefined
            }));
        }
        
        setQuestions(allQuestions);
        toast.success(`Loaded ${allQuestions.length} questions for topic "${selectedTopic}"`);
      } else {
        setQuestions([]);
        toast.info("No questions found for this topic");
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
    toast.success("Question added to paper");
  };

  // Check if a question is an exact match for all criteria
  const isExactMatch = (question: Question) => {
    return question.level === level && 
           (courseOutcome ? question.courseOutcome === courseOutcome : true) && 
           question.marks === marks;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Select Question for Paper</DialogTitle>
          <DialogDescription>
            Choose a question from your generated question bank to add to your paper
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
                <SelectTrigger>
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
            <Button 
              variant="outline" 
              className="shrink-0"
              onClick={handleFetchQuestions}
              disabled={!selectedTopic || loading}
            >
              <FileText className="h-4 w-4 mr-2" />
              Fetch Questions
            </Button>
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search questions..."
                  className="pl-8"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  disabled={!topicSelected || questions.length === 0}
                />
              </div>
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <div className="bg-muted/30 rounded-md p-2 text-sm flex-1">
              <span className="font-medium">Criteria:</span>
              <span className="ml-2">Level: {level.charAt(0).toUpperCase() + level.slice(1)}</span>
              {courseOutcome && <span className="ml-2">• CO{courseOutcome}</span>}
              <span className="ml-2">• {marks} marks</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowExactMatches(!showExactMatches)}
              className="ml-2 flex items-center gap-1"
              disabled={!topicSelected || questions.length === 0}
            >
              <Filter className="h-4 w-4" />
              {showExactMatches ? "Show All" : "Exact Matches"}
            </Button>
          </div>
          
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-pulse text-muted-foreground">Loading questions...</div>
            </div>
          ) : !topicSelected ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">
                Select a topic and click "Fetch Questions" to view available questions
              </p>
            </div>
          ) : filteredQuestions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-center">
              <p className="text-muted-foreground">
                No questions found matching the criteria
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Try selecting a different topic or adjusting your search
              </p>
            </div>
          ) : (
            <ScrollArea className="h-[400px] pr-4">
              <div className="space-y-2">
                {filteredQuestions.map((question, index) => {
                  const exactMatch = isExactMatch(question);
                  return (
                    <Card 
                      key={question.id || index} 
                      className={`hover:bg-accent/10 cursor-pointer transition-colors ${exactMatch ? 'border-primary/50' : ''}`}
                      onClick={() => handleSelectQuestion(question)}
                    >
                      <CardContent className="p-3">
                        <div className="flex items-start gap-2">
                          <div className="flex-1">
                            <p className="text-sm">{question.text}</p>
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              <Badge variant={question.level === level ? "default" : "outline"}>
                                {question.level}
                              </Badge>
                              {question.courseOutcome && (
                                <Badge variant={question.courseOutcome === courseOutcome ? "default" : "outline"}>
                                  CO{question.courseOutcome}
                                </Badge>
                              )}
                              <Badge variant={question.marks === marks ? "default" : "outline"}>
                                {question.marks} {question.marks === 1 ? 'mark' : 'marks'}
                              </Badge>
                              {exactMatch && (
                                <Badge variant="secondary" className="ml-auto">
                                  Exact Match
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                            <Check className="h-4 w-4" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
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
