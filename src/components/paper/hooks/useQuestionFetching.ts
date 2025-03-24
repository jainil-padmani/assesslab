
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';

interface UseQuestionFetchingProps {
  subjectId: string | null;
  topic: string;
  questionMode: 'theory' | 'practical';
}

export function useQuestionFetching({ subjectId, topic, questionMode }: UseQuestionFetchingProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [fileReading, setFileReading] = useState(false);

  // Fetch existing questions for this subject
  const { data: existingQuestions, isLoading: loadingExisting, refetch } = useQuery({
    queryKey: ['generatedQuestions', subjectId, topic, questionMode],
    queryFn: async () => {
      if (!subjectId) return [];
      
      // Define the filters
      let query = supabase
        .from('generated_questions')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('question_mode', questionMode);
      
      if (topic && topic !== 'all') {
        query = query.eq('topic', topic);
      }
      
      // Execute the query
      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) {
        throw new Error(error.message);
      }
      
      return data || [];
    },
    enabled: !!subjectId
  });

  useEffect(() => {
    if (existingQuestions && !isGenerating) {
      setQuestions(existingQuestions);
    }
  }, [existingQuestions, isGenerating]);

  // Function to handle file upload
  const handleFileUpload = (file: File) => {
    setSelectedFile(file);
    setFileReading(true);
    setError(null);
    
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        setFileContent(text);
        setFileReading(false);
      } catch (err) {
        setError('Failed to read file content');
        setFileReading(false);
      }
    };
    
    reader.onerror = () => {
      setError('Error reading file');
      setFileReading(false);
    };
    
    reader.readAsText(file);
  };

  // Function to generate questions
  const generateQuestions = async () => {
    if (!subjectId) {
      setError('Please select a subject first');
      return null;
    }
    
    if (!topic) {
      setError('Please enter a topic');
      return null;
    }
    
    setIsGenerating(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: {
          subject_id: subjectId,
          topic,
          question_mode: questionMode,
          content: fileContent,
        },
      });
      
      if (error) {
        throw new Error(error.message);
      }
      
      // Refetch the questions to get the latest data
      refetch();
      setIsGenerating(false);
      return data;
    } catch (err: any) {
      console.error('Error generating questions:', err);
      setError(err.message || 'Failed to generate questions');
      setIsGenerating(false);
      return null;
    }
  };

  return {
    questions,
    isGenerating,
    isLoading: loadingExisting || isGenerating,
    error,
    generateQuestions,
    handleFileUpload,
    fileContent,
    selectedFile,
    fileReading,
    refetchQuestions: refetch,
  };
}
