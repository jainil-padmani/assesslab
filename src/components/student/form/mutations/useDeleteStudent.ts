
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
    deleteStudentMutation,
  };
};
