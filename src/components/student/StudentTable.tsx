
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface StudentWithClass extends Student {
  classes: { name: string } | null;
}

interface StudentTableProps {
  students: StudentWithClass[];
  onEdit: (student: Student) => void;
}

export default function StudentTable({ students, onEdit }: StudentTableProps) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

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

  const handleDelete = (id: string) => {
    if (confirm("Are you sure you want to delete this student?")) {
      deleteStudentMutation.mutate(id);
    }
  };

  return (
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
          {students.map((student) => (
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
                    onClick={() => onEdit(student)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(student.id)}
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
  );
}
