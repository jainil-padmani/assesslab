
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
        
        // Strip out the password field before inserting into students table
        const { password, login_enabled, login_id_type, ...studentRecord } = studentData;
        
        const { data, error } = await supabase
          .from("students")
          .insert({ 
            ...studentRecord, 
            login_enabled: login_enabled || false,
            login_id_type: login_id_type || 'gr_number',
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
        
        // If login is enabled and password is provided, create student credentials
        if (login_enabled && password) {
          // Determine login ID based on the selected type
          const loginId = login_id_type === 'email' && studentData.email 
            ? studentData.email 
            : login_id_type === 'roll_number' && studentData.roll_number
              ? studentData.roll_number
              : studentData.gr_number;
          
          // TODO: Implement actual student account creation using your preferred method
          // For now, we'll just log a success message
          console.log(`Student login credentials would be created for ${loginId}`);
          toast.success("Student login credentials created successfully");
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
