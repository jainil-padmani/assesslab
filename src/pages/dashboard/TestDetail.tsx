
import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTestDetail } from "@/hooks/useTestDetail";
import { TestHeader } from "@/components/test/TestHeader";
import { TestPapersManagement } from "@/components/test/TestPapersManagement";
import StudentEvaluationDetails from "@/components/test/StudentEvaluationDetails";
import { StudentGradesTable } from "@/components/test/StudentGradesTable";
import { EvaluationStatus, PaperEvaluation } from "@/types/assessments";
import type { TestGrade } from "@/types/tests";

export default function TestDetail() {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  
  // Get student ID from URL if present
  const studentId = searchParams.get('student');

  // Use our custom hook to handle test data and operations
  const {
    test,
    grades,
    isLoading,
    editingStudentId,
    setEditingStudentId,
    editMarks,
    setEditMarks,
    handleSaveMarks,
    handleUpdateAnswerScore
  } = useTestDetail(testId);

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!test) {
    return <div className="text-center py-12">Test not found</div>;
  }

  // Find the selected student's grade - with proper type safety
  const selectedStudentGrade = studentId && grades 
    ? grades.find(grade => grade.student_id === studentId)
    : null;

  // Ensure grades are properly typed for the StudentGradesTable
  const typedGrades = grades?.map(grade => {
    return {
      ...grade,
      answer_sheet_url: grade.answer_sheet_url || '',
      evaluation: grade.evaluation as PaperEvaluation
    };
  }) || [];

  return (
    <div className="container mx-auto">
      {/* Test Header */}
      <TestHeader test={test} />
      
      {/* Test Papers Management */}
      <TestPapersManagement test={test} />

      {/* Student Evaluation Details */}
      {selectedStudentGrade && (
        <StudentEvaluationDetails 
          studentId={selectedStudentGrade.student_id}
          testId={test.id}
          subjectId={test.subject_id}
        />
      )}

      {/* Student Grades Table */}
      <StudentGradesTable 
        test={test}
        grades={typedGrades}
        editingStudentId={editingStudentId}
        editMarks={editMarks}
        setEditingStudentId={setEditingStudentId}
        setEditMarks={setEditMarks}
        handleSaveMarks={handleSaveMarks}
      />
    </div>
  );
}
