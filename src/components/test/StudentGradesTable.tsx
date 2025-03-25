
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
import { Badge } from "@/components/ui/badge";
import { Save, Edit, X, FileText, Eye, Search, RefreshCw } from "lucide-react";
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

  // Calculate stats
  const averageMarks = grades.length > 0 
    ? Math.round(grades.reduce((acc, curr) => acc + curr.marks, 0) / grades.length)
    : 0;
  
  const maxMarksObtained = grades.length > 0
    ? Math.max(...grades.map(g => g.marks))
    : 0;
  
  const numPassed = grades.filter(g => g.marks >= (test.max_marks * 0.4)).length;

  const getGradeStyle = (marks: number) => {
    const percentage = (marks / test.max_marks) * 100;
    if (percentage >= 80) return "text-green-600 dark:text-green-400 font-medium";
    if (percentage >= 60) return "text-blue-600 dark:text-blue-400 font-medium";
    if (percentage >= 40) return "text-yellow-600 dark:text-yellow-400 font-medium";
    return "text-red-600 dark:text-red-400 font-medium";
  };

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-semibold">Student Grades</CardTitle>
            <CardDescription className="text-muted-foreground">
              Manage grades for students in {test.subjects.name} ({test.name})
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              className="border-slate-200 dark:border-slate-700 gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <RefreshCw className="h-4 w-4" />
              <span className="hidden md:inline">Refresh</span>
            </Button>
            <Button 
              variant="outline"
              size="sm"
              className="border-slate-200 dark:border-slate-700 gap-2 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <FileText className="h-4 w-4" />
              <span className="hidden md:inline">Export</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-6 border-b border-slate-200 dark:border-slate-800">
          <div className="bg-muted/30 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-medium text-muted-foreground">Average Marks</div>
            <div className="text-2xl font-bold">{averageMarks} / {test.max_marks}</div>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-medium text-muted-foreground">Highest Marks</div>
            <div className="text-2xl font-bold">{maxMarksObtained} / {test.max_marks}</div>
          </div>
          <div className="bg-muted/30 p-4 rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="text-sm font-medium text-muted-foreground">Pass Rate</div>
            <div className="text-2xl font-bold">
              {grades.length ? Math.round((numPassed / grades.length) * 100) : 0}%
            </div>
          </div>
        </div>
      
        <div className="p-6 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row gap-3 justify-between">
          <div className="relative w-full sm:max-w-xs">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search students..."
              className="pl-9 bg-background border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>
        
        <div className="overflow-auto">
          {grades && grades.length > 0 ? (
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow className="hover:bg-transparent">
                  <TableHead>Student</TableHead>
                  <TableHead>GR Number</TableHead>
                  <TableHead>Roll Number</TableHead>
                  <TableHead>Marks</TableHead>
                  <TableHead>Answer Sheet</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {grades.map(grade => (
                  <TableRow key={grade.id} className="hover:bg-muted/40 transition-colors">
                    <TableCell className="font-medium">
                      <div className="flex items-center space-x-2">
                        <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center text-primary">
                          {grade.student?.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-medium">{grade.student?.name}</p>
                          <p className="text-xs text-muted-foreground">{grade.student?.email || "No email"}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {grade.student?.gr_number ?
                        <Badge variant="outline" className="font-mono bg-muted/40">
                          {grade.student.gr_number}
                        </Badge> :
                        "-"
                      }
                    </TableCell>
                    <TableCell>
                      {grade.student?.roll_number ?
                        <Badge variant="outline" className="font-mono bg-muted/40">
                          {grade.student.roll_number}
                        </Badge> :
                        "-"
                      }
                    </TableCell>
                    <TableCell>
                      {editingStudentId === grade.student_id ? (
                        <div className="flex items-center space-x-2">
                          <Input 
                            type="number"
                            value={editMarks}
                            onChange={(e) => setEditMarks(Number(e.target.value))}
                            min={0}
                            max={test.max_marks}
                            className="w-20 h-8 text-center bg-background"
                          />
                          <span className="text-muted-foreground">/ {test.max_marks}</span>
                        </div>
                      ) : (
                        <span className={getGradeStyle(grade.marks)}>
                          {grade.marks} / {test.max_marks}
                        </span>
                      )}
                    </TableCell>
                    <TableCell>
                      {grade.answer_sheet_url ? (
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="border-slate-200 hover:bg-slate-100"
                          asChild
                        >
                          <a 
                            href={grade.answer_sheet_url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex items-center"
                          >
                            <FileText className="h-4 w-4 mr-2 text-blue-600" />
                            View Sheet
                          </a>
                        </Button>
                      ) : (
                        <span className="text-muted-foreground text-sm">No sheet</span>
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
                              className="border-green-200 hover:bg-green-50 text-green-600"
                            >
                              <Save className="h-4 w-4" />
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingStudentId(null)}
                              className="border-red-200 hover:bg-red-50 text-red-600"
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
                              className="border-slate-200 hover:bg-slate-100"
                            >
                              <Edit className="h-4 w-4 text-blue-600" />
                            </Button>
                            
                            {grade.evaluation && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => navigate(`/dashboard/tests/detail/${test.id}?student=${grade.student_id}`)}
                                title="View Evaluation Details"
                                className="border-slate-200 hover:bg-slate-100"
                              >
                                <Eye className="h-4 w-4 text-purple-600" />
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
            <div className="text-center py-12">
              <div className="inline-flex rounded-full bg-muted/30 p-4 mb-4">
                <FileText className="h-6 w-6 text-muted-foreground" />
              </div>
              <p className="text-lg font-medium mb-2">No students found</p>
              <p className="text-muted-foreground text-sm max-w-xs mx-auto mb-4">
                There are no students assigned to this test yet.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
