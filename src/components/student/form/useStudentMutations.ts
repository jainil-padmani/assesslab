
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";

// Define a simplified type for student updates to avoid infinite type recursion
type StudentUpdateData = {
  id: string;
  name?: string;
  gr_number?: string;
  roll_number?: string | null;
  year?: number | null;
  department?: string;
  class_id?: string | null;
  overall_percentage?: number | null;
  user_id?: string;
};

export function useStudentMutations(onClose: () => void) {
  const queryClient = useQueryClient();

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: Omit<Student, "id" | "created_at" | "email" | "parent_name" | "parent_contact" | "class"> & { class_id?: string | null }) => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to add a student");
      }

      const studentWithUserId = {
        ...newStudent,
        user_id: user.id
      };

      const { data, error } = await supabase
        .from("students")
        .insert([studentWithUserId])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onClose();
      toast.success("Student added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add student: " + error.message);
    },
  });

  // Update student mutation - using the simplified type
  const updateStudentMutation = useMutation({
    mutationFn: async (studentData: StudentUpdateData) => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to update a student");
      }

      const { data, error } = await supabase
        .from("students")
        .update(studentData)
        .eq("id", studentData.id)
        .eq("user_id", user.id) // Ensure we only update our own students
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onClose();
      toast.success("Student updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update student: " + error.message);
    },
  });

  return { addStudentMutation, updateStudentMutation };
}
