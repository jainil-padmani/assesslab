
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
        
        // Step 1: Delete paper evaluations first (this is the one causing the constraint error)
        console.log("Deleting paper evaluations...");
        const { error: evalDeleteError } = await supabase
          .from("paper_evaluations")
          .delete()
          .eq("student_id", studentId);
          
        if (evalDeleteError) {
          console.error("Error deleting paper evaluations:", evalDeleteError);
          throw new Error(`Failed to delete student evaluations: ${evalDeleteError.message}`);
        }
        
        // Step 2: Delete subject enrollments
        console.log("Deleting subject enrollments...");
        const { error: enrollmentsError } = await supabase
          .from("subject_enrollments")
          .delete()
          .eq("student_id", studentId);
          
        if (enrollmentsError) {
          console.error("Error deleting enrollments:", enrollmentsError);
          throw new Error(`Failed to delete student enrollments: ${enrollmentsError.message}`);
        }
        
        // Step 3: Delete student subjects
        console.log("Deleting student subjects...");
        const { error: subjectsError } = await supabase
          .from("student_subjects")
          .delete()
          .eq("student_id", studentId);
          
        if (subjectsError) {
          console.error("Error deleting student subjects:", subjectsError);
          throw new Error(`Failed to delete student subjects: ${subjectsError.message}`);
        }
        
        // Step 4: Delete test grades
        console.log("Deleting test grades...");
        const { error: gradesError } = await supabase
          .from("test_grades")
          .delete()
          .eq("student_id", studentId);
          
        if (gradesError) {
          console.error("Error deleting test grades:", gradesError);
          throw new Error(`Failed to delete student grades: ${gradesError.message}`);
        }
        
        // Step 5: Delete assessments
        console.log("Deleting assessments...");
        const { error: assessmentsError } = await supabase
          .from("assessments")
          .delete()
          .eq("student_id", studentId);
          
        if (assessmentsError) {
          console.error("Error deleting assessments:", assessmentsError);
          throw new Error(`Failed to delete student assessments: ${assessmentsError.message}`);
        }
        
        // Finally: Delete the student
        console.log("Deleting student...");
        const { error: studentError } = await supabase
          .from("students")
          .delete()
          .eq("id", studentId);

        if (studentError) {
          console.error("Error deleting student:", studentError);
          throw new Error(`Failed to delete student: ${studentError.message}`);
        }
        
        console.log("Student and all related data successfully deleted");
        return studentId;
      } catch (error) {
        console.error("Deletion process failed:", error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student and all related data deleted successfully");
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
