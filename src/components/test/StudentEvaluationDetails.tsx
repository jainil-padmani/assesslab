
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
  Clipboard,
  ClipboardCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { getAnswerSheetUrl } from "@/utils/assessment/fileUploadUtils";
import type { TestGrade } from "@/types/tests";
import type { PaperEvaluation } from "@/hooks/useTestDetail";
import { useTestFiles } from "@/hooks/test-selection/useTestFiles";
import { toast } from "sonner";

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
      if (!selectedStudentGrade?.student_id || !test?.subject_id || !test?.id) return;
      
      try {
        // Get the answer sheet URL from test_answers table
        const answerSheetUrl = await getAnswerSheetUrl(
          selectedStudentGrade.student_id,
          test.subject_id,
          test.id
        );
        
        if (answerSheetUrl) {
          // Add a cache-busting parameter to avoid browser caching
          const url = new URL(answerSheetUrl);
          url.searchParams.set('t', Date.now().toString());
          setLatestAnswerSheetUrl(url.toString());
        }

        // Also fetch text content if available
        const { data, error } = await supabase
          .from('test_answers')
          .select('text_content')
          .eq('student_id', selectedStudentGrade.student_id)
          .eq('subject_id', test.subject_id)
          .eq('test_id', test.id)
          .maybeSingle();
        
        if (error && error.code !== 'PGRST116') {
          console.error('Error fetching text content:', error);
        } else if (data?.text_content) {
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
  
  // Get the OCR extracted text
  const ocrText = extractedText || 
                  evaluation?.isOcrProcessed ? evaluation.text : 
                  "No OCR text available for this answer sheet";
                  
  // Copy text to clipboard
  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success("Copied to clipboard"))
      .catch(() => toast.error("Failed to copy"));
  };
  
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
          <TabsList className="grid grid-cols-5 mb-4">
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
            <TabsTrigger value="question-paper">Question Paper</TabsTrigger>
            <TabsTrigger value="answer-key">Answer Key</TabsTrigger>
            <TabsTrigger value="student-paper">Student Paper</TabsTrigger>
            <TabsTrigger value="ocr-text">OCR Text</TabsTrigger>
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
                  <h3 className="text-lg font-semibold">Question-Answer Pairs</h3>
                  
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
                              <div className={`
                                ${answer.score[0] === answer.score[1] ? "text-green-600" : 
                                  answer.score[0] >= answer.score[1] * 0.5 ? "text-amber-600" : "text-red-600"}
                              `}>
                                {answer.score[0]}/{answer.score[1]}
                              </div>
                              {answer.confidence >= 0.8 ? (
                                <CheckCircle className="h-4 w-4 text-green-600" />
                              ) : (
                                <AlertTriangle className="h-4 w-4 text-amber-600" />
                              )}
                              {answer.match_method === "semantic_matching" && (
                                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">AI Mapped</span>
                              )}
                            </div>
                          </div>
                        </AccordionTrigger>
                        <AccordionContent className="px-4 py-2 space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Question section - Left column */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-medium text-muted-foreground">Question</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(answer.question)}
                                  className="h-6 px-2"
                                >
                                  <Clipboard className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="bg-muted p-3 rounded-md">{answer.question}</div>
                              
                              {answer.expected_answer && (
                                <>
                                  <div className="flex justify-between items-center mt-3">
                                    <div className="text-sm font-medium text-muted-foreground">Expected Answer</div>
                                    <Button
                                      variant="ghost"
                                      size="sm"
                                      onClick={() => copyToClipboard(answer.expected_answer)}
                                      className="h-6 px-2"
                                    >
                                      <Clipboard className="h-3.5 w-3.5" />
                                    </Button>
                                  </div>
                                  <div className="bg-muted p-3 rounded-md border-l-4 border-green-500">
                                    {answer.expected_answer}
                                  </div>
                                </>
                              )}
                            </div>
                            
                            {/* Student's answer section - Right column */}
                            <div className="space-y-2">
                              <div className="flex justify-between items-center">
                                <div className="text-sm font-medium text-muted-foreground">Student's Answer</div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => copyToClipboard(answer.answer)}
                                  className="h-6 px-2"
                                >
                                  <Clipboard className="h-3.5 w-3.5" />
                                </Button>
                              </div>
                              <div className="bg-muted p-3 rounded-md whitespace-pre-wrap">{answer.answer}</div>
                              
                              <div className="space-y-2 mt-3">
                                <div className="text-sm font-medium text-muted-foreground">Assessment</div>
                                <div className="bg-muted p-3 rounded-md">
                                  <p className="mb-2">{answer.remarks}</p>
                                  <div className="flex items-center justify-between">
                                    <div className="flex flex-col gap-1">
                                      <p className="text-sm text-muted-foreground">
                                        Confidence: {Math.round(answer.confidence * 100)}%
                                      </p>
                                      {answer.match_method && (
                                        <p className="text-sm text-muted-foreground">
                                          Match method: {answer.match_method === "direct_numbering" 
                                            ? "Direct number matching" 
                                            : "AI semantic matching"}
                                        </p>
                                      )}
                                    </div>
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
                                          handleUpdateAnswerScore(selectedStudentGrade, index, newScore);
                                        }}
                                        className="h-8 w-20 text-center"
                                        min={0}
                                        max={answer.score[1]}
                                      />
                                      <span className="text-sm text-muted-foreground">/ {answer.score[1]}</span>
                                    </div>
                                  </div>
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
              <div className="rounded-md overflow-hidden border h-[600px]">
                <iframe 
                  src={`${addCacheBuster(questionPaperUrl)}#zoom=${zoomLevel/100}`}
                  className="w-full h-full"
                  title="Question Paper"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-5 w-5 mr-2" />
                No question paper available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="answer-key">
            {answerKeyUrl ? (
              <div className="rounded-md overflow-hidden border h-[600px]">
                <iframe 
                  src={`${addCacheBuster(answerKeyUrl)}#zoom=${zoomLevel/100}`}
                  className="w-full h-full"
                  title="Answer Key"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-5 w-5 mr-2" />
                No answer key available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="student-paper">
            {studentPaperUrl ? (
              <div className="rounded-md overflow-hidden border h-[600px]">
                <iframe 
                  src={`${addCacheBuster(studentPaperUrl)}#zoom=${zoomLevel/100}`}
                  className="w-full h-full"
                  title="Student Answer Sheet"
                />
              </div>
            ) : (
              <div className="flex items-center justify-center py-8 text-muted-foreground">
                <AlertTriangle className="h-5 w-5 mr-2" />
                No student answer sheet available
              </div>
            )}
          </TabsContent>
          
          <TabsContent value="ocr-text">
            <div className="flex flex-col h-[600px]">
              <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Extracted Text</h3>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => copyToClipboard(ocrText || '')}
                  disabled={!ocrText}
                  className="flex items-center gap-1"
                >
                  <Clipboard className="h-4 w-4 mr-1" />
                  Copy All
                </Button>
              </div>
              <div className="rounded-md border p-4 flex-grow overflow-auto">
                <pre className="whitespace-pre-wrap text-sm font-mono">{ocrText}</pre>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
