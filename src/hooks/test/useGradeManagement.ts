
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { TestGrade } from "@/types/tests";

/**
 * Hook for managing test grades
 */
export function useGradeManagement() {
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [editMarks, setEditMarks] = useState<number>(0);

  const handleSaveMarks = async (grade: TestGrade, refetch: () => void) => {
    try {
      // Check if this is a temp id (new grade)
      const isNewGrade = grade.id.startsWith('temp-');
      
      if (isNewGrade) {
        // Create a new grade
        const { data, error } = await supabase
          .from("test_grades")
          .insert({
            test_id: grade.test_id,
            student_id: grade.student_id,
            marks: editMarks,
            remarks: grade.remarks
          })
          .select();
        
        if (error) throw error;
        
        toast.success("Grade saved successfully");
      } else {
        // Update existing grade
        const { error } = await supabase
          .from("test_grades")
          .update({ marks: editMarks })
          .eq("id", grade.id);
        
        if (error) throw error;
        
        toast.success("Grade updated successfully");
      }
      
      setEditingStudentId(null);
      refetch();
    } catch (error: any) {
      toast.error(`Failed to save grade: ${error.message}`);
    }
  };

  return {
    editingStudentId,
    setEditingStudentId,
    editMarks,
    setEditMarks,
    handleSaveMarks
  };
}
