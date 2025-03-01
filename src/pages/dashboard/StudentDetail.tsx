
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student, Subject, StudentSubject } from "@/types/dashboard";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Plus } from "lucide-react";
import { toast } from "sonner";

export default function StudentDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [grade, setGrade] = useState<string>("");

  // Fetch student details
  const { data: student } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Student & { classes: { name: string } | null };
    },
  });

  // Fetch student subjects
  const { data: studentSubjects } = useQuery({
    queryKey: ["student-subjects", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_subjects")
        .select(`
          *,
          subjects (
            id,
            name,
            subject_code
          )
        `)
        .eq("student_id", id);
      if (error) throw error;
      return data;
    },
  });

  // Fetch enrolled subjects through subject_enrollments
  const { data: enrolledSubjects } = useQuery({
    queryKey: ["student-enrolled-subjects", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_enrollments")
        .select(`
          id,
          subject_id,
          subjects (
            id,
            name,
            subject_code
          )
        `)
        .eq("student_id", id);
      if (error) throw error;
      return data.map(item => ({
        ...item.subjects,
        enrollment_id: item.id
      }));
    },
  });

  // Fetch all subjects for selection
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Subject[];
    },
  });

  // Add student subject mutation
  const addSubjectMutation = useMutation({
    mutationFn: async (data: { student_id: string; subject_id: string; grade: string }) => {
      const { error } = await supabase.from("student_subjects").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-subjects", id] });
      setIsAddSubjectDialogOpen(false);
      setSelectedSubject("");
      setGrade("");
      toast.success("Subject added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add subject: " + error.message);
    },
  });

  // Update grade mutation
  const updateGradeMutation = useMutation({
    mutationFn: async ({ subjectId, grade }: { subjectId: string; grade: string }) => {
      const { error } = await supabase
        .from("student_subjects")
        .update({ grade })
        .eq("student_id", id)
        .eq("subject_id", subjectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-subjects", id] });
      toast.success("Grade updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update grade: " + error.message);
    },
  });

  const handleAddSubject = () => {
    if (!selectedSubject || !grade) {
      toast.error("Please select a subject and enter a grade");
      return;
    }

    addSubjectMutation.mutate({
      student_id: id!,
      subject_id: selectedSubject,
      grade,
    });
  };

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/dashboard/students")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Students
      </Button>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{student.name}</h1>
          <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Add Subject
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Subject</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Select
                    value={selectedSubject}
                    onValueChange={setSelectedSubject}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects?.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="grade">Grade</Label>
                  <Input
                    id="grade"
                    value={grade}
                    onChange={(e) => setGrade(e.target.value)}
                    placeholder="Enter grade"
                  />
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setIsAddSubjectDialogOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleAddSubject}>Add Subject</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">GR Number</p>
            <p className="font-medium">{student.gr_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Roll Number</p>
            <p className="font-medium">{student.roll_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Year</p>
            <p className="font-medium">{student.year}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Class</p>
            <p className="font-medium">{student.classes?.name || student.class || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{student.department}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overall Percentage</p>
            <p className="font-medium">{student.overall_percentage}%</p>
          </div>
        </div>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Subject</TableHead>
                <TableHead>Subject Code</TableHead>
                <TableHead>Grade</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {studentSubjects?.map((studentSubject: any) => (
                <TableRow key={studentSubject.id}>
                  <TableCell>{studentSubject.subjects.name}</TableCell>
                  <TableCell>{studentSubject.subjects.subject_code}</TableCell>
                  <TableCell>
                    <Input
                      value={studentSubject.grade || ""}
                      onChange={(e) =>
                        updateGradeMutation.mutate({
                          subjectId: studentSubject.subject_id,
                          grade: e.target.value,
                        })
                      }
                    />
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Are you sure you want to remove this subject?")) {
                          const { error } = await supabase
                            .from("student_subjects")
                            .delete()
                            .eq("id", studentSubject.id);
                          
                          if (error) {
                            toast.error("Failed to remove subject");
                          } else {
                            queryClient.invalidateQueries({
                              queryKey: ["student-subjects", id],
                            });
                            toast.success("Subject removed successfully");
                          }
                        }
                      }}
                    >
                      Remove
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              
              {enrolledSubjects?.map((subject: any) => (
                <TableRow key={`enrolled-${subject.id}`}>
                  <TableCell>{subject.name}</TableCell>
                  <TableCell>{subject.subject_code}</TableCell>
                  <TableCell>
                    <span className="text-muted-foreground">Enrolled</span>
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        if (confirm("Are you sure you want to unenroll this student from the subject?")) {
                          const { error } = await supabase
                            .from("subject_enrollments")
                            .delete()
                            .eq("student_id", id)
                            .eq("subject_id", subject.id);
                          
                          if (error) {
                            toast.error("Failed to unenroll student");
                          } else {
                            queryClient.invalidateQueries({
                              queryKey: ["student-enrolled-subjects", id],
                            });
                            toast.success("Student unenrolled successfully");
                          }
                        }
                      }}
                    >
                      Unenroll
                    </Button>
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
