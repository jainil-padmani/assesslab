
import React, { useState, useEffect } from "react";
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
import { 
  FileText, 
  AlertTriangle, 
  CheckCircle, 
  ZoomIn, 
  ZoomOut,
  RotateCw,
  FileDigit,
  FileQuestion,
  FileCheck,
  FilePen
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import type { TestGrade } from "@/types/tests";
import type { PaperEvaluation } from "@/hooks/useTestDetail";
import { useTestFiles } from "@/hooks/test-selection/useTestFiles";

interface StudentEvaluationDetailsProps {
  selectedStudentGrade: (TestGrade & { 
    evaluation?: PaperEvaluation | null;
    answer_sheet_url?: string | null;
  }) | null;
  test: any;
  handleUpdateAnswerScore: (
    grade: TestGrade & { 
      evaluation?: PaperEvaluation | null;
      answer_sheet_url?: string | null;
    }, 
    questionIndex: number, 
    newScore: number
  ) => void;
}

export function StudentEvaluationDetails({ 
  selectedStudentGrade, 
  test,
  handleUpdateAnswerScore 
}: StudentEvaluationDetailsProps) {
  const [zoomLevel, setZoomLevel] = useState(100);
  const [activeTab, setActiveTab] = useState("evaluation");
  const [latestAnswerSheetUrl, setLatestAnswerSheetUrl] = useState<string | null>(null);
  const [extractedText, setExtractedText] = useState<string | null>(null);
  
  const { testFiles } = useTestFiles(test?.id);

  // Fetch the latest answer sheet URL directly from the database
  useEffect(() => {
    const fetchLatestAnswerSheet = async () => {
      if (!selectedStudentGrade?.student_id || !test?.subject_id) return;
      
      try {
        // Get the latest assessment for this student and subject
        const { data, error } = await supabase
          .from('assessments')
          .select('answer_sheet_url, text_content')
          .eq('student_id', selectedStudentGrade.student_id)
          .eq('subject_id', test.subject_id)
          .eq('test_id', test.id)
          .order('updated_at', { ascending: false })
          .limit(1)
          .single();
        
        if (error) {
          console.error('Error fetching latest answer sheet:', error);
          return;
        }
        
        if (data?.answer_sheet_url) {
          // Add a cache-busting parameter to avoid browser caching
          const url = new URL(data.answer_sheet_url);
          url.searchParams.set('t', Date.now().toString());
          setLatestAnswerSheetUrl(url.toString());
        }

        // Set the extracted text from OCR if available
        if (data?.text_content) {
          setExtractedText(data.text_content);
        } else {
          setExtractedText(null);
        }
      } catch (error) {
        console.error('Error in fetchLatestAnswerSheet:', error);
      }
    };
    
    fetchLatestAnswerSheet();
  }, [selectedStudentGrade?.student_id, test?.subject_id, test?.id]);

  if (!selectedStudentGrade?.evaluation) {
    return null;
  }

  const evaluation = selectedStudentGrade.evaluation?.evaluation_data;
  
  const questionPaperUrl = testFiles && testFiles.length > 0 
    ? testFiles[0].question_paper_url 
    : test?.files?.find((file: any) => file.question_paper_url)?.question_paper_url;
    
  const answerKeyUrl = testFiles && testFiles.length > 0 
    ? testFiles[0].answer_key_url 
    : test?.files?.find((file: any) => file.answer_key_url)?.answer_key_url;
    
  // Prioritize the latest answer sheet URL from the database
  const studentPaperUrl = latestAnswerSheetUrl || 
                         evaluation?.answer_sheet_url || 
                         selectedStudentGrade.answer_sheet_url;

  const handleZoomIn = () => {
    setZoomLevel(prev => Math.min(prev + 25, 200));
  };

  const handleZoomOut = () => {
    setZoomLevel(prev => Math.max(prev - 25, 50));
  };

  const handleResetZoom = () => {
    setZoomLevel(100);
  };
  
  // Add cache-busting parameters to PDF URLs
  const addCacheBuster = (url: string | null | undefined) => {
    if (!url) return null;
    const cacheBuster = `t=${Date.now()}`;
    return url.includes('?') ? `${url}&${cacheBuster}` : `${url}?${cacheBuster}`;
  };
  
  // Get the OCR extracted text for all documents
  const studentOcrText = extractedText || 
                        evaluation?.isOcrProcessed ? evaluation.text : 
                        "No OCR text available for this answer sheet";
                        
  const questionPaperOcrText = evaluation?.questionPaperText || 
                               "No OCR text available for the question paper";
                               
  const answerKeyOcrText = evaluation?.answerKeyText || 
                           "No OCR text available for the answer key";
  
  return (
    <Card className="mb-8">
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-primary" />
              Evaluation Details for {selectedStudentGrade.student?.name}
            </CardTitle>
            <CardDescription>
              Review AI-generated evaluation and adjust scores if necessary
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleZoomOut}
              disabled={zoomLevel <= 50}
              title="Zoom Out"
            >
              <ZoomOut className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleResetZoom}
              title="Reset Zoom"
            >
              <RotateCw className="h-4 w-4" />
              <span className="ml-1">{zoomLevel}%</span>
            </Button>
            <Button 
              variant="outline" 
              size="sm"
              onClick={handleZoomIn}
              disabled={zoomLevel >= 200}
              title="Zoom In"
            >
              <ZoomIn className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid grid-cols-7 mb-4">
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="question-paper">Question Paper</TabsTrigger>
            <TabsTrigger value="answer-key">Answer Key</TabsTrigger>
            <TabsTrigger value="student-paper">Student Paper</TabsTrigger>
            <TabsTrigger value="question-ocr">Question OCR</TabsTrigger>
            <TabsTrigger value="answer-key-ocr">Answer Key OCR</TabsTrigger>
            <TabsTrigger value="student-ocr">Student OCR</TabsTrigger>
          </TabsList>
          
          <TabsContent value="evaluation">
            {!evaluation || !evaluation.answers ? (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-5 w-5 mr-2" />
                No evaluation data available
              </div>
            ) : (
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
            )}
          </TabsContent>
          
          <TabsContent value="question-paper">
            {questionPaperUrl ? (
              <div className="h-[600px] overflow-auto border rounded-md">
                <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', width: `${100 / (zoomLevel / 100)}%` }}>
                  <iframe 
                    src={`${addCacheBuster(questionPaperUrl)}#view=FitH`} 
                    title="Question Paper" 
                    className="w-full h-[600px]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[600px] border rounded-md">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>Question paper not available</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="answer-key">
            {answerKeyUrl ? (
              <div className="h-[600px] overflow-auto border rounded-md">
                <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', width: `${100 / (zoomLevel / 100)}%` }}>
                  <iframe 
                    src={`${addCacheBuster(answerKeyUrl)}#view=FitH`} 
                    title="Answer Key" 
                    className="w-full h-[600px]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[600px] border rounded-md">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>Answer key not available</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="student-paper">
            {studentPaperUrl ? (
              <div className="h-[600px] overflow-auto border rounded-md">
                <div style={{ transform: `scale(${zoomLevel / 100})`, transformOrigin: 'top left', width: `${100 / (zoomLevel / 100)}%` }}>
                  <iframe 
                    src={`${addCacheBuster(studentPaperUrl)}#view=FitH`} 
                    title="Student Paper" 
                    className="w-full h-[600px]"
                  />
                </div>
              </div>
            ) : (
              <div className="flex items-center justify-center h-[600px] border rounded-md">
                <div className="text-center text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>Student paper not available</p>
                </div>
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="question-ocr">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileQuestion className="h-5 w-5 text-primary" />
                  Extracted Text from Question Paper
                </h3>
              </div>
              
              {!questionPaperOcrText || questionPaperOcrText === "No OCR text available for the question paper" ? (
                <div className="flex items-center justify-center h-[600px] border rounded-md">
                  <div className="text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>No OCR text available for the question paper</p>
                  </div>
                </div>
              ) : (
                <div className="h-[600px] overflow-auto border rounded-md p-4 bg-white dark:bg-gray-950">
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {questionPaperOcrText}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="answer-key-ocr">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FileCheck className="h-5 w-5 text-primary" />
                  Extracted Text from Answer Key
                </h3>
              </div>
              
              {!answerKeyOcrText || answerKeyOcrText === "No OCR text available for the answer key" ? (
                <div className="flex items-center justify-center h-[600px] border rounded-md">
                  <div className="text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>No OCR text available for the answer key</p>
                  </div>
                </div>
              ) : (
                <div className="h-[600px] overflow-auto border rounded-md p-4 bg-white dark:bg-gray-950">
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {answerKeyOcrText}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
          
          <TabsContent value="student-ocr">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold flex items-center gap-2">
                  <FilePen className="h-5 w-5 text-primary" />
                  Extracted Text from Student Answer
                </h3>
              </div>
              
              {!studentOcrText || studentOcrText === "No OCR text available for this answer sheet" ? (
                <div className="flex items-center justify-center h-[600px] border rounded-md">
                  <div className="text-center text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                    <p>No OCR text available for this answer sheet</p>
                  </div>
                </div>
              ) : (
                <div className="h-[600px] overflow-auto border rounded-md p-4 bg-white dark:bg-gray-950">
                  <div className="whitespace-pre-wrap font-mono text-sm">
                    {studentOcrText}
                  </div>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
