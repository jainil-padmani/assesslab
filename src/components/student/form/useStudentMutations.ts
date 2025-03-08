import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";

type StudentUpdateData = Omit<Partial<Student>, 'created_at'> & { id: string };

export const useStudentMutations = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const checkGRNumberExists = async (grNumber: string, studentId?: string): Promise<boolean> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const query = supabase
      .from("students")
      .select("id")
      .eq("gr_number", grNumber)
      .eq("user_id", user.id);
      
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

  const createStudentMutation = useMutation({
    mutationFn: async (studentData: Omit<Student, "id" | "created_at">) => {
      setIsLoading(true);
      try {
        const grNumberExists = await checkGRNumberExists(studentData.gr_number);
        if (grNumberExists) {
          throw new Error("A student with this GR number already exists in your account. Please use a different GR number.");
        }
        
        const { data, error } = await supabase
          .from("students")
          .insert({ 
            ...studentData, 
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

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      setIsLoading(true);
      try {
        console.log("Starting student deletion process for ID:", studentId);
        
        const { data: evaluationsData, error: evalCheckError } = await supabase
          .from("paper_evaluations")
          .select("id")
          .eq("student_id", studentId);
          
        if (evalCheckError) {
          console.error("Error checking for evaluations:", evalCheckError);
          throw evalCheckError;
        }
        
        console.log(`Found ${evaluationsData?.length || 0} related paper evaluations`);
        
        if (evaluationsData && evaluationsData.length > 0) {
          const { error: evaluationsError } = await supabase
            .from("paper_evaluations")
            .delete()
            .eq("student_id", studentId);
            
          if (evaluationsError) {
            console.error("Error deleting related evaluations:", evaluationsError);
            throw evaluationsError;
          }
          console.log("Successfully deleted related paper evaluations");
        }
        
        const { error: enrollmentsError } = await supabase
          .from("subject_enrollments")
          .delete()
          .eq("student_id", studentId);
          
        if (enrollmentsError) {
          console.error("Error deleting related enrollments:", enrollmentsError);
          throw enrollmentsError;
        }
        
        const { error: subjectsError } = await supabase
          .from("student_subjects")
          .delete()
          .eq("student_id", studentId);
          
        if (subjectsError) {
          console.error("Error deleting related student subjects:", subjectsError);
          throw subjectsError;
        }
        
        const { error: gradesError } = await supabase
          .from("test_grades")
          .delete()
          .eq("student_id", studentId);
          
        if (gradesError) {
          console.error("Error deleting related test grades:", gradesError);
          throw gradesError;
        }
        
        console.log("All related records deleted, proceeding to delete student");
        
        const { error } = await supabase
          .from("students")
          .delete()
          .eq("id", studentId);

        if (error) {
          console.error("Final error deleting student:", error);
          throw error;
        }
        
        console.log("Student successfully deleted");
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
