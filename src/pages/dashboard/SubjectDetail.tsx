
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Subject, CourseOutcome } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ArrowLeft, FileDown, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function SubjectDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddCODialogOpen, setIsAddCODialogOpen] = useState(false);
  const [editingCO, setEditingCO] = useState<CourseOutcome | null>(null);

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

  // Fetch course outcomes
  const { data: courseOutcomes } = useQuery({
    queryKey: ["course-outcomes", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("course_outcomes")
        .select("*")
        .eq("subject_id", id)
        .order("code");
      if (error) throw error;
      return data as CourseOutcome[];
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

  // Add/Update Course Outcome mutation
  const coMutation = useMutation({
    mutationFn: async (co: Partial<CourseOutcome>) => {
      if (co.id) {
        const { data, error } = await supabase
          .from("course_outcomes")
          .update({ code: co.code, description: co.description })
          .eq("id", co.id)
          .select()
          .single();
        if (error) throw error;
        return data;
      } else {
        const { data, error } = await supabase
          .from("course_outcomes")
          .insert([{ ...co, subject_id: id }])
          .select()
          .single();
        if (error) throw error;
        return data;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-outcomes", id] });
      setIsAddCODialogOpen(false);
      setEditingCO(null);
      toast.success(
        editingCO ? "Course outcome updated" : "Course outcome added"
      );
    },
    onError: (error: Error) => {
      toast.error("Failed to save course outcome: " + error.message);
    },
  });

  // Delete Course Outcome mutation
  const deleteCOMutation = useMutation({
    mutationFn: async (coId: string) => {
      const { error } = await supabase
        .from("course_outcomes")
        .delete()
        .eq("id", coId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["course-outcomes", id] });
      toast.success("Course outcome deleted");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete course outcome: " + error.message);
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

  const handleCOSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const coData = {
      id: editingCO?.id,
      code: formData.get("code") as string,
      description: formData.get("description") as string,
    };
    coMutation.mutate(coData);
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

        {/* Course Outcomes Section */}
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="text-xl font-semibold">Course Outcomes</h2>
            <Dialog open={isAddCODialogOpen} onOpenChange={setIsAddCODialogOpen}>
              <DialogTrigger asChild>
                <Button onClick={() => setEditingCO(null)}>
                  <Plus className="w-4 h-4 mr-2" />
                  Add Course Outcome
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>
                    {editingCO ? "Edit Course Outcome" : "Add Course Outcome"}
                  </DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCOSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <label htmlFor="code">CO Code</label>
                    <Input
                      id="code"
                      name="code"
                      defaultValue={editingCO?.code}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <label htmlFor="description">Description</label>
                    <Textarea
                      id="description"
                      name="description"
                      defaultValue={editingCO?.description}
                      required
                    />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => {
                        setIsAddCODialogOpen(false);
                        setEditingCO(null);
                      }}
                    >
                      Cancel
                    </Button>
                    <Button type="submit">
                      {editingCO ? "Update" : "Add"} Course Outcome
                    </Button>
                  </div>
                </form>
              </DialogContent>
            </Dialog>
          </div>

          <div className="border rounded-lg">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>CO Code</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courseOutcomes?.map((co) => (
                  <TableRow key={co.id}>
                    <TableCell className="font-medium">{co.code}</TableCell>
                    <TableCell>{co.description}</TableCell>
                    <TableCell>
                      <div className="flex space-x-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            setEditingCO(co);
                            setIsAddCODialogOpen(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            if (
                              confirm(
                                "Are you sure you want to delete this course outcome?"
                              )
                            ) {
                              deleteCOMutation.mutate(co.id);
                            }
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Students and Grades Section */}
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
