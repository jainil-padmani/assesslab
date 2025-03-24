
import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { syncAssessmentWithAnswerSheet, updateAssessmentQuestion } from "@/utils/assessment/assessmentService";
import { toast } from "sonner";
import { Loader2, Save, RefreshCw } from "lucide-react";
import { AssessmentQuestion } from "@/types/assessments";

interface AnswerManagementProps {
  assessmentId: string;
  questions: AssessmentQuestion[];
  refreshQuestions: () => void;
}

export function AnswerManagement({ assessmentId, questions, refreshQuestions }: AnswerManagementProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<string | null>(null);
  const [answers, setAnswers] = useState<Record<string, { answer: string, explanation: string }>>(() => {
    const initialAnswers: Record<string, { answer: string, explanation: string }> = {};
    questions.forEach(question => {
      initialAnswers[question.id] = { 
        answer: question.correctAnswer || '', 
        explanation: question.explanation || '' 
      };
    });
    return initialAnswers;
  });

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        answer: value
      }
    }));
  };

  const handleExplanationChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        explanation: value
      }
    }));
  };

  const handleSaveAnswer = async (questionId: string) => {
    try {
      setIsUpdating(true);
      
      const currentQuestion = questions.find(q => q.id === questionId);
      if (!currentQuestion) {
        toast.error("Question not found");
        return;
      }
      
      await updateAssessmentQuestion(questionId, {
        correctAnswer: answers[questionId].answer,
        explanation: answers[questionId].explanation
      });
      
      toast.success("Answer updated successfully");
      setEditingQuestion(null);
      refreshQuestions();
    } catch (error) {
      console.error("Error saving answer:", error);
      toast.error("Failed to save answer");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSyncAnswers = async () => {
    try {
      setIsUpdating(true);
      await syncAssessmentWithAnswerSheet(assessmentId);
      refreshQuestions();
      toast.success("Answers synced successfully");
    } catch (error) {
      console.error("Error syncing answers:", error);
      toast.error("Failed to sync answers");
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Answer Management</span>
          <Button 
            onClick={handleSyncAnswers} 
            disabled={isUpdating}
            variant="outline"
            size="sm"
          >
            {isUpdating ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-2 h-4 w-4" />
            )}
            Sync Answers
          </Button>
        </CardTitle>
        <CardDescription>
          Manage correct answers and explanations for each question
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {questions.map((question) => (
            <div key={question.id} className="border rounded-lg p-4">
              <div className="space-y-2">
                <h3 className="font-medium">{question.questionText}</h3>
                <p className="text-sm text-muted-foreground">
                  Question Type: {question.questionType}
                </p>
                
                {question.options && question.options.length > 0 && (
                  <div className="mt-2">
                    <Label className="text-sm">Options:</Label>
                    <ul className="list-disc pl-5 text-sm">
                      {question.options.map((option, idx) => (
                        <li key={idx}>{option}</li>
                      ))}
                    </ul>
                  </div>
                )}
                
                <div className="mt-4 space-y-4">
                  <div>
                    <Label htmlFor={`answer-${question.id}`}>Correct Answer:</Label>
                    {editingQuestion === question.id ? (
                      <Textarea
                        id={`answer-${question.id}`}
                        value={answers[question.id]?.answer || ''}
                        onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                        placeholder="Enter the correct answer"
                        className="mt-1"
                      />
                    ) : (
                      <div 
                        className="mt-1 p-2 bg-muted rounded-md min-h-[40px]"
                        onClick={() => setEditingQuestion(question.id)}
                      >
                        {question.correctAnswer || 'No answer provided'}
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <Label htmlFor={`explanation-${question.id}`}>Explanation:</Label>
                    {editingQuestion === question.id ? (
                      <Textarea
                        id={`explanation-${question.id}`}
                        value={answers[question.id]?.explanation || ''}
                        onChange={(e) => handleExplanationChange(question.id, e.target.value)}
                        placeholder="Explain why this is the correct answer"
                        className="mt-1"
                      />
                    ) : (
                      <div 
                        className="mt-1 p-2 bg-muted rounded-md min-h-[40px]"
                        onClick={() => setEditingQuestion(question.id)}
                      >
                        {question.explanation || 'No explanation provided'}
                      </div>
                    )}
                  </div>
                  
                  {editingQuestion === question.id && (
                    <div className="flex justify-end">
                      <Button 
                        variant="outline" 
                        className="mr-2" 
                        onClick={() => setEditingQuestion(null)}
                        disabled={isUpdating}
                      >
                        Cancel
                      </Button>
                      <Button 
                        onClick={() => handleSaveAnswer(question.id)} 
                        disabled={isUpdating}
                      >
                        {isUpdating ? (
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        ) : (
                          <Save className="mr-2 h-4 w-4" />
                        )}
                        Save
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
          
          {questions.length === 0 && (
            <div className="text-center p-4">
              <p className="text-muted-foreground">No questions found in this assessment</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
