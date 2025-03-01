
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
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
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
}

export default function Students() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Fetch students with class info
  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name)")
        .order("name");
      if (error) throw error;
      return data as (Student & { classes: { name: string } | null })[];
    },
  });

  // Fetch classes for the dropdown
  const { data: classes, isLoading: isClassesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, department, year")
        .order("name");
      if (error) throw error;
      return data as Class[];
    },
  });

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: Omit<Student, "id" | "created_at"> & { class_id?: string | null }) => {
      const { data, error } = await supabase
        .from("students")
        .insert([newStudent])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsAddDialogOpen(false);
      toast.success("Student added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add student: " + error.message);
    },
  });

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async (student: Partial<Student> & { id: string, class_id?: string | null }) => {
      const { data, error } = await supabase
        .from("students")
        .update(student)
        .eq("id", student.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditingStudent(null);
      toast.success("Student updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update student: " + error.message);
    },
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete student: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const studentData = {
      name: formData.get("name") as string,
      gr_number: formData.get("gr_number") as string,
      roll_number: formData.get("roll_number") as string,
      year: parseInt(formData.get("year") as string) || null,
      class: formData.get("class") as string,
      department: formData.get("department") as string,
      overall_percentage: parseFloat(formData.get("overall_percentage") as string) || null,
      class_id: formData.get("class_id") as string || null,
    };

    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, ...studentData });
    } else {
      addStudentMutation.mutate(studentData as any);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingStudent ? "Edit Student" : "Add New Student"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={editingStudent?.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="gr_number">GR Number</Label>
                  <Input
                    id="gr_number"
                    name="gr_number"
                    required
                    defaultValue={editingStudent?.gr_number}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="roll_number">Roll Number</Label>
                  <Input
                    id="roll_number"
                    name="roll_number"
                    defaultValue={editingStudent?.roll_number || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    defaultValue={editingStudent?.year || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class Section</Label>
                  <Input
                    id="class"
                    name="class"
                    defaultValue={editingStudent?.class || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class_id">Class</Label>
                  <Select
                    name="class_id"
                    defaultValue={editingStudent?.class_id || ""}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No class assigned</SelectItem>
                      {classes?.map((cls) => (
                        <SelectItem key={cls.id} value={cls.id}>
                          {cls.name} {cls.year ? `- Year ${cls.year}` : ""}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    required
                    defaultValue={editingStudent?.department}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="overall_percentage">Overall Percentage</Label>
                  <Input
                    id="overall_percentage"
                    name="overall_percentage"
                    type="number"
                    step="0.01"
                    defaultValue={editingStudent?.overall_percentage || ""}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingStudent(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingStudent ? "Update" : "Add"} Student
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
              <TableHead>Name</TableHead>
              <TableHead>GR Number</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Overall %</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
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
                <TableCell>{student.year}</TableCell>
                <TableCell>
                  {student.classes?.name || student.class || "-"}
                </TableCell>
                <TableCell>{student.department}</TableCell>
                <TableCell>{student.overall_percentage}%</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingStudent(student);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this student?")) {
                          deleteStudentMutation.mutate(student.id);
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
