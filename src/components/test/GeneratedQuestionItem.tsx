
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PlusCircle, CheckCircle } from "lucide-react";

interface GeneratedQuestionOption {
  text: string;
  isCorrect: boolean;
}

interface GeneratedQuestionItemProps {
  question: {
    id: string;
    topic: string;
    question: string;
    options?: (string | GeneratedQuestionOption)[] | null;
    answer: string;
    type?: string;
  };
  onAdd: (question: any) => void;
}

export function GeneratedQuestionItem({ question, onAdd }: GeneratedQuestionItemProps) {
  // Determine if this is an MCQ or a theory question
  const isMCQ = question.type === 'Multiple Choice' || 
    (question.options && question.options.length > 0);

  return (
    <li className="border-b pb-4 last:border-b-0">
      <div className="flex justify-between items-start gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <Badge variant={isMCQ ? 'outline' : 'secondary'}>
              {isMCQ ? 'MCQ' : 'Theory'}
            </Badge>
          </div>
          <p className="font-medium">{question.question}</p>
          {question.options && question.options.length > 0 && (
            <ul className="mt-2 space-y-1">
              {question.options.map((option, i) => {
                let optionText = '';
                let isCorrect = false;
                
                if (typeof option === 'string') {
                  optionText = option;
                  isCorrect = option === question.answer;
                } else if (option && typeof option === 'object') {
                  // Handle object format with text and isCorrect properties
                  if ('text' in option) {
                    optionText = option.text as string;
                    isCorrect = 'isCorrect' in option ? (option.isCorrect as boolean) : false;
                  }
                }
                
                return (
                  <li key={i} className={`text-sm ${isCorrect ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                    {isCorrect && <CheckCircle className="h-3 w-3 inline mr-1" />}
                    {optionText}
                  </li>
                );
              })}
            </ul>
          )}
          <p className="mt-2 text-sm font-medium">
            <span className="text-gray-500">Answer:</span> {question.answer}
          </p>
        </div>
        <Button size="sm" onClick={() => onAdd(question)}>
          <PlusCircle className="h-4 w-4 mr-1" />
          Add
        </Button>
      </div>
    </li>
  );
}
