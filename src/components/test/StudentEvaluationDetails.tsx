
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { FileText, AlertTriangle, CheckCircle } from "lucide-react";
import type { TestGrade } from "@/types/tests";
import type { PaperEvaluation } from "@/hooks/useTestDetail";

interface StudentEvaluationDetailsProps {
  selectedStudentGrade: (TestGrade & { 
    evaluation?: PaperEvaluation | null 
  }) | null;
  test: any;
  handleUpdateAnswerScore: (
    grade: TestGrade & { evaluation?: PaperEvaluation | null }, 
    questionIndex: number, 
    newScore: number
  ) => void;
}

export function StudentEvaluationDetails({ 
  selectedStudentGrade, 
  test,
  handleUpdateAnswerScore 
}: StudentEvaluationDetailsProps) {
  if (!selectedStudentGrade?.evaluation) {
    return null;
  }
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-primary" />
          Evaluation Details for {selectedStudentGrade.student?.name}
        </CardTitle>
        <CardDescription>
          Review AI-generated evaluation and adjust scores if necessary
        </CardDescription>
      </CardHeader>
      <CardContent>
        {(() => {
          const evaluation = selectedStudentGrade.evaluation?.evaluation_data;
          if (!evaluation || !evaluation.answers) {
            return (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-5 w-5 mr-2" />
                No evaluation data available
              </div>
            );
          }
          
          return (
            <div className="space-y-6">
              <div className="bg-muted p-4 rounded-md">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Student</p>
                    <p className="text-lg font-semibold">{evaluation.student_name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Roll Number</p>
                    <p className="text-lg font-semibold">{evaluation.roll_no || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Subject</p>
                    <p className="text-lg font-semibold">{evaluation.subject || test.subjects?.name}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Total Score</p>
                    <p className="text-lg font-semibold">
                      {evaluation.summary?.totalScore[0]}/{evaluation.summary?.totalScore[1]} 
                      <span className="ml-2 text-muted-foreground">
                        ({evaluation.summary?.percentage}%)
                      </span>
                    </p>
                  </div>
                </div>
              </div>
            
              <div className="space-y-4">
                <h3 className="text-lg font-semibold">Answers</h3>
                
                <Accordion type="single" collapsible className="w-full">
                  {evaluation.answers.map((answer: any, index: number) => (
                    <AccordionItem key={index} value={`item-${index}`}>
                      <AccordionTrigger className="px-4 hover:bg-muted/50">
                        <div className="flex justify-between w-full items-center pr-4">
                          <div className="text-left">
                            <div className="font-medium">
                              Question {answer.question_no}: {answer.question.substring(0, 60)}
                              {answer.question.length > 60 ? '...' : ''}
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className={answer.score[0] === answer.score[1] ? "text-green-600" : "text-amber-600"}>
                              {answer.score[0]}/{answer.score[1]}
                            </div>
                            {answer.confidence >= 0.8 ? (
                              <CheckCircle className="h-4 w-4 text-green-600" />
                            ) : (
                              <AlertTriangle className="h-4 w-4 text-amber-600" />
                            )}
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-4 py-2 space-y-4">
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Question</div>
                          <div className="bg-muted p-3 rounded-md">{answer.question}</div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Student's Answer</div>
                          <div className="bg-muted p-3 rounded-md whitespace-pre-wrap">{answer.answer}</div>
                        </div>
                        
                        <div className="space-y-2">
                          <div className="text-sm font-medium text-muted-foreground">Assessment</div>
                          <div className="bg-muted p-3 rounded-md">
                            <p className="mb-2">{answer.remarks}</p>
                            <div className="flex items-center justify-between">
                              <p className="text-sm text-muted-foreground">
                                Confidence: {Math.round(answer.confidence * 100)}%
                              </p>
                              <div className="flex items-center gap-2">
                                <span className="text-sm text-muted-foreground">Score:</span>
                                <Input
                                  type="number"
                                  value={answer.score[0]}
                                  onChange={(e) => {
                                    const newScore = Math.min(
                                      Math.max(0, Number(e.target.value)), 
                                      answer.score[1]
                                    );
                                    handleUpdateAnswerScore(
                                      selectedStudentGrade, 
                                      index, 
                                      newScore
                                    );
                                  }}
                                  min={0}
                                  max={answer.score[1]}
                                  className="w-16 h-8"
                                />
                                <span className="text-sm text-muted-foreground">
                                  / {answer.score[1]}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>
              </div>
            </div>
          );
        })()}
      </CardContent>
    </Card>
  );
}
