
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Question } from "@/types/papers";
import { useQuestionFetching } from "./hooks/useQuestionFetching";
import { useQuestionFiltering } from "./hooks/useQuestionFiltering";
import { TopicSelector } from "./filters/TopicSelector";
import { QuestionFilters } from "./filters/QuestionFilters";
import { MultipleChoiceQuestion } from "./rendering/MultipleChoiceQuestion";
import { TheoryQuestion } from "./rendering/TheoryQuestion";

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
  // Use custom hooks for fetching and filtering questions
  const { 
    topics, 
    selectedTopic, 
    setSelectedTopic, 
    questions, 
    loading 
  } = useQuestionFetching({ subjectId, level, courseOutcome, open });
  
  const {
    searchQuery,
    setSearchQuery,
    questionMode,
    setQuestionMode,
    filteredQuestions
  } = useQuestionFiltering(questions);

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
              <TopicSelector
                selectedTopic={selectedTopic}
                setSelectedTopic={setSelectedTopic}
                topics={topics}
                disabled={loading}
              />
            </div>
            <div className="flex-1">
              <QuestionFilters
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                questionMode={questionMode}
                setQuestionMode={setQuestionMode}
                level={level}
                courseOutcome={courseOutcome}
                marks={marks}
              />
            </div>
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
                    ? <MultipleChoiceQuestion 
                        key={question.id || index}
                        question={question} 
                        index={index} 
                        onSelectQuestion={handleSelectQuestion} 
                      />
                    : <TheoryQuestion 
                        key={question.id || index}
                        question={question} 
                        index={index} 
                        onSelectQuestion={handleSelectQuestion} 
                      />
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
