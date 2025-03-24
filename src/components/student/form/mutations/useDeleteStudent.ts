
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const useDeleteStudent = () => {
  const [isLoading, setIsLoading] = useState(false);
  const queryClient = useQueryClient();

  const deleteStudentMutation = useMutation({
    mutationFn: async (studentId: string) => {
      setIsLoading(true);
      try {
        console.log("Starting student deletion process for ID:", studentId);
        
        // Check all possible related tables and delete data in the correct order
        // to avoid foreign key constraint errors
        
        // Step 1: Delete paper evaluations
        console.log("Deleting paper evaluations...");
        const { error: evalDeleteError } = await supabase
          .from("paper_evaluations")
          .delete()
          .eq("student_id", studentId);
          
        if (evalDeleteError) {
          console.error("Error deleting paper evaluations:", evalDeleteError);
          console.log("Continuing deletion process despite evaluation error");
          // We'll continue even if there's an error here
        }
        
        // Step 2: Delete test grades
        console.log("Deleting test grades...");
        const { error: gradesError } = await supabase
          .from("test_grades")
          .delete()
          .eq("student_id", studentId);
          
        if (gradesError) {
          console.error("Error deleting test grades:", gradesError);
          console.log("Continuing deletion process despite grades error");
          // Continue even if there's an error deleting grades
        }
        
        // Step 3: Delete assessments
        console.log("Deleting assessments...");
        const { error: assessmentsError } = await supabase
          .from('assessments_master')
          .delete()
          .eq('student_id', studentId);
          
        if (assessmentsError) {
          console.error("Error deleting assessments:", assessmentsError);
          console.log("Continuing deletion process despite assessments error");
          // Continue even if there's an error deleting assessments
        }
        
        // Step 4: Delete subject enrollments
        console.log("Deleting subject enrollments...");
        const { error: enrollmentsError } = await supabase
          .from("subject_enrollments")
          .delete()
          .eq("student_id", studentId);
          
        if (enrollmentsError) {
          console.error("Error deleting enrollments:", enrollmentsError);
          console.log("Continuing deletion process despite enrollments error");
          // Continue even if there's an error deleting enrollments
        }
        
        // Step 5: Delete student subjects
        console.log("Deleting student subjects...");
        const { error: subjectsError } = await supabase
          .from("student_subjects")
          .delete()
          .eq("student_id", studentId);
          
        if (subjectsError) {
          console.error("Error deleting student subjects:", subjectsError);
          console.log("Continuing deletion process despite subjects error");
          // Continue despite errors
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
    deleteStudentMutation,
  };
};
