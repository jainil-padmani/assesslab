
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface GeneratedQuestion {
  id: string;
  topic: string;
  questions: {
    id: string;
    text: string;
    type: string;
    options?: {
      id: string;
      text: string;
    }[];
    correctOption?: string;
    answer?: string;
    explanation?: string;
    marks?: number;
    difficulty?: string;
  }[];
}

export function useGeneratedQuestions(subjectId: string) {
  return useQuery({
    queryKey: ["generatedQuestions", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from("generated_questions")
        .select("*")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error("Failed to load generated questions");
        throw error;
      }
      
      return data as GeneratedQuestion[];
    },
    enabled: !!subjectId
  });
}

export function useGeneratedQuestionsByTopic(subjectId: string, topic: string) {
  return useQuery({
    queryKey: ["generatedQuestions", subjectId, topic],
    queryFn: async () => {
      if (!subjectId || !topic) return null;
      
      const { data, error } = await supabase
        .from("generated_questions")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("topic", topic)
        .single();
      
      if (error) {
        if (error.code !== 'PGRST116') { // PGRST116 is the "not found" error code
          toast.error("Failed to load questions for this topic");
          throw error;
        }
        return null;
      }
      
      return data as GeneratedQuestion;
    },
    enabled: !!subjectId && !!topic
  });
}

export function useUniqueTopics(subjectId: string) {
  return useQuery({
    queryKey: ["uniqueTopics", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from("generated_questions")
        .select("topic")
        .eq("subject_id", subjectId)
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error("Failed to load topics");
        throw error;
      }
      
      // Extract unique topics
      const topics = [...new Set(data.map(item => item.topic))];
      return topics;
    },
    enabled: !!subjectId
  });
}
