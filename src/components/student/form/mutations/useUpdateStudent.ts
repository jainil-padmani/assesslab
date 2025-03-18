
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
        
        // Always ensure login is enabled
        let updateData = { 
          ...studentData,
          login_enabled: true
        };
        
        // If no password is provided and there's a roll number, set default password to roll number
        if (!updateData.password) {
          // Get the current student data to check if we need to set a default password
          const { data: existingStudent } = await supabase
            .from("students")
            .select("password, roll_number")
            .eq("id", studentData.id)
            .single();
            
          // If there's no existing password, set a default one
          if (existingStudent && 
              !existingStudent.password &&
              studentData.roll_number) {
            updateData.password = studentData.roll_number;
          } else if (existingStudent && 
                    !existingStudent.password &&
                    existingStudent.roll_number) {
            updateData.password = existingStudent.roll_number;
          }
        }
        
        // Set default login ID type to email if no type is set
        if (!updateData.login_id_type) {
          updateData.login_id_type = 'email';
        }
        
        // Remove empty password to avoid overwriting existing password with empty string
        if (updateData.password === '') {
          delete updateData.password;
        }
        
        const { data, error } = await supabase
          .from("students")
          .update(updateData)
          .eq("id", studentData.id)
          .select();

        if (error) throw error;
        
        if (!data || data.length === 0) {
          throw new Error("Failed to update student: No data returned");
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
