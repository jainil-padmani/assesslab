
import React from "react";
import {
  Card,
  CardHeader,
  CardTitle,
  CardDescription,
  CardContent
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Save, Edit, X, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import type { Test, TestGrade } from "@/types/tests";
import type { PaperEvaluation } from "@/hooks/useTestDetail";

interface StudentGradesTableProps {
  test: Test & { subjects: { name: string, subject_code: string } };
  grades: Array<TestGrade & { 
    answer_sheet_url: string | null;
    evaluation: PaperEvaluation | null;
  }>;
  editingStudentId: string | null;
  editMarks: number;
  setEditingStudentId: (id: string | null) => void;
  setEditMarks: (marks: number) => void;
  handleSaveMarks: (grade: TestGrade) => Promise<void>;
}

export function StudentGradesTable({
  test,
  grades,
  editingStudentId,
  editMarks,
  setEditingStudentId,
  setEditMarks,
  handleSaveMarks
}: StudentGradesTableProps) {
  const navigate = useNavigate();

  // Add a cache buster to the answer sheet URL
  const getAnswerSheetUrl = (url: string | null) => {
    if (!url) return null;
    
    // If URL already has a timestamp parameter, use it; otherwise add one
    if (url.includes('?t=')) {
      return url;
    } else {
      return `${url}?t=${Date.now()}`;
    }
  };

  return (
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
                        href={getAnswerSheetUrl(grade.answer_sheet_url)} 
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
                          
                          {grade.evaluation && (
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
  );
}
