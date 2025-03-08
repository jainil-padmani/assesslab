
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";

// Define a simplified type for student updates
type StudentUpdateData = Omit<Partial<Student>, 'created_at'> & { id: string };

export const useStudentMutations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  // Helper function to check if GR number exists for the current user
  const checkGRNumberExists = async (grNumber: string, studentId?: string): Promise<boolean> => {
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    // If editing a student, exclude the current student ID from the check
    const query = supabase
      .from("students")
      .select("id")
      .eq("gr_number", grNumber)
      .eq("user_id", user.id);
      
    // If we're updating an existing student, exclude that student from the check
    if (studentId) {
      query.neq("id", studentId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error checking GR number:", error);
      return false;
    }
    
    return data.length > 0;
  };

  // Create student mutation
  const createStudentMutation = useMutation({
    mutationFn: async (studentData: Omit<Student, "id" | "created_at">) => {
      setIsLoading(true);
      try {
        // Check if GR number already exists for this user
        const grNumberExists = await checkGRNumberExists(studentData.gr_number);
        if (grNumberExists) {
          throw new Error("A student with this GR number already exists in your account. Please use a different GR number.");
        }
        
        // Get current user
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        // Create the student record
        const { data, error } = await supabase
          .from("students")
          .insert({ 
            ...studentData, 
            user_id: user.id
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

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async (studentData: StudentUpdateData) => {
      setIsLoading(true);
      try {
        // Check if updated GR number already exists (excluding this student)
        if (studentData.gr_number) {
          const grNumberExists = await checkGRNumberExists(studentData.gr_number, studentData.id);
          if (grNumberExists) {
            throw new Error("A student with this GR number already exists in your account. Please use a different GR number.");
          }
        }
        
        const { data, error } = await supabase
          .from("students")
          .update(studentData)
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

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      setIsLoading(true);
      try {
        // First, delete related paper_evaluations
        const { error: evaluationsError } = await supabase
          .from("paper_evaluations")
          .delete()
          .eq("student_id", studentId);
          
        if (evaluationsError) {
          console.error("Error deleting related evaluations:", evaluationsError);
          throw evaluationsError;
        }
        
        // Then, delete related subject_enrollments
        const { error: enrollmentsError } = await supabase
          .from("subject_enrollments")
          .delete()
          .eq("student_id", studentId);
          
        if (enrollmentsError) {
          console.error("Error deleting related enrollments:", enrollmentsError);
          throw enrollmentsError;
        }
        
        // Delete related student_subjects
        const { error: subjectsError } = await supabase
          .from("student_subjects")
          .delete()
          .eq("student_id", studentId);
          
        if (subjectsError) {
          console.error("Error deleting related student subjects:", subjectsError);
          throw subjectsError;
        }
        
        // Delete related test_grades
        const { error: gradesError } = await supabase
          .from("test_grades")
          .delete()
          .eq("student_id", studentId);
          
        if (gradesError) {
          console.error("Error deleting related test grades:", gradesError);
          throw gradesError;
        }
        
        // Finally, delete the student
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
