
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Student } from "@/types/dashboard";

export function useClassStudents(selectedClass: string) {
  const [classStudents, setClassStudents] = useState<Student[]>([]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
    } else {
      setClassStudents([]);
    }
  }, [selectedClass]);

  const fetchClassStudents = async () => {
    try {
      if (!selectedClass) return;

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .order('name');
      
      if (error) throw error;
      if (data) setClassStudents(data);
    } catch (error: any) {
      toast.error('Failed to fetch students');
      console.error('Error fetching students:', error);
    }
  };

  return { classStudents };
}
