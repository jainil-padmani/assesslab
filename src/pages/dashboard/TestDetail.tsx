
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Edit, X, FileText, AlertTriangle, CheckCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Test, TestGrade } from "@/types/tests";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";
import { TestPapersManagement } from "@/components/test/TestPapersManagement";

interface PaperEvaluation {
  id: string;
  test_id: string;
  student_id: string;
  subject_id: string;
  evaluation_data: any;
  status: string;
  created_at: string;
  updated_at: string;
}

export default function TestDetail() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState<number>(0);
  
  // Get student ID from URL if present
  const studentId = searchParams.get('student');

  const { data: test, isLoading: isTestLoading } = useQuery({
    queryKey: ["test", testId],
    queryFn: async () => {
      if (!testId) return null;
      
      const { data, error } = await supabase
        .from("tests")
        .select("*, subjects!inner(*)")
        .eq("id", testId)
        .single();
      
      if (error) {
        toast.error("Failed to load test details");
        throw error;
      }
      
      return data as Test & { subjects: { name: string, subject_code: string } };
    },
    enabled: !!testId
  });

  const { data: grades, isLoading: isGradesLoading, refetch } = useQuery({
    queryKey: ["testGrades", testId],
    queryFn: async () => {
      if (!testId || !test) return [];
      
      // Get all students in this class
      const { data: classStudents, error: classError } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", test?.class_id || "");
      
      if (classError) {
        toast.error("Failed to load students in this class");
        throw classError;
      }
      
      // Get existing grades for this test
      const { data: existingGrades, error: gradesError } = await supabase
        .from("test_grades")
        .select("*")
        .eq("test_id", testId);
      
      if (gradesError) {
        toast.error("Failed to load test grades");
        throw gradesError;
      }

      // Get assessments (uploaded answer sheets) for students in this test
      const { data: assessments, error: assessmentsError } = await supabase
        .from("assessments")
        .select("*")
        .eq("subject_id", test.subject_id);
        
      if (assessmentsError) {
        toast.error("Failed to load assessments");
        throw assessmentsError;
      }
      
      // Get evaluation data for this test
      const { data: evaluations, error: evaluationsError } = await supabase
        .from("paper_evaluations")
        .select("*")
        .eq("test_id", testId);
        
      if (evaluationsError) {
        console.error("Failed to load evaluations:", evaluationsError);
      }
      
      // Map grades to students or create empty grades
      const studentGrades = (classStudents as Student[]).map(student => {
        const existingGrade = (existingGrades as TestGrade[]).find(
          grade => grade.student_id === student.id
        );
        
        // Find assessment for this student if it exists
        const studentAssessment = assessments ? assessments.find(
          assessment => assessment.student_id === student.id
        ) : null;
        
        // Find evaluation for this student if it exists
        const studentEvaluation = evaluations ? evaluations.find(
          evaluation => evaluation.student_id === student.id
        ) : null;
        
        if (existingGrade) {
          return {
            ...existingGrade,
            student,
            answer_sheet_url: studentAssessment?.answer_sheet_url || null,
            evaluation: studentEvaluation
          };
        } else {
          return {
            id: `temp-${student.id}`,
            test_id: testId!,
            student_id: student.id,
            marks: 0,
            remarks: null,
            created_at: new Date().toISOString(),
            student,
            answer_sheet_url: studentAssessment?.answer_sheet_url || null,
            evaluation: studentEvaluation
          } as TestGrade & { 
            answer_sheet_url: string | null;
            evaluation: PaperEvaluation | null;
          };
        }
      });
      
      return studentGrades;
    },
    enabled: !!testId && !!test
  });

  const handleSaveMarks = async (grade: TestGrade) => {
    try {
      // Check if this is a temp id (new grade)
      const isNewGrade = grade.id.startsWith('temp-');
      
      if (isNewGrade) {
        // Create a new grade
        const { data, error } = await supabase
          .from("test_grades")
          .insert({
            test_id: grade.test_id,
            student_id: grade.student_id,
            marks: editMarks,
            remarks: grade.remarks
          })
          .select();
        
        if (error) throw error;
        
        toast.success("Grade saved successfully");
      } else {
        // Update existing grade
        const { error } = await supabase
          .from("test_grades")
          .update({ marks: editMarks })
          .eq("id", grade.id);
        
        if (error) throw error;
        
        toast.success("Grade updated successfully");
      }
      
      setEditingStudentId(null);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save grade: ${error.message}`);
    }
  };

  // Update answer confidence score
  const handleUpdateAnswerScore = async (
    grade: TestGrade & { evaluation?: PaperEvaluation | null }, 
    questionIndex: number, 
    newScore: number
  ) => {
    try {
      if (!grade.evaluation) {
        toast.error("No evaluation data found for this student");
        return;
      }
      
      // Get the evaluation data
      const evaluationData = grade.evaluation.evaluation_data;
      if (!evaluationData || !evaluationData.answers || !Array.isArray(evaluationData.answers)) {
        toast.error("Invalid evaluation data");
        return;
      }
      
      // Update the score for the specific question
      const updatedAnswers = [...evaluationData.answers];
      if (updatedAnswers[questionIndex] && Array.isArray(updatedAnswers[questionIndex].score)) {
        // Update the score
        updatedAnswers[questionIndex].score[0] = newScore;
        
        // Recalculate total score
        let totalAssignedScore = 0;
        let totalPossibleScore = 0;
        
        updatedAnswers.forEach(answer => {
          if (Array.isArray(answer.score) && answer.score.length === 2) {
            totalAssignedScore += Number(answer.score[0]);
            totalPossibleScore += Number(answer.score[1]);
          }
        });
        
        // Update the summary
        const updatedEvaluationData = {
          ...evaluationData,
          answers: updatedAnswers,
          summary: {
            ...evaluationData.summary,
            totalScore: [totalAssignedScore, totalPossibleScore],
            percentage: totalPossibleScore > 0 ? Math.round((totalAssignedScore / totalPossibleScore) * 100) : 0
          }
        };
        
        // Save to database
        const { error: evalError } = await supabase
          .from("paper_evaluations")
          .update({
            evaluation_data: updatedEvaluationData,
            updated_at: new Date().toISOString()
          })
          .eq("id", grade.evaluation.id);
        
        if (evalError) throw evalError;
        
        // Update the test grade
        const { error: gradeError } = await supabase
          .from("test_grades")
          .upsert({
            test_id: grade.test_id,
            student_id: grade.student_id,
            marks: totalAssignedScore,
            remarks: `Updated manually: ${totalAssignedScore}/${totalPossibleScore}`
          });
        
        if (gradeError) throw gradeError;
        
        toast.success("Score updated successfully");
        refetch();
      } else {
        toast.error("Failed to update score: Invalid score format");
      }
    } catch (error: any) {
      toast.error(`Failed to update score: ${error.message}`);
      console.error("Error updating score:", error);
    }
  };

  const isLoading = isTestLoading || isGradesLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!test) {
    return <div className="text-center py-12">Test not found</div>;
  }

  // Find the selected student's grade
  const selectedStudentGrade = studentId 
    ? grades?.find(grade => grade.student_id === studentId)
    : null;

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Button 
          variant="outline" 
          onClick={() => navigate(`/dashboard/tests/subject/${test.subject_id}`)}
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subject Tests
        </Button>
      </div>

      <div className="mb-8">
        <h1 className="text-3xl font-bold">{test.name}</h1>
        <div className="flex gap-4 mt-2 text-gray-600">
          <p>Subject: {test.subjects?.name}</p>
          <p>Date: {format(new Date(test.test_date), 'dd MMM yyyy')}</p>
          <p>Maximum Marks: {test.max_marks}</p>
        </div>
      </div>

      {/* Add the TestPapersManagement component here */}
      <TestPapersManagement test={test} />

      {/* Student Evaluation Details */}
      {selectedStudentGrade?.evaluation && (
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
      )}

      <Card>
        <CardHeader>
          <CardTitle>Student Grades</CardTitle>
          <CardDescription>
            Manage grades for all students in this test. Click the edit button to update a student's marks.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {grades && grades.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Student Name</TableHead>
                  <TableHead>GR Number</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Answer Sheet</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(grade => (
                  <TableRow key={grade.id}>
                    <TableCell className="font-medium">
                      {grade.student?.name}
                    </TableCell>
                    <TableCell>{grade.student?.gr_number}</TableCell>
                    <TableCell>{grade.student?.roll_number || '-'}</TableCell>
                    <TableCell>
                      {editingStudentId === grade.student_id ? (
                        <Input 
                          type="number"
                          value={editMarks}
                          onChange={(e) => setEditMarks(Number(e.target.value))}
                          min={0}
                          max={test.max_marks}
                          className="w-24"
                        />
                      ) : (
                        <span className={grade.marks === 0 ? "text-gray-400" : ""}>
                          {grade.marks} / {test.max_marks}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {grade.answer_sheet_url ? (
                        <a 
                          href={grade.answer_sheet_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="flex items-center text-blue-600 hover:text-blue-800"
                        >
                          <FileText className="h-4 w-4 mr-1" />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400">No sheet</span>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        {editingStudentId === grade.student_id ? (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleSaveMarks(grade)}
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingStudentId(null)}
                            >
                              <X className="h-4 w-4" />
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setEditingStudentId(grade.student_id);
                                setEditMarks(grade.marks);
                              }}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            
                            {/* Only show View Details button for grades with evaluations */}
                            {(grade as any).evaluation && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/dashboard/tests/detail/${test.id}?student=${grade.student_id}`)}
                              >
                                <FileText className="h-4 w-4" />
                              </Button>
                            )}
                          </>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No students found in this class</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
