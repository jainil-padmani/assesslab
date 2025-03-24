
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Question } from "@/types/papers";
import { toast } from "sonner";

interface UseQuestionFetchingParams {
  subjectId: string;
  level: string;
  courseOutcome?: number;
  open: boolean;
}

export function useQuestionFetching({ subjectId, level, courseOutcome, open }: UseQuestionFetchingParams) {
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(false);

  // Fetch available topics for the subject
  useEffect(() => {
    if (open && subjectId) {
      fetchTopics();
    }
  }, [open, subjectId]);

  // Fetch questions when topic is selected
  useEffect(() => {
    if (selectedTopic) {
      fetchQuestions();
    }
  }, [selectedTopic]);

  const fetchTopics = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('generated_questions')
        .select('topic')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Extract unique topics
      const uniqueTopics = [...new Set((data || []).map(item => item.topic))];
      setTopics(uniqueTopics);
      
      // Select first topic if available
      if (uniqueTopics.length > 0) {
        setSelectedTopic(uniqueTopics[0]);
      }
    } catch (error) {
      console.error("Error fetching topics:", error);
      toast.error("Failed to load topics");
    } finally {
      setLoading(false);
    }
  };

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('generated_questions')
        .select('questions, question_mode')
        .eq('subject_id', subjectId)
        .eq('topic', selectedTopic)
        .order('created_at', { ascending: false })
        .limit(1);
      
      if (error) throw error;
      
      if (data && data.length > 0 && data[0].questions) {
        const questionsData = data[0].questions;
        let allQuestions: Question[] = [];
        
        // Validate if it's an array and has the structure we expect
        if (Array.isArray(questionsData)) {
          // Convert from Json[] to Question[] with proper type validation and type casting
          allQuestions = questionsData
            .filter(q => {
              // First check if q is an object and not null
              if (typeof q !== 'object' || q === null) return false;
              
              // Then check if it has all the required properties using type guards
              return (
                'id' in q && 
                ('text' in q || 'question' in q) && // Support both text and question field names
                'type' in q && 
                'marks' in q && 
                'level' in q
              );
            })
            .map(q => {
              // Safely access properties with type assertion
              const question = q as Record<string, any>;
              
              // Support both formats: with 'text' field or with 'question' field
              const questionText = 'text' in question ? question.text : question.question;
              
              return {
                id: String(question.id),
                text: questionText,
                type: String(question.type),
                marks: Number(question.marks),
                level: String(question.level),
                courseOutcome: 'courseOutcome' in question ? Number(question.courseOutcome) : undefined,
                answer: 'answer' in question ? String(question.answer) : 
                         'correct_answer' in question ? String(question.correct_answer) : undefined,
                options: 'options' in question ? 
                  (Array.isArray(question.options) ? 
                    // Handle different options formats
                    (typeof question.options[0] === 'string' ? 
                      // Format: ["Option 1", "Option 2", ...] with separate correct_answer field
                      question.options.map((opt: string) => ({
                        text: opt,
                        isCorrect: opt === question.correct_answer
                      })) : 
                      // Format: [{text: "Option 1", isCorrect: true}, ...]
                      question.options
                    ) : 
                    undefined)
              };
            });
        }
        
        // Filter by level and courseOutcome if provided
        let filteredByAttributes = allQuestions.filter(q => {
          let matchesLevel = q.level === level;
          let matchesCO = courseOutcome ? q.courseOutcome === courseOutcome : true;
          return matchesLevel && matchesCO;
        });
        
        setQuestions(filteredByAttributes);
      } else {
        setQuestions([]);
      }
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to load questions");
    } finally {
      setLoading(false);
    }
  };

  return {
    topics,
    selectedTopic,
    setSelectedTopic,
    questions,
    loading
  };
}
