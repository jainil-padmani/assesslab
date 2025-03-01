
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";

export function useStudentMutations(onClose: () => void) {
  const queryClient = useQueryClient();

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: Omit<Student, "id" | "created_at" | "email" | "parent_name" | "parent_contact" | "class"> & { class_id?: string | null }) => {
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
      onClose();
      toast.success("Student added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add student: " + error.message);
    },
  });

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async (studentData: Partial<Omit<Student, "email" | "parent_name" | "parent_contact" | "class">> & { id: string, class_id?: string | null }) => {
      const { data, error } = await supabase
        .from("students")
        .update(studentData)
        .eq("id", studentData.id)
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
