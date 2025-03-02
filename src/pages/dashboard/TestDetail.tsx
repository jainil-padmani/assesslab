
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { 
  Card, CardContent, CardHeader, CardTitle, CardDescription 
} from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { Input } from "@/components/ui/input";
import { ArrowLeft, Save, Edit, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Test, TestGrade } from "@/types/tests";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";

export default function TestDetail() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState<number>(0);

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
      if (!testId) return [];
      
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

      // Map grades to students or create empty grades
      const studentGrades = (classStudents as Student[]).map(student => {
        const existingGrade = (existingGrades as TestGrade[]).find(
          grade => grade.student_id === student.id
        );
        
        if (existingGrade) {
          return {
            ...existingGrade,
            student
          };
        } else {
          return {
            id: `temp-${student.id}`,
            test_id: testId!,
            student_id: student.id,
            marks: 0,
            remarks: null,
            created_at: new Date().toISOString(),
            student
          } as TestGrade;
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

  const isLoading = isTestLoading || isGradesLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!test) {
    return <div className="text-center py-12">Test not found</div>;
  }

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
                    <TableCell className="text-right">
                      {editingStudentId === grade.student_id ? (
                        <div className="flex justify-end gap-2">
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
                        </div>
                      ) : (
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
                      )}
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
