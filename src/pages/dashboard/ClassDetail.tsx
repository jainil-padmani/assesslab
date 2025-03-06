import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
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
import { ArrowLeft, Plus, UserPlus } from "lucide-react";
import { toast } from "sonner";

interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
  created_at: string;
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");

  // Fetch class details
  const { data: classData } = useQuery({
    queryKey: ["class", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Class;
    },
  });

  // Fetch students in this class
  const { data: classStudents, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["class-students", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", id)
        .order("name");
      if (error) throw error;
      return data as Student[];
    },
  });

  // Fetch available students (not in any class or in a different class)
  const { data: availableStudents, isLoading: isAvailableLoading } = useQuery({
    queryKey: ["available-students", id],
    queryFn: async () => {
      // Get current user's profile to check team_id
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data: profile } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .maybeSingle();
      
      // Query for students without a class
      let query = supabase.from("students").select("*").is("class_id", null);
      
      // Filter by team if user is in a team, otherwise by user_id
      if (profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      } else {
        query = query.eq("user_id", user.id);
      }
      
      const { data, error } = await query.order("name");
      if (error) throw error;
      
      return data as Student[];
    },
  });

  // Add student to class mutation
  const addStudentToClassMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase
        .from("students")
        .update({ class_id: id })
        .eq("id", studentId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-students", id] });
      queryClient.invalidateQueries({ queryKey: ["available-students", id] });
      setIsAddStudentDialogOpen(false);
      setSelectedStudentId("");
      toast.success("Student added to class successfully");
    },
    onError: (error) => {
      toast.error("Failed to add student to class: " + error.message);
    },
  });

  // Remove student from class mutation
  const removeStudentFromClassMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase
        .from("students")
        .update({ class_id: null })
        .eq("id", studentId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-students", id] });
      queryClient.invalidateQueries({ queryKey: ["available-students", id] });
      toast.success("Student removed from class successfully");
    },
    onError: (error) => {
      toast.error("Failed to remove student from class: " + error.message);
    },
  });

  const handleAddStudentToClass = () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }
    addStudentToClassMutation.mutate(selectedStudentId);
  };

  if (!classData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/dashboard/classes")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Classes
      </Button>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{classData.name}</h1>
          <Dialog
            open={isAddStudentDialogOpen}
            onOpenChange={setIsAddStudentDialogOpen}
          >
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Student to {classData.name}</DialogTitle>
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
                    ) : !availableStudents?.length ? (
                      <SelectItem value="none" disabled>
                        No available students
                      </SelectItem>
                    ) : (
                      availableStudents.map((student) => (
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
                    onClick={handleAddStudentToClass}
                    disabled={!selectedStudentId || isAvailableLoading}
                  >
                    Add Student
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{classData.department || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Year</p>
            <p className="font-medium">{classData.year || "-"}</p>
          </div>
        </div>

        <h2 className="text-xl font-semibold">Students</h2>

        <div className="border rounded-lg">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>GR Number</TableHead>
                <TableHead>Roll Number</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isStudentsLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-4">
                    Loading students...
                  </TableCell>
                </TableRow>
              ) : !classStudents?.length ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                    No students in this class. Add a student to get started!
                  </TableCell>
                </TableRow>
              ) : (
                classStudents.map((student) => (
                  <TableRow key={student.id}>
                    <TableCell
                      className="font-medium cursor-pointer hover:text-primary"
                      onClick={() => navigate(`/dashboard/students/${student.id}`)}
                    >
                      {student.name}
                    </TableCell>
                    <TableCell>{student.gr_number}</TableCell>
                    <TableCell>{student.roll_number}</TableCell>
                    <TableCell>{student.department}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to remove this student from the class?")) {
                            removeStudentFromClassMutation.mutate(student.id);
                          }
                        }}
                      >
                        Remove
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
