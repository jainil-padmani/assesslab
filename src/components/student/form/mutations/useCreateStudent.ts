
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";
import { checkGRNumberExists } from "../utils/grNumberUtils";

export const useCreateStudent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const createStudentMutation = useMutation({
    mutationFn: async (studentData: Omit<Student, "id" | "created_at">) => {
      setIsLoading(true);
      try {
        const grNumberExists = await checkGRNumberExists(studentData.gr_number);
        if (grNumberExists) {
          throw new Error("A student with this GR number already exists in your account. Please use a different GR number.");
        }
        
        // Set default login ID type to email if not specified
        const loginIdType = studentData.login_id_type || 'email';
        
        // Set default password to roll number if no password provided
        let password = studentData.password;
        if (!password && studentData.roll_number) {
          password = studentData.roll_number;
        }
        
        // Store the student record with the plain text password
        // Always set login_enabled to true
        const { data, error } = await supabase
          .from("students")
          .insert({ 
            ...studentData, 
            login_enabled: true, // Always enable login
            login_id_type: loginIdType,
            password: password, // This stores the password as plain text
            user_id: (await supabase.auth.getUser()).data.user.id
          })
          .select();

        if (error) {
          console.error("Error details:", error);
          throw error;
        }
        
        if (!data || data.length === 0) {
          throw new Error("Failed to create student: No data returned");
        }
        
        return data[0] as Student;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error creating student: ${error.message}`);
    },
  });

  return {
    isLoading,
    createStudentMutation,
  };
};
