
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQuestionFetching() {
  const queryClient = useQueryClient();
  
  // Function to fetch questions for a subject
  const fetchSubjectQuestions = async (subjectId: string) => {
    // The subject_questions table doesn't exist in the database schema
    // Let's use a valid table instead
    const { data, error } = await supabase
      .from("generated_questions")
      .select("*")
      .eq("subject_id", subjectId);
    
    if (error) throw error;
    return data;
  };
  
  // Function to add a question
  const addQuestion = async (questionData: any) => {
    // Use generated_questions table instead of subject_questions
    const { data, error } = await supabase
      .from("generated_questions")
      .insert(questionData)
      .select();
    
    if (error) throw error;
    return data[0];
  };
  
  // Add question mutation
  const useAddQuestionMutation = (subjectId: string) => {
    return useMutation({
      mutationFn: addQuestion,
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: ["subject-questions", subjectId] });
      }
    });
  };
  
  // Query for fetching questions
  const useSubjectQuestionsQuery = (subjectId: string) => {
    return useQuery({
      queryKey: ["subject-questions", subjectId],
      queryFn: () => fetchSubjectQuestions(subjectId),
      enabled: !!subjectId
    });
  };
  
  return {
    useSubjectQuestionsQuery,
    useAddQuestionMutation
  };
}

export default useQuestionFetching;
