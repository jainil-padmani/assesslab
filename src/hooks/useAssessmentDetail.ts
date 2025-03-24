
import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Assessment, AssessmentQuestion } from "@/types/assessments";

// Helper function to convert database record to Assessment type
const mapToAssessment = (data: any): Assessment => {
  return {
    id: data.id,
    title: data.title || "",
    instructions: data.instructions || "",
    options: data.options || {
      shuffleAnswers: false,
      timeLimit: { enabled: false, minutes: 60 },
      allowMultipleAttempts: false,
      showResponses: true,
      showResponsesOnlyOnce: false,
      showCorrectAnswers: true,
      showCorrectAnswersAt: null,
      hideCorrectAnswersAt: null,
      showOneQuestionAtTime: false
    },
    restrictions: data.restrictions || {
      requireAccessCode: false,
      accessCode: null,
      filterIpAddresses: false,
      allowedIpAddresses: null
    },
    assignTo: data.assign_to || null,
    dueDate: data.due_date || null,
    availableFrom: data.available_from || null,
    availableUntil: data.available_until || null,
    status: data.status || "draft",
    created_at: data.created_at || new Date().toISOString(),
    updated_at: data.updated_at || new Date().toISOString()
  };
};

// Helper function to convert database question to AssessmentQuestion type
const mapToAssessmentQuestion = (data: any): AssessmentQuestion => {
  return {
    id: data.id,
    assessmentId: data.assessment_id,
    questionText: data.question_text,
    questionType: data.question_type,
    options: data.options || [],
    correctAnswer: data.correct_answer || "",
    points: data.points || 1,
    questionOrder: data.question_order || 0,
    created_at: data.created_at
  };
};

// Helper function to convert Assessment type to database record
const mapToDatabaseAssessment = (assessment: Partial<Assessment>): any => {
  return {
    title: assessment.title,
    instructions: assessment.instructions,
    options: assessment.options,
    restrictions: assessment.restrictions,
    assign_to: assessment.assignTo,
    due_date: assessment.dueDate,
    available_from: assessment.availableFrom,
    available_until: assessment.availableUntil,
    status: assessment.status
  };
};

// Helper function to convert AssessmentQuestion type to database record
const mapToDatabaseQuestion = (question: Partial<AssessmentQuestion>): any => {
  return {
    assessment_id: question.assessmentId,
    question_text: question.questionText,
    question_type: question.questionType,
    options: question.options,
    correct_answer: question.correctAnswer,
    points: question.points,
    question_order: question.questionOrder
  };
};

export function useAssessmentDetail(assessmentId: string | undefined) {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const queryClient = useQueryClient();

  // Fetch assessment details
  const { data: assessment, isLoading: isAssessmentLoading } = useQuery<Assessment>({
    queryKey: ["assessment", assessmentId],
    queryFn: async () => {
      try {
        if (!assessmentId) return null;
        
        const { data, error } = await supabase
          .from("assessments_master")
          .select("*")
          .eq("id", assessmentId)
          .single();
        
        if (error) {
          throw new Error(`Failed to load assessment: ${error.message}`);
        }
        
        return mapToAssessment(data);
      } catch (error: any) {
        setError(error);
        throw error;
      }
    },
    enabled: !!assessmentId
  });

  // Fetch assessment questions
  const { data: questions, isLoading: isQuestionsLoading } = useQuery<AssessmentQuestion[]>({
    queryKey: ["assessment-questions", assessmentId],
    queryFn: async () => {
      try {
        if (!assessmentId) return [];
        
        const { data, error } = await supabase
          .from("assessment_questions")
          .select("*")
          .eq("assessment_id", assessmentId)
          .order("question_order", { ascending: true });
        
        if (error) {
          throw new Error(`Failed to load assessment questions: ${error.message}`);
        }
        
        return (data || []).map(mapToAssessmentQuestion);
      } catch (error: any) {
        setError(error);
        throw error;
      }
    },
    enabled: !!assessmentId
  });

  // Mutation to update assessment
  const updateAssessment = async (id: string, assessmentData: Partial<Assessment>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("assessments_master")
        .update(mapToDatabaseAssessment(assessmentData))
        .eq("id", id);
      
      if (error) {
        throw new Error(`Failed to update assessment: ${error.message}`);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["assessment", id] });
      
      return true;
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mutation to delete assessment
  const deleteAssessment = async (id: string) => {
    setIsLoading(true);
    try {
      // First delete all associated questions
      const { error: questionError } = await supabase
        .from("assessment_questions")
        .delete()
        .eq("assessment_id", id);
      
      if (questionError) {
        throw new Error(`Failed to delete assessment questions: ${questionError.message}`);
      }
      
      // Then delete the assessment
      const { error } = await supabase
        .from("assessments_master")
        .delete()
        .eq("id", id);
      
      if (error) {
        throw new Error(`Failed to delete assessment: ${error.message}`);
      }
      
      return true;
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mutation to create a question
  const createQuestion = async (questionData: Partial<AssessmentQuestion>) => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("assessment_questions")
        .insert(mapToDatabaseQuestion(questionData))
        .select();
      
      if (error) {
        throw new Error(`Failed to create question: ${error.message}`);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
      
      return mapToAssessmentQuestion(data[0]);
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mutation to update a question
  const updateQuestion = async (questionId: string, questionData: Partial<AssessmentQuestion>) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("assessment_questions")
        .update(mapToDatabaseQuestion(questionData))
        .eq("id", questionId);
      
      if (error) {
        throw new Error(`Failed to update question: ${error.message}`);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
      
      return true;
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Mutation to delete a question
  const deleteQuestion = async (questionId: string) => {
    setIsLoading(true);
    try {
      const { error } = await supabase
        .from("assessment_questions")
        .delete()
        .eq("id", questionId);
      
      if (error) {
        throw new Error(`Failed to delete question: ${error.message}`);
      }
      
      // Invalidate queries to refresh data
      queryClient.invalidateQueries({ queryKey: ["assessment-questions", assessmentId] });
      
      return true;
    } catch (error: any) {
      setError(error);
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  // Fetch assessment
  const fetchAssessment = async (id: string) => {
    try {
      const { data, error } = await supabase
        .from("assessments_master")
        .select("*")
        .eq("id", id)
        .single();
      
      if (error) {
        throw new Error(`Failed to load assessment: ${error.message}`);
      }
      
      return mapToAssessment(data);
    } catch (error: any) {
      setError(error);
      throw error;
    }
  };

  return {
    assessment,
    questions,
    isLoading: isLoading || isAssessmentLoading || isQuestionsLoading,
    error,
    fetchAssessment,
    updateAssessment,
    deleteAssessment,
    createQuestion,
    updateQuestion,
    deleteQuestion
  };
}
