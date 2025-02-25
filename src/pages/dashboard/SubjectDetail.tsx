
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, FileDown } from "lucide-react";
import { toast } from "sonner";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  // Fetch subject details
  const { data: subject } = useQuery({
    queryKey: ["subject", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Subject;
    },
  });

  // Fetch all students with their grades for this subject
  const { data: studentGrades } = useQuery({
    queryKey: ["subject-grades", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_subjects")
        .select(`
          id,
          grade,
          students (
            id,
            name,
            roll_number,
            class,
            year,
            department
          )
        `)
        .eq("subject_id", id)
        .order("students.name");
      if (error) throw error;
      return data;
    },
  });

  const handleGradeChange = async (studentSubjectId: string, grade: string) => {
    try {
      const { error } = await supabase
        .from("student_subjects")
        .update({ grade })
        .eq("id", studentSubjectId);
      
      if (error) throw error;
      toast.success("Grade updated successfully");
    } catch (error: any) {
      toast.error("Failed to update grade: " + error.message);
    }
  };

  const handleExportExcel = () => {
    if (!studentGrades || !subject) return;

    // Prepare data for export
    const csvData = [
      ["Student Name", "Roll Number", "Class", "Year", "Department", "Grade"],
      ...studentGrades.map((sg: any) => [
        sg.students.name,
        sg.students.roll_number,
        sg.students.class,
        sg.students.year,
        sg.students.department,
        sg.grade || "",
      ]),
    ];

    // Convert to CSV
    const csv = csvData.map(row => row.join(",")).join("\n");
    
    // Create and download file
    const blob = new Blob([csv], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.setAttribute("hidden", "");
    a.setAttribute("href", url);
    a.setAttribute("download", `${subject.name}_grades.csv`);
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  if (!subject) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/dashboard/subjects")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Subjects
      </Button>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold">{subject.name}</h1>
            <p className="text-muted-foreground">
              Subject Code: {subject.subject_code} | Semester: {subject.semester}
            </p>
          </div>
          <Button onClick={handleExportExcel}>
            <FileDown className="w-4 h-4 mr-2" />
            Export Grades
          </Button>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student Name</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Year</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Grade</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentGrades?.map((sg: any) => (
                <TableRow key={sg.id}>
                  <TableCell>{sg.students.name}</TableCell>
                  <TableCell>{sg.students.roll_number}</TableCell>
                  <TableCell>{sg.students.class}</TableCell>
                  <TableCell>{sg.students.year}</TableCell>
                  <TableCell>{sg.students.department}</TableCell>
                  <TableCell>
                    <Input
                      value={sg.grade || ""}
                      onChange={(e) => handleGradeChange(sg.id, e.target.value)}
                      className="w-24"
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
