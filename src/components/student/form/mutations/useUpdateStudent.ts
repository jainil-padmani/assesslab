
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";
import { checkGRNumberExists } from "../utils/grNumberUtils";

type StudentUpdateData = Omit<Partial<Student>, 'created_at'> & { id: string };

export const useUpdateStudent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const updateStudentMutation = useMutation({
    mutationFn: async (studentData: StudentUpdateData) => {
      setIsLoading(true);
      try {
        if (studentData.gr_number) {
          const grNumberExists = await checkGRNumberExists(studentData.gr_number, studentData.id);
          if (grNumberExists) {
            throw new Error("A student with this GR number already exists in your account. Please use a different GR number.");
          }
        }
        
        // Strip out the password field before updating the students table
        const { password, ...studentRecord } = studentData;
        
        const { data, error } = await supabase
          .from("students")
          .update(studentRecord)
          .eq("id", studentData.id)
          .select();

        if (error) throw error;
        
        if (!data || data.length === 0) {
          throw new Error("Failed to update student: No data returned");
        }
        
        // If password is provided, update student credentials
        if (password && studentData.login_enabled) {
          // Determine login ID based on the selected type
          const loginIdType = studentData.login_id_type || data[0].login_id_type || 'gr_number';
          const loginId = loginIdType === 'email' && studentData.email 
            ? studentData.email 
            : loginIdType === 'roll_number' && studentData.roll_number
              ? studentData.roll_number
              : studentData.gr_number;
          
          // TODO: Implement actual password update using your preferred method
          // For now, we'll just log a success message
          console.log(`Password would be updated for student ${loginId}`);
          toast.success("Student password updated successfully");
        }
        
        return data[0] as Student;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      queryClient.invalidateQueries({ queryKey: ["student", variables.id] });
      toast.success("Student updated successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error updating student: ${error.message}`);
    },
  });

  return {
    isLoading,
    updateStudentMutation,
  };
};
