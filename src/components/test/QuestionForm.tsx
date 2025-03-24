
import React from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

interface QuestionFormProps {
  questionType: 'Multiple Choice' | 'Theory';
  newQuestion: {
    question: string;
    answer: string;
    options?: string[];
    marks: number;
    type: 'Multiple Choice' | 'Theory';
  };
  onQuestionTypeChange: (type: 'Multiple Choice' | 'Theory') => void;
  onQuestionChange: (updatedQuestion: any) => void;
}

export function QuestionForm({ 
  questionType, 
  newQuestion, 
  onQuestionTypeChange, 
  onQuestionChange 
}: QuestionFormProps) {
  return (
    <div className="space-y-4">
      <Tabs defaultValue={questionType} onValueChange={(value) => onQuestionTypeChange(value as any)}>
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="Multiple Choice">Multiple Choice</TabsTrigger>
          <TabsTrigger value="Theory">Theory</TabsTrigger>
        </TabsList>
        
        <TabsContent value="Multiple Choice" className="space-y-4">
          <div>
            <Label htmlFor="mcq-question">Question Text</Label>
            <Textarea
              id="mcq-question"
              value={newQuestion.question}
              onChange={(e) => onQuestionChange({...newQuestion, question: e.target.value})}
              placeholder="Enter question text"
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div>
            <Label>Options (exactly 4 required)</Label>
            {newQuestion.options?.map((option, index) => (
              <div key={index} className="flex items-center gap-2 mt-2">
                <RadioGroup 
                  value={newQuestion.answer === option ? "selected" : ""} 
                  onValueChange={() => onQuestionChange({...newQuestion, answer: option})}
                >
                  <RadioGroupItem value="selected" id={`option-${index}`} />
                </RadioGroup>
                <Input
                  value={option}
                  onChange={(e) => {
                    const newOptions = [...(newQuestion.options || [])];
                    newOptions[index] = e.target.value;
                    
                    const updatedQuestion = {...newQuestion, options: newOptions};
                    if (newQuestion.answer === newQuestion.options?.[index]) {
                      updatedQuestion.answer = e.target.value;
                    }
                    
                    onQuestionChange(updatedQuestion);
                  }}
                  placeholder={`Option ${index + 1}`}
                  className="flex-1"
                />
              </div>
            ))}
            <p className="text-xs text-muted-foreground mt-1">Select the radio button next to the correct answer</p>
          </div>
          
          <div>
            <Label htmlFor="mcq-marks">Marks</Label>
            <Input
              id="mcq-marks"
              type="number"
              value={newQuestion.marks}
              onChange={(e) => onQuestionChange({...newQuestion, marks: parseInt(e.target.value) || 1})}
              min={1}
              className="mt-1 w-20"
            />
          </div>
        </TabsContent>
        
        <TabsContent value="Theory" className="space-y-4">
          <div>
            <Label htmlFor="theory-question">Question Text</Label>
            <Textarea
              id="theory-question"
              value={newQuestion.question}
              onChange={(e) => onQuestionChange({...newQuestion, question: e.target.value})}
              placeholder="Enter question text"
              className="mt-1"
              rows={3}
            />
          </div>
          
          <div>
            <Label htmlFor="theory-answer">Model Answer</Label>
            <Textarea
              id="theory-answer"
              value={newQuestion.answer}
              onChange={(e) => onQuestionChange({...newQuestion, answer: e.target.value})}
              placeholder="Enter the model answer"
              className="mt-1"
              rows={4}
            />
          </div>
          
          <div>
            <Label htmlFor="theory-marks">Marks</Label>
            <Input
              id="theory-marks"
              type="number"
              value={newQuestion.marks}
              onChange={(e) => onQuestionChange({...newQuestion, marks: parseInt(e.target.value) || 1})}
              min={1}
              className="mt-1 w-20"
            />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
