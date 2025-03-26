
import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export function useUploadAssessment(
  studentId: string | undefined,
  subjectId: string | undefined,
  testId: string | undefined,
  refreshKey: number = 0
) {
  const [hasAnswerSheet, setHasAnswerSheet] = useState(false);
  const [answerSheetUrl, setAnswerSheetUrl] = useState<string | null>(null);
  const [answerSheetZipUrl, setAnswerSheetZipUrl] = useState<string | null>(null);

  // Use react-query to fetch the answer sheet data
  const { data, error, isLoading, refetch } = useQuery({
    queryKey: ['answer-sheet', studentId, subjectId, testId, refreshKey],
    queryFn: async () => {
      if (!studentId || !subjectId || !testId) return null;
      
      try {
        console.log('Fetching answer sheet for:', { studentId, subjectId, testId });
        
        // Query test_answers table
        const { data, error } = await supabase
          .from('test_answers')
          .select('answer_sheet_url, zip_url')
          .eq('student_id', studentId)
          .eq('subject_id', subjectId)
          .eq('test_id', testId)
          .single();

        if (error) {
          if (error.code === 'PGRST116') {  // No rows returned
            console.log('No answer sheet found for this student');
            return null;
          }
          throw error;
        }

        return data;
      } catch (error: any) {
        console.error('Error fetching answer sheet:', error);
        return null;
      }
    },
    enabled: !!studentId && !!subjectId && !!testId,
  });

  // Update state based on query result
  useEffect(() => {
    if (data) {
      setHasAnswerSheet(!!data.answer_sheet_url);
      setAnswerSheetUrl(data.answer_sheet_url);
      setAnswerSheetZipUrl(data.zip_url || null);
    } else {
      setHasAnswerSheet(false);
      setAnswerSheetUrl(null);
      setAnswerSheetZipUrl(null);
    }
  }, [data]);

  return {
    hasAnswerSheet,
    answerSheetUrl,
    answerSheetZipUrl,
    isLoading,
    error,
    refetch
  };
}
