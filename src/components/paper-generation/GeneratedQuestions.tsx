
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileX, Edit } from "lucide-react";
import { toast } from "sonner";
import { Question } from "@/types/papers";

interface GeneratedQuestionsProps {
  questions: Question[];
  topicName: string;
  clearQuestions: () => void;
  updateQuestions: (updatedQuestions: Question[]) => void;
}

export function GeneratedQuestions({
  questions,
  topicName,
  clearQuestions,
  updateQuestions,
}: GeneratedQuestionsProps) {
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [editedAnswer, setEditedAnswer] = useState<string>("");

  const handleEditAnswer = (question: Question) => {
    setEditingQuestion(question.id);
    setEditedAnswer(question.answer || "");
  };

  const saveEditedAnswer = (questionId: string) => {
    const updatedQuestions = questions.map(q => 
      q.id === questionId ? { ...q, answer: editedAnswer } : q
    );
    
    updateQuestions(updatedQuestions);
    setEditingQuestion(null);
    toast.success("Answer updated successfully");
  };

  const cancelEditing = () => {
    setEditingQuestion(null);
    setEditedAnswer("");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Questions</CardTitle>
        <CardDescription>
          Questions generated for {topicName}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {questions.map((question, index) => (
            <div 
              key={question.id} 
              className="p-4 border rounded-md"
            >
              <div className="flex items-start space-x-3">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium">
                    Q{index + 1}. {question.text}
                  </p>
                  
                  {question.options && (
                    <div className="mt-2 space-y-1 pl-4">
                      {question.options.map((option, idx) => (
                        <div key={idx} className={`text-sm ${option.isCorrect ? 'font-bold text-green-600' : ''}`}>
                          {String.fromCharCode(65 + idx)}. {option.text}
                          {option.isCorrect && " ✓"}
                        </div>
                      ))}
                    </div>
                  )}
                  
                  {editingQuestion === question.id ? (
                    <div className="mt-2 pl-4">
                      <p className="text-sm font-medium">Edit Answer:</p>
                      <textarea
                        value={editedAnswer}
                        onChange={(e) => setEditedAnswer(e.target.value)}
                        className="w-full p-2 mt-1 text-sm border rounded-md"
                        rows={3}
                      />
                      <div className="flex justify-end gap-2 mt-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={cancelEditing}
                        >
                          Cancel
                        </Button>
                        <Button 
                          size="sm"
                          onClick={() => saveEditedAnswer(question.id)}
                        >
                          Save
                        </Button>
                      </div>
                    </div>
                  ) : question.answer && (
                    <div className="mt-2 pl-4">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">Answer:</p>
                        <Button 
                          variant="ghost" 
                          size="sm"
                          className="h-8 px-2"
                          onClick={() => handleEditAnswer(question)}
                        >
                          <Edit className="h-3 w-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                      <p className="text-sm mt-1">{question.answer}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <Button 
          className="w-full mt-6" 
          variant="outline" 
          onClick={clearQuestions}
        >
          <FileX className="h-4 w-4 mr-2" />
          Clear Questions & Start Over
        </Button>
      </CardContent>
    </Card>
  );
}
