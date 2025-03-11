
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Test } from "@/types/tests";

export function useTests(selectedClass: string, selectedSubject: string) {
  const [tests, setTests] = useState<Test[]>([]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchTests();
    } else {
      setTests([]);
    }
  }, [selectedClass, selectedSubject]);

  const fetchTests = async () => {
    try {
      if (!selectedClass || !selectedSubject) return;

      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .order('test_date', { ascending: false });
      
      if (error) throw error;
      if (data) setTests(data);
    } catch (error: any) {
      toast.error('Failed to fetch tests');
      console.error('Error fetching tests:', error);
    }
  };

  // Add a function to force refresh test data
  const refreshTests = () => {
    fetchTests();
  };

  return { tests, refreshTests };
}
