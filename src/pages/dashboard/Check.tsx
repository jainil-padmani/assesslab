
import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useClasses } from "@/hooks/useClasses";
import { useSubjects } from "@/hooks/useSubjects";
import { useTests } from "@/hooks/test-selection/useTests";
import { useStudents } from "@/hooks/useStudents";
import { StudentEvaluationRow } from "@/components/check/StudentEvaluationRow";
import { useEvaluations } from "@/hooks/useEvaluations";
import { Student } from "@/types/dashboard";
import { useTestFiles } from "@/hooks/test-selection/useTestFiles";
import { EvaluationResultsCard } from "@/components/check/EvaluationResultsCard";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { EvaluationStatus, PaperEvaluation } from "@/types/assessments";

export default function Check() {
  const [selectedClass, setSelectedClass] = useState<string>("");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTest, setSelectedTest] = useState<string>("");
  const [studentsByClass, setStudentsByClass] = useState<Student[]>([]);
  const [isBatchEvaluating, setIsBatchEvaluating] = useState(false);

  const { classes, isLoading: isClassesLoading } = useClasses();
  const { subjects, isLoading: isSubjectsLoading } = useSubjects(selectedClass);
  const { tests, isLoading: isTestsLoading } = useTests(selectedClass, selectedSubject);
  const { students, isLoading: isStudentsLoading } = useStudents(selectedClass);
  const { testFiles } = useTestFiles(selectedTest);

  const {
    evaluationData,
    currentEvaluation,
    currentStudentId,
    isLoading,
    isEvaluating,
    error,
    setCurrentStudentId,
    updateEvaluation,
    isUpdateLoading,
    handleEvaluate
  } = useEvaluations(selectedTest, selectedSubject);

  const testFilesAvailable = testFiles && testFiles.length > 0;

  useEffect(() => {
    if (students) {
      setStudentsByClass(students);
    }
  }, [students]);

  const handleClassChange = (classId: string) => {
    setSelectedClass(classId);
    setSelectedSubject("");
    setSelectedTest("");
    setStudentsByClass([]);
  };

  const handleSubjectChange = (subjectId: string) => {
    setSelectedSubject(subjectId);
    setSelectedTest("");
    setStudentsByClass([]);
  };

  const handleTestChange = (testId: string) => {
    setSelectedTest(testId);
    setStudentsByClass([]);
  };

  const handleUpdateScore = async (questionIndex: number, newScore: number) => {
    if (!currentEvaluation || !currentStudentId) {
      toast.error("No evaluation or student selected");
      return;
    }

    try {
      await updateEvaluation.mutateAsync({
        evaluation: {
          ...currentEvaluation.evaluation_data,
          answers: currentEvaluation.evaluation_data.answers.map((answer: any, index: number) =>
            index === questionIndex ? { ...answer, score: [newScore, answer.score[1]] } : answer
          ),
        },
        studentId: currentStudentId,
      });
    } catch (error) {
      console.error("Error updating score:", error);
      toast.error("Failed to update score");
    }
  };

  const handleBatchEvaluate = async () => {
    if (!selectedTest || !selectedSubject || studentsByClass.length === 0) {
      toast.error("Please select a class, subject, and test first");
      return;
    }
    
    setIsBatchEvaluating(true);
    try {
      let processedCount = 0;
      
      for (const student of studentsByClass) {
        await handleEvaluate(student.id);
        processedCount++;
        toast.success(`Processed ${processedCount}/${studentsByClass.length} students`);
      }
      
      toast.success(`Batch evaluation completed for ${processedCount} students`);
    } catch (error) {
      console.error("Error during batch evaluation:", error);
      toast.error("Failed to complete batch evaluation");
    } finally {
      setIsBatchEvaluating(false);
    }
  };

  return (
    <div className="container mx-auto space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check Answer Sheets</CardTitle>
          <CardDescription>Select class, subject, and test to view students and their answer sheets.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <Label htmlFor="class">Class</Label>
            <Select onValueChange={handleClassChange}>
              <SelectTrigger id="class">
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                {isClassesLoading ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : (
                  classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="subject">Subject</Label>
            <Select onValueChange={handleSubjectChange}>
              <SelectTrigger id="subject">
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {isSubjectsLoading ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : (
                  subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>{subject.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="test">Test</Label>
            <Select onValueChange={handleTestChange}>
              <SelectTrigger id="test">
                <SelectValue placeholder="Select a test" />
              </SelectTrigger>
              <SelectContent>
                {isTestsLoading ? (
                  <SelectItem value="" disabled>Loading...</SelectItem>
                ) : (
                  tests?.map((test) => (
                    <SelectItem key={test.id} value={test.id}>{test.name}</SelectItem>
                  ))
                )}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>View students in the selected class and their evaluation status.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableCaption>List of students in the selected class.</TableCaption>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">Name</TableHead>
                  <TableHead>GR Number</TableHead>
                  <TableHead>Answer Sheet</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading || isStudentsLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center">Loading...</TableCell>
                  </TableRow>
                ) : (
                  studentsByClass.map((student) => {
                    const studentEval = evaluationData?.find(item => item.student.id === student.id);
                    const status = studentEval?.evaluation?.status || EvaluationStatus.PENDING;
                    return (
                      <StudentEvaluationRow
                        key={student.id}
                        student={student}
                        status={status}
                        evaluationData={studentEval?.evaluation?.evaluation_data}
                        isEvaluating={isEvaluating && currentStudentId === student.id}
                        selectedSubject={selectedSubject}
                        selectedTest={selectedTest}
                        testFilesAvailable={testFilesAvailable}
                        onEvaluate={handleEvaluate}
                      />
                    );
                  })
                )}
              </TableBody>
            </Table>
            <Button
              variant="secondary"
              onClick={handleBatchEvaluate}
              disabled={isBatchEvaluating || isLoading || isStudentsLoading || !selectedTest}
              className="mt-4"
            >
              {isBatchEvaluating ? "Evaluating..." : "Evaluate All"}
            </Button>
          </CardContent>
        </Card>
        <EvaluationResultsCard
          currentEvaluation={currentEvaluation as PaperEvaluation}
          onUpdateScore={handleUpdateScore}
        />
      </div>
    </div>
  );
}
