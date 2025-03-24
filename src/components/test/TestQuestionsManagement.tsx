
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, FileQuestion, Save } from "lucide-react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Test, TestQuestion } from "@/types/tests";
import { QuestionCard } from "./QuestionCard";
import { QuestionForm } from "./QuestionForm";
import { GeneratedQuestionsSelector } from "./GeneratedQuestionsSelector";
import { QuestionEmptyState } from "./QuestionEmptyState";

type QuestionType = {
  id?: string;
  question: string;
  options?: string[];
  answer: string;
  marks: number;
  topic?: string;
  type: 'Multiple Choice' | 'Theory';
};

type SaveStatus = 'unsaved' | 'saved' | 'published';

interface TestQuestionsManagementProps {
  test: Test & { subjects?: any };
}

type GeneratedQuestionItem = {
  id: string;
  topic: string;
  question: string;
  options?: Array<{text: string, isCorrect: boolean}> | string[] | null;
  answer: string;
  type?: string;
};

export function TestQuestionsManagement({ test }: TestQuestionsManagementProps) {
  const [questions, setQuestions] = useState<QuestionType[]>([]);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [newQuestion, setNewQuestion] = useState<QuestionType>({
    question: '',
    answer: '',
    options: ['', '', '', ''],
    marks: 1,
    type: 'Multiple Choice'
  });
  const [isAddingQuestion, setIsAddingQuestion] = useState(false);
  const [isSelectingGenerated, setIsSelectingGenerated] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [questionType, setQuestionType] = useState<'Multiple Choice' | 'Theory'>('Multiple Choice');
  
  // Fetch existing questions for this test
  const { data: existingQuestions, isLoading: isLoadingQuestions, refetch: refetchQuestions } = useQuery({
    queryKey: ['test-questions', test.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('test_questions')
        .select('*')
        .eq('test_id', test.id)
        .order('created_at', { ascending: true });
      
      if (error) {
        toast.error('Failed to load test questions');
        console.error(error);
        throw error;
      }
      
      return data || [];
    }
  });
  
  // Fetch topics for generated questions
  const { data: generatedQuestionTopics, isLoading: isLoadingTopics } = useQuery({
    queryKey: ['generated-question-topics', test.subject_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('generated_questions')
        .select('id, topic')
        .eq('subject_id', test.subject_id)
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Failed to load question topics:', error);
        return [];
      }
      
      const uniqueTopics = [...new Set(data.map(item => item.topic))];
      return uniqueTopics.map(topic => ({
        value: topic,
        label: topic
      }));
    }
  });
  
  // Fetch generated questions for the selected topic
  const { data: generatedQuestions, isLoading: isLoadingGeneratedQuestions } = useQuery({
    queryKey: ['generated-questions', test.subject_id, selectedTopic],
    queryFn: async () => {
      if (!selectedTopic) return [];
      
      const { data, error } = await supabase
        .from('generated_questions')
        .select('id, questions, topic, question_mode')
        .eq('subject_id', test.subject_id)
        .eq('topic', selectedTopic);
      
      if (error) {
        console.error('Failed to load generated questions:', error);
        return [];
      }
      
      try {
        const allQuestions: GeneratedQuestionItem[] = [];
        
        data.forEach(entry => {
          const questionSet = entry.questions;
          const questionMode = entry.question_mode || 'theory';
          
          if (Array.isArray(questionSet)) {
            questionSet.forEach((q: any, index: number) => {
              if (q.text || q.question) {
                const questionType = q.type || (questionMode === 'multiple-choice' ? 'Multiple Choice' : 'Theory');
                
                allQuestions.push({
                  id: `${entry.id}-${index}`,
                  topic: entry.topic,
                  question: q.text || q.question,
                  options: q.options || null,
                  answer: q.answer || '',
                  type: questionType
                });
              }
            });
          }
        });
        
        return allQuestions;
      } catch (error) {
        console.error('Error processing question data:', error);
        return [];
      }
    },
    enabled: !!selectedTopic
  });
  
  // Map existing questions to our format
  useEffect(() => {
    if (existingQuestions) {
      const mappedQuestions: QuestionType[] = existingQuestions.map(q => {
        const type = q.options && Array.isArray(q.options) && q.options.length > 0 
          ? 'Multiple Choice' 
          : 'Theory';
        
        return {
          id: q.id,
          question: q.question_text,
          answer: q.correct_answer,
          options: Array.isArray(q.options) ? q.options.map(opt => typeof opt === 'string' ? opt : '') : undefined,
          marks: q.marks || 1,
          topic: q.topic,
          type: type
        };
      });
      
      setQuestions(mappedQuestions);
    }
  }, [existingQuestions]);
  
  // Handle adding a new question
  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      toast.error('Question text is required');
      return;
    }
    
    if (!newQuestion.answer.trim()) {
      toast.error('Answer is required');
      return;
    }
    
    if (newQuestion.type === 'Multiple Choice') {
      if (!newQuestion.options || newQuestion.options.filter(o => o.trim()).length !== 4) {
        toast.error('Multiple choice questions must have exactly 4 options');
        return;
      }
      
      if (!newQuestion.options.some(o => o === newQuestion.answer)) {
        toast.error('The correct answer must match one of the options');
        return;
      }
    }
    
    setQuestions([...questions, {...newQuestion, type: questionType}]);
    setNewQuestion({
      question: '',
      answer: '',
      options: ['', '', '', ''],
      marks: 1,
      type: questionType
    });
    setIsAddingQuestion(false);
    setSaveStatus('unsaved');
    toast.success('Question added successfully');
  };
  
  // Handle adding a generated question
  const handleAddGeneratedQuestion = (question: GeneratedQuestionItem) => {
    const questionType = question.type as 'Multiple Choice' | 'Theory' || 
                        (question.options && question.options.length > 0 ? 'Multiple Choice' : 'Theory');
    
    let optionsArray: string[] | undefined = undefined;
    
    if (question.options && Array.isArray(question.options)) {
      if (question.options.length > 0) {
        if (typeof question.options[0] === 'object' && 'text' in question.options[0]) {
          // Handle options in format {text: string, isCorrect: boolean}
          optionsArray = question.options.map(opt => {
            if (typeof opt === 'object' && opt !== null && 'text' in opt) {
              return (opt as {text: string, isCorrect: boolean}).text;
            }
            return '';
          });
        } else if (typeof question.options[0] === 'string') {
          // Handle options in string[] format
          optionsArray = question.options as string[];
        }
      }
    }
    
    const newQ: QuestionType = {
      question: question.question,
      answer: question.answer,
      options: optionsArray,
      marks: 1,
      topic: question.topic,
      type: questionType
    };
    
    setQuestions([...questions, newQ]);
    setSaveStatus('unsaved');
    toast.success('Generated question added successfully');
  };
  
  // Handle deleting a question
  const handleDeleteQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
    setSaveStatus('unsaved');
  };
  
  // Handle saving questions
  const handleSaveQuestions = async (publish: boolean = false) => {
    try {
      // Delete existing questions
      const { error: deleteError } = await supabase
        .from('test_questions')
        .delete()
        .eq('test_id', test.id);
      
      if (deleteError) throw deleteError;
      
      // Add new questions if any exist
      if (questions.length > 0) {
        const questionsToInsert = questions.map(q => ({
          test_id: test.id,
          question_text: q.question,
          correct_answer: q.answer,
          options: q.type === 'Multiple Choice' ? q.options : null,
          marks: q.marks,
          topic: q.topic || null,
          status: publish ? 'published' : 'draft'
        }));
        
        const { error: insertError } = await supabase
          .from('test_questions')
          .insert(questionsToInsert);
        
        if (insertError) throw insertError;
      }
      
      // Update test status if publishing
      if (publish) {
        const { error: updateError } = await supabase
          .from('tests')
          .update({ status: 'published' })
          .eq('id', test.id);
        
        if (updateError) throw updateError;
      }
      
      setSaveStatus(publish ? 'published' : 'saved');
      toast.success(publish ? 'Questions published successfully' : 'Questions saved successfully');
      refetchQuestions();
    } catch (error: any) {
      console.error('Error saving questions:', error);
      toast.error(`Failed to save questions: ${error.message}`);
    }
  };
  
  // Handle topic change for generated questions
  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic);
  };
  
  // Handle question type change
  const handleQuestionTypeChange = (type: 'Multiple Choice' | 'Theory') => {
    setQuestionType(type);
    setNewQuestion({
      ...newQuestion,
      type: type,
      options: type === 'Multiple Choice' ? ['', '', '', ''] : undefined
    });
  };
  
  if (isLoadingQuestions) {
    return <div className="flex items-center justify-center py-8">Loading questions...</div>;
  }
  
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <div>
            <CardTitle className="text-xl">Test Questions</CardTitle>
            <CardDescription>
              Manage questions for this test
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Dialog open={isAddingQuestion} onOpenChange={setIsAddingQuestion}>
              <DialogTrigger asChild>
                <Button size="sm">
                  <PlusCircle className="h-4 w-4 mr-1" />
                  Add Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Question</DialogTitle>
                </DialogHeader>
                
                <QuestionForm
                  questionType={questionType}
                  newQuestion={newQuestion}
                  onQuestionTypeChange={handleQuestionTypeChange}
                  onQuestionChange={setNewQuestion}
                />
                
                <DialogFooter className="mt-4">
                  <Button variant="outline" onClick={() => setIsAddingQuestion(false)}>Cancel</Button>
                  <Button onClick={handleAddQuestion}>Add Question</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
            
            <Dialog open={isSelectingGenerated} onOpenChange={setIsSelectingGenerated}>
              <DialogTrigger asChild>
                <Button size="sm" variant="outline">
                  <FileQuestion className="h-4 w-4 mr-1" />
                  Use Generated Questions
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-3xl">
                <DialogHeader>
                  <DialogTitle>Select Generated Questions</DialogTitle>
                </DialogHeader>
                
                <GeneratedQuestionsSelector
                  selectedTopic={selectedTopic}
                  topicOptions={generatedQuestionTopics || []}
                  generatedQuestions={generatedQuestions || []}
                  isLoadingTopics={isLoadingTopics}
                  isLoadingQuestions={isLoadingGeneratedQuestions}
                  onTopicChange={handleTopicChange}
                  onAddQuestion={handleAddGeneratedQuestion}
                />
                
                <DialogFooter>
                  <Button variant="outline" onClick={() => setIsSelectingGenerated(false)}>Done</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        </CardHeader>
        
        <CardContent>
          {questions.length > 0 ? (
            <div className="space-y-6">
              {questions.map((q, index) => (
                <QuestionCard
                  key={index}
                  question={q}
                  index={index}
                  onDelete={() => handleDeleteQuestion(index)}
                />
              ))}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  disabled={saveStatus === 'saved'}
                  onClick={() => handleSaveQuestions(false)}
                >
                  <Save className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button
                  onClick={() => handleSaveQuestions(true)}
                >
                  Save & Publish
                </Button>
              </div>
            </div>
          ) : (
            <QuestionEmptyState onAddClick={() => setIsAddingQuestion(true)} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
