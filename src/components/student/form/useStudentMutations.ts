
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";

// Define a simplified type that won't cause infinite recursion
type StudentUpdateData = {
  id: string;
  name?: string;
  gr_number?: string;
  roll_number?: string | null;
  year?: number | null;
  class?: string | null;
  class_id?: string | null;
  department?: string;
  overall_percentage?: number | null;
  email?: string | null;
  parent_name?: string | null;
  parent_contact?: string | null;
  team_id?: string | null;
}

export const useStudentMutations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (studentData: Omit<Student, "id" | "created_at">) => {
      setIsLoading(true);
      try {
        // Get current user's team_id if they have one
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('team_id')
          .eq('id', user.id)
          .single();
          
        if (profileError) {
          console.error("Error fetching profile:", profileError);
        }
        
        const team_id = profile?.team_id || null;
        
        const { data, error } = await supabase
          .from("students")
          .insert({ ...studentData, user_id: user.id, team_id })
          .select()
          .single();

        if (error) throw error;
        return data;
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

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async (studentData: StudentUpdateData) => {
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from("students")
          .update(studentData)
          .eq("id", studentData.id)
          .select()
          .single();

        if (error) throw error;
        return data;
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

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      setIsLoading(true);
      try {
        const { error } = await supabase
          .from("students")
          .delete()
          .eq("id", studentId);

        if (error) throw error;
        return studentId;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Error deleting student: ${error.message}`);
    },
  });

  return {
    isLoading,
    createStudentMutation,
    updateStudentMutation,
    deleteStudentMutation,
  };
};

export default useStudentMutations;
