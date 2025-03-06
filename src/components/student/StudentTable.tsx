
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
import { useEffect, useState } from "react";

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
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

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
    <div className="border rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="font-semibold text-sm md:text-base">Name</TableHead>
              <TableHead className={`${isMobile ? 'px-2' : ''} text-sm md:text-base`}>GR#</TableHead>
              <TableHead className={`${isMobile ? 'px-2' : ''} text-sm md:text-base`}>Roll#</TableHead>
              {!isMobile && <TableHead>Year</TableHead>}
              {!isMobile && <TableHead>Class</TableHead>}
              {!isMobile && <TableHead>Department</TableHead>}
              {!isMobile && <TableHead>Overall %</TableHead>}
              <TableHead className="text-right md:text-left text-sm md:text-base">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students.map((student) => (
              <TableRow key={student.id}>
                <TableCell
                  className="font-medium cursor-pointer hover:text-primary text-sm md:text-base whitespace-nowrap"
                  onClick={() => navigate(`/dashboard/students/${student.id}`)}
                >
                  {student.name}
                </TableCell>
                <TableCell className={`${isMobile ? 'px-2' : ''} text-sm md:text-base whitespace-nowrap`}>{student.gr_number}</TableCell>
                <TableCell className={`${isMobile ? 'px-2' : ''} text-sm md:text-base whitespace-nowrap`}>{student.roll_number}</TableCell>
                {!isMobile && <TableCell>{student.year}</TableCell>}
                {!isMobile && <TableCell>{student.classes?.name || student.class || "-"}</TableCell>}
                {!isMobile && <TableCell>{student.department}</TableCell>}
                {!isMobile && <TableCell>{student.overall_percentage}%</TableCell>}
                <TableCell className="text-right md:text-left">
                  <div className="flex space-x-1 md:space-x-2 justify-end md:justify-start">
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
    </div>
  );
}
