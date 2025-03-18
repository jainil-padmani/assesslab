
import { Question } from "@/types/papers";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

interface TheoryQuestionProps {
  question: Question;
  index: number;
  onSelectQuestion: (question: Question) => void;
}

export function TheoryQuestion({ question, index, onSelectQuestion }: TheoryQuestionProps) {
  return (
    <Card className="hover:bg-accent/10 cursor-pointer transition-colors" onClick={() => onSelectQuestion(question)}>
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
}
