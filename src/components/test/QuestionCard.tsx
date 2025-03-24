
import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Trash2, CheckCircle, XCircle } from "lucide-react";

interface QuestionCardProps {
  question: {
    id?: string;
    question: string;
    answer: string;
    options?: string[];
    marks: number;
    topic?: string;
    type: 'Multiple Choice' | 'Theory';
  };
  index: number;
  onDelete: () => void;
}

export function QuestionCard({ question, index, onDelete }: QuestionCardProps) {
  return (
    <div className="border rounded-md p-4 relative">
      <div className="absolute top-2 right-2">
        <Button
          variant="ghost"
          size="icon"
          onClick={onDelete}
          className="h-8 w-8"
        >
          <Trash2 className="h-4 w-4 text-red-500" />
        </Button>
      </div>
      
      <div className="flex items-center gap-2 mb-2">
        <span className="font-semibold">Q{index + 1}.</span>
        <Badge variant={question.type === 'Multiple Choice' ? 'outline' : 'secondary'}>
          {question.type === 'Multiple Choice' ? 'MCQ' : 'Theory'}
        </Badge>
        <span className="text-sm bg-secondary px-2 py-0.5 rounded">
          {question.marks} mark{question.marks !== 1 ? 's' : ''}
        </span>
        {question.topic && (
          <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
            {question.topic}
          </span>
        )}
      </div>
      
      <p className="font-medium mb-3">{question.question}</p>
      
      {question.type === 'Multiple Choice' && question.options && question.options.length > 0 && (
        <div className="ml-4 mb-3">
          <p className="text-sm text-gray-500 mb-1">Options:</p>
          <ul className="space-y-1">
            {question.options.map((option, i) => (
              option ? (
                <li key={i} className={`text-sm flex items-center ${option === question.answer ? 'text-green-600 font-medium' : ''}`}>
                  {option === question.answer ? (
                    <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                  ) : (
                    <XCircle className="h-3 w-3 mr-2 text-gray-400" />
                  )}
                  {option}
                </li>
              ) : null
            ))}
          </ul>
        </div>
      )}
      
      <div className="text-sm">
        <span className="font-medium text-gray-700">Answer: </span>
        <span>{question.answer}</span>
      </div>
    </div>
  );
}
