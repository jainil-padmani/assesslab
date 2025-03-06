import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Subject, Student } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
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
import { UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";

interface SubjectStudentsProps {
  subject: Subject;
  fetchSubjectData: () => void;
}

export function SubjectStudents({ subject, fetchSubjectData }: SubjectStudentsProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Fetch enrolled students
  const { data: enrolledStudents, isLoading: isEnrolledLoading } = useQuery({
    queryKey: ["subject-students", subject.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_enrollments")
        .select(`
          student_id,
          students (*)
        `)
        .eq("subject_id", subject.id);
      
      if (error) throw error;
      return data.map(item => item.students) as Student[];
    },
  });

  // Fetch available students (not enrolled in this subject)
  const { data: availableStudents, isLoading: isAvailableLoading } = useQuery({
    queryKey: ["available-subject-students", subject.id],
    queryFn: async () => {
      // Get current user's profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Get IDs of students already enrolled
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from("subject_enrollments")
        .select("student_id")
        .eq("subject_id", subject.id);
      
      if (enrollmentsError) throw enrollmentsError;
      
      const enrolledIds = enrollments.map(e => e.student_id);
      
      // Get students not enrolled in this subject
      let query = supabase.from("students").select("*").order("name");
      
      // Filter by user_id
      query = query.eq("user_id", user.id);
      
      if (enrolledIds.length > 0) {
        query = query.not("id", "in", `(${enrolledIds.join(",")})`);
      }
      
      const { data, error } = await query;
      if (error) throw error;
      
      return data as Student[];
    },
  });

  // Enroll student in subject mutation
  const enrollStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase
        .from("subject_enrollments")
        .insert([
          { student_id: studentId, subject_id: subject.id }
        ])
        .select();
      if (error) throw error;
      return data[0];
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-students", subject.id] });
      queryClient.invalidateQueries({ queryKey: ["available-subject-students", subject.id] });
      setIsAddStudentDialogOpen(false);
      setSelectedStudentId("");
      toast.success("Student enrolled in subject successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to enroll student: " + error.message);
    },
  });

  // Unenroll student from subject mutation
  const unenrollStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { error } = await supabase
        .from("subject_enrollments")
        .delete()
        .eq("student_id", studentId)
        .eq("subject_id", subject.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subject-students", subject.id] });
      queryClient.invalidateQueries({ queryKey: ["available-subject-students", subject.id] });
      toast.success("Student removed from subject successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to remove student: " + error.message);
    },
  });

  const handleEnrollStudent = () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }
    enrollStudentMutation.mutate(selectedStudentId);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Enrolled Students</h2>
        <Dialog
          open={isAddStudentDialogOpen}
          onOpenChange={setIsAddStudentDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Enroll Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Enroll Student in {subject.name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <Select
                value={selectedStudentId}
                onValueChange={setSelectedStudentId}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a student" />
                </SelectTrigger>
                <SelectContent>
                  {isAvailableLoading ? (
                    <SelectItem value="loading" disabled>
                      Loading students...
                    </SelectItem>
                  ) : availableStudents?.length === 0 ? (
                    <SelectItem value="none" disabled>
                      No available students
                    </SelectItem>
                  ) : (
                    availableStudents?.map((student) => (
                      <SelectItem key={student.id} value={student.id}>
                        {student.name} ({student.gr_number})
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddStudentDialogOpen(false);
                    setSelectedStudentId("");
                  }}
                >
                  Cancel
                </Button>
                <Button
                  type="button"
                  onClick={handleEnrollStudent}
                  disabled={!selectedStudentId || isAvailableLoading}
                >
                  Enroll Student
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>GR Number</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isEnrolledLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-4">
                  Loading students...
                </TableCell>
              </TableRow>
            ) : !enrolledStudents?.length ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No students enrolled in this subject. Enroll a student to get started!
                </TableCell>
              </TableRow>
            ) : (
              enrolledStudents?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell
                    className="font-medium cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/dashboard/students/${student.id}`)}
                  >
                    {student.name}
                  </TableCell>
                  <TableCell>{student.gr_number}</TableCell>
                  <TableCell>{student.roll_number}</TableCell>
                  <TableCell>{student.class}</TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to remove this student from the subject?")) {
                          unenrollStudentMutation.mutate(student.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
