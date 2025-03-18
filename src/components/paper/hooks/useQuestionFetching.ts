
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export function useQuestionFetching() {
  const queryClient = useQueryClient();
  
  // Function to fetch questions for a subject
  const fetchSubjectQuestions = async (subjectId: string) => {
    const { data, error } = await supabase
      .from("subject_questions")
      .select("*")
      .eq("subject_id", subjectId);
    
    if (error) throw error;
    return data;
  };
  
  // Function to add a question
  const addQuestion = async (questionData: any) => {
    const { data, error } = await supabase
      .from("subject_questions")
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
