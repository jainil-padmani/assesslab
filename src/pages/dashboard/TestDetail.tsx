
import React from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTestDetail } from "@/hooks/useTestDetail";
import { TestHeader } from "@/components/test/TestHeader";
import { TestPapersManagement } from "@/components/test/TestPapersManagement";
import { StudentEvaluationDetails } from "@/components/test/StudentEvaluationDetails";
import { StudentGradesTable } from "@/components/test/StudentGradesTable";

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

  // Find the selected student's grade
  const selectedStudentGrade = studentId 
    ? grades?.find(grade => grade.student_id === studentId)
    : null;

  return (
    <div className="container mx-auto">
      {/* Test Header */}
      <TestHeader test={test} />
      
      {/* Test Papers Management */}
      <TestPapersManagement test={test} />

      {/* Student Evaluation Details */}
      <StudentEvaluationDetails 
        selectedStudentGrade={selectedStudentGrade}
        test={test}
        handleUpdateAnswerScore={handleUpdateAnswerScore}
      />

      {/* Student Grades Table */}
      <StudentGradesTable 
        test={test}
        grades={grades || []}
        editingStudentId={editingStudentId}
        editMarks={editMarks}
        setEditingStudentId={setEditingStudentId}
        setEditMarks={setEditMarks}
        handleSaveMarks={handleSaveMarks}
      />
    </div>
  );
}
