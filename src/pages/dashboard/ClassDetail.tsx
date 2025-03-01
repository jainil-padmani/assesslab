
import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { Plus, UserPlus, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Student } from "@/types/dashboard";

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
  const { data: classData, isLoading: isClassLoading } = useQuery({
    queryKey: ["classes", id],
    queryFn: async () => {
      if (!id) return null;
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
  const { data: students, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["class-students", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", id)
        .order("name");
      if (error) throw error;
      return data as Student[];
    },
  });

  // Fetch available students (not in this class)
  const { data: availableStudents, isLoading: isAvailableStudentsLoading } = useQuery({
    queryKey: ["available-students", id],
    queryFn: async () => {
      if (!id) return [];
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .is("class_id", null)
        .order("name");
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
        .select()
        .single();
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
        .select()
        .single();
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

  if (isClassLoading || isStudentsLoading) {
    return <div>Loading...</div>;
  }

  if (!classData) {
    return <div>Class not found</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold">{classData.name}</h1>
          <p className="text-gray-600">
            {classData.department} • Year {classData.year}
          </p>
        </div>
        <Dialog
          open={isAddStudentDialogOpen}
          onOpenChange={setIsAddStudentDialogOpen}
        >
          <DialogTrigger asChild>
            <Button>
              <UserPlus className="w-4 h-4 mr-2" />
              Add Student to Class
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
                  {isAvailableStudentsLoading ? (
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
                  onClick={handleAddStudentToClass}
                  disabled={!selectedStudentId || isAvailableStudentsLoading}
                >
                  Add to Class
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
              <TableHead>Department</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!students?.length && (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                  No students in this class yet. Add a student to get started!
                </TableCell>
              </TableRow>
            )}
            {students?.map((student) => (
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
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => navigate(`/dashboard/students/${student.id}`)}
                    >
                      <UserPlus className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to remove this student from the class?")) {
                          removeStudentFromClassMutation.mutate(student.id);
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
  );
}
