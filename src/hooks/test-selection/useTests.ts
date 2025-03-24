
import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Test } from "@/types/tests";

export function useTests(selectedClass: string, selectedSubject: string) {
  const [tests, setTests] = useState<Test[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetchTests = useCallback(async () => {
    setIsLoading(true);
    try {
      if (!selectedClass || !selectedSubject) {
        setTests([]);
        return;
      }

      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .order('test_date', { ascending: false });
      
      if (error) throw error;
      if (data) {
        // Ensure data conforms to the Test interface
        const typedTests: Test[] = data.map(test => ({
          id: test.id,
          name: test.name,
          subject_id: test.subject_id,
          class_id: test.class_id,
          test_date: test.test_date,
          max_marks: test.max_marks,
          created_at: test.created_at,
          status: test.status || 'draft'
        }));
        setTests(typedTests);
      }
    } catch (error: any) {
      toast.error('Failed to fetch tests');
      console.error('Error fetching tests:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedClass, selectedSubject]);

  useEffect(() => {
    if (selectedClass && selectedSubject) {
      fetchTests();
    } else {
      setTests([]);
    }
  }, [selectedClass, selectedSubject, fetchTests]);

  // Add a refresh function to manually trigger a refresh
  const refreshTests = useCallback(() => {
    fetchTests();
  }, [fetchTests]);

  return { tests, isLoading, refreshTests };
}
