
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Question } from "@/types/papers";
import { Search, Check } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Input } from "@/components/ui/input";

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

  // Filter questions based on search query
  useEffect(() => {
    if (searchQuery.trim() === "") {
      setFilteredQuestions(questions);
    } else {
      const query = searchQuery.toLowerCase();
      setFilteredQuestions(
        questions.filter(q => q.text.toLowerCase().includes(query))
      );
    }
  }, [questions, searchQuery]);

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
        const allQuestions = data[0].questions as Question[];
        
        // Filter by level and courseOutcome if provided
        let filteredByAttributes = allQuestions.filter(q => {
          let matchesLevel = q.level === level;
          let matchesCO = courseOutcome ? q.courseOutcome === courseOutcome : true;
          return matchesLevel && matchesCO;
        });
        
        setQuestions(filteredByAttributes);
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
          
          <div className="bg-muted/30 rounded-md p-2 text-sm">
            <span className="font-medium">Filters:</span>
            <span className="ml-2">Level: {level.charAt(0).toUpperCase() + level.slice(1)}</span>
            {courseOutcome && <span className="ml-2">• CO{courseOutcome}</span>}
            <span className="ml-2">• {marks} marks</span>
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
                  <Card key={question.id || index} className="hover:bg-accent/10 cursor-pointer transition-colors" onClick={() => handleSelectQuestion(question)}>
                    <CardContent className="p-3">
                      <div className="flex items-start gap-2">
                        <div className="flex-1">
                          <p className="text-sm">{question.text}</p>
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
                          </div>
                        </div>
                        <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0">
                          <Check className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
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
