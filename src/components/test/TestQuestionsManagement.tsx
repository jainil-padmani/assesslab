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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectGroup, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { PlusCircle, List, Trash2, Save, FlaskConical, FileQuestion, CheckCircle, XCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Test, TestQuestion } from "@/types/tests";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";

type QuestionType = {
  id?: string;
  question: string;
  options?: string[];
  answer: string;
  marks: number;
  topic?: string;
  type: 'Multiple Choice' | 'Theory';
};

type GeneratedQuestionItem = {
  id: string;
  topic: string;
  question: string;
  options?: string[] | null;
  answer: string;
  type?: string;
};

type SaveStatus = 'unsaved' | 'saved' | 'published';

interface TestQuestionsManagementProps {
  test: Test & { subjects?: any };
}

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
  
  // Fetch existing test questions
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
  
  // Fetch generated question topics
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
      
      // Get unique topics
      const uniqueTopics = [...new Set(data.map(item => item.topic))];
      return uniqueTopics.map(topic => ({
        value: topic,
        label: topic
      }));
    }
  });
  
  // Fetch generated questions for selected topic
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
        // Process the questions from all entries with this topic
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
  
  // Load existing questions when component mounts
  useEffect(() => {
    if (existingQuestions) {
      const mappedQuestions: QuestionType[] = existingQuestions.map(q => {
        // Determine if this is a multiple choice or theory question based on options
        const type = q.options && Array.isArray(q.options) && q.options.length > 0 
          ? 'Multiple Choice' 
          : 'Theory';
        
        return {
          id: q.id,
          question: q.question_text,
          answer: q.correct_answer,
          options: Array.isArray(q.options) ? q.options : undefined,
          marks: q.marks || 1,
          topic: q.topic,
          type: type
        };
      });
      
      setQuestions(mappedQuestions);
    }
  }, [existingQuestions]);
  
  const handleAddQuestion = () => {
    if (!newQuestion.question.trim()) {
      toast.error('Question text is required');
      return;
    }
    
    if (!newQuestion.answer.trim()) {
      toast.error('Answer is required');
      return;
    }
    
    // For multiple choice, validate that we have 4 options
    if (newQuestion.type === 'Multiple Choice') {
      if (!newQuestion.options || newQuestion.options.filter(o => o.trim()).length !== 4) {
        toast.error('Multiple choice questions must have exactly 4 options');
        return;
      }
      
      // Check if the answer matches one of the options
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
  
  const handleAddGeneratedQuestion = (question: GeneratedQuestionItem) => {
    const questionType = question.type as 'Multiple Choice' | 'Theory' || 
                        (question.options && question.options.length > 0 ? 'Multiple Choice' : 'Theory');
    
    const newQ: QuestionType = {
      question: question.question,
      answer: question.answer,
      options: Array.isArray(question.options) ? question.options : undefined,
      marks: 1,
      topic: question.topic,
      type: questionType
    };
    
    setQuestions([...questions, newQ]);
    setSaveStatus('unsaved');
    toast.success('Generated question added successfully');
  };
  
  const handleDeleteQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    setQuestions(newQuestions);
    setSaveStatus('unsaved');
  };
  
  const handleSaveQuestions = async (publish: boolean = false) => {
    try {
      // First, delete existing questions
      const { error: deleteError } = await supabase
        .from('test_questions')
        .delete()
        .eq('test_id', test.id);
      
      if (deleteError) throw deleteError;
      
      // Then insert new questions
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
  
  const handleTopicChange = (topic: string) => {
    setSelectedTopic(topic);
  };
  
  const handleQuestionTypeChange = (type: 'Multiple Choice' | 'Theory') => {
    setQuestionType(type);
    setNewQuestion({
      ...newQuestion,
      type: type,
      options: type === 'Multiple Choice' ? ['', '', '', ''] : undefined
    });
  };
  
  const renderQuestionForm = () => {
    return (
      <div className="space-y-4">
        <Tabs defaultValue={questionType} onValueChange={(value) => handleQuestionTypeChange(value as any)}>
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="Multiple Choice">Multiple Choice</TabsTrigger>
            <TabsTrigger value="Theory">Theory</TabsTrigger>
          </TabsList>
          
          <TabsContent value="Multiple Choice" className="space-y-4">
            <div>
              <Label htmlFor="mcq-question">Question Text</Label>
              <Textarea
                id="mcq-question"
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                placeholder="Enter question text"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label>Options (exactly 4 required)</Label>
              {newQuestion.options?.map((option, index) => (
                <div key={index} className="flex items-center gap-2 mt-2">
                  <RadioGroup value={newQuestion.answer === option ? "selected" : ""} onValueChange={() => setNewQuestion({...newQuestion, answer: option})}>
                    <RadioGroupItem value="selected" id={`option-${index}`} />
                  </RadioGroup>
                  <Input
                    value={option}
                    onChange={(e) => {
                      const newOptions = [...(newQuestion.options || [])];
                      newOptions[index] = e.target.value;
                      
                      // If this option was the answer, update the answer too
                      const updatedQuestion = {...newQuestion, options: newOptions};
                      if (newQuestion.answer === newQuestion.options?.[index]) {
                        updatedQuestion.answer = e.target.value;
                      }
                      
                      setNewQuestion(updatedQuestion);
                    }}
                    placeholder={`Option ${index + 1}`}
                    className="flex-1"
                  />
                </div>
              ))}
              <p className="text-xs text-muted-foreground mt-1">Select the radio button next to the correct answer</p>
            </div>
            
            <div>
              <Label htmlFor="mcq-marks">Marks</Label>
              <Input
                id="mcq-marks"
                type="number"
                value={newQuestion.marks}
                onChange={(e) => setNewQuestion({...newQuestion, marks: parseInt(e.target.value) || 1})}
                min={1}
                className="mt-1 w-20"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="Theory" className="space-y-4">
            <div>
              <Label htmlFor="theory-question">Question Text</Label>
              <Textarea
                id="theory-question"
                value={newQuestion.question}
                onChange={(e) => setNewQuestion({...newQuestion, question: e.target.value})}
                placeholder="Enter question text"
                className="mt-1"
                rows={3}
              />
            </div>
            
            <div>
              <Label htmlFor="theory-answer">Model Answer</Label>
              <Textarea
                id="theory-answer"
                value={newQuestion.answer}
                onChange={(e) => setNewQuestion({...newQuestion, answer: e.target.value})}
                placeholder="Enter the model answer"
                className="mt-1"
                rows={4}
              />
            </div>
            
            <div>
              <Label htmlFor="theory-marks">Marks</Label>
              <Input
                id="theory-marks"
                type="number"
                value={newQuestion.marks}
                onChange={(e) => setNewQuestion({...newQuestion, marks: parseInt(e.target.value) || 1})}
                min={1}
                className="mt-1 w-20"
              />
            </div>
          </TabsContent>
        </Tabs>
      </div>
    );
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
                {renderQuestionForm()}
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
                
                <div className="space-y-4 py-4">
                  <div>
                    <Label htmlFor="topic">Select Topic</Label>
                    <Select value={selectedTopic} onValueChange={handleTopicChange}>
                      <SelectTrigger id="topic" className="mt-1">
                        <SelectValue placeholder="Select a topic" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          {isLoadingTopics ? (
                            <SelectItem value="loading" disabled>Loading topics...</SelectItem>
                          ) : generatedQuestionTopics && generatedQuestionTopics.length > 0 ? (
                            generatedQuestionTopics.map((topic, i) => (
                              <SelectItem key={i} value={topic.value}>
                                {topic.label}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No topics found</SelectItem>
                          )}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  {selectedTopic ? (
                    <div className="border rounded-md p-4 min-h-96 max-h-96 overflow-y-auto">
                      {isLoadingGeneratedQuestions ? (
                        <div className="flex justify-center items-center h-full">
                          Loading questions...
                        </div>
                      ) : generatedQuestions && generatedQuestions.length > 0 ? (
                        <ul className="space-y-4">
                          {generatedQuestions.map((q, index) => (
                            <li key={index} className="border-b pb-4 last:border-b-0">
                              <div className="flex justify-between items-start gap-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-1">
                                    <Badge variant={q.type === 'Multiple Choice' || (q.options && q.options.length > 0) ? 'outline' : 'secondary'}>
                                      {q.type === 'Multiple Choice' || (q.options && q.options.length > 0) ? 'MCQ' : 'Theory'}
                                    </Badge>
                                  </div>
                                  <p className="font-medium">{q.question}</p>
                                  {q.options && q.options.length > 0 && (
                                    <ul className="mt-2 space-y-1">
                                      {q.options.map((option, i) => (
                                        <li key={i} className={`text-sm ${option === q.answer ? 'text-green-600 font-medium' : 'text-gray-600'}`}>
                                          {option === q.answer && <CheckCircle className="h-3 w-3 inline mr-1" />}
                                          {option}
                                        </li>
                                      ))}
                                    </ul>
                                  )}
                                  <p className="mt-2 text-sm font-medium">
                                    <span className="text-gray-500">Answer:</span> {q.answer}
                                  </p>
                                </div>
                                <Button
                                  size="sm"
                                  onClick={() => handleAddGeneratedQuestion(q)}
                                >
                                  <PlusCircle className="h-4 w-4 mr-1" />
                                  Add
                                </Button>
                              </div>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="flex justify-center items-center h-full text-gray-500">
                          No questions available for this topic
                        </div>
                      )}
                    </div>
                  ) : (
                    <Alert>
                      <AlertDescription>
                        Please select a topic to view questions
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
                
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
                <div key={index} className="border rounded-md p-4 relative">
                  <div className="absolute top-2 right-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteQuestion(index)}
                      className="h-8 w-8"
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                    </Button>
                  </div>
                  
                  <div className="flex items-center gap-2 mb-2">
                    <span className="font-semibold">Q{index + 1}.</span>
                    <Badge variant={q.type === 'Multiple Choice' ? 'outline' : 'secondary'}>
                      {q.type === 'Multiple Choice' ? 'MCQ' : 'Theory'}
                    </Badge>
                    <span className="text-sm bg-secondary px-2 py-0.5 rounded">
                      {q.marks} mark{q.marks !== 1 ? 's' : ''}
                    </span>
                    {q.topic && (
                      <span className="text-xs bg-blue-100 text-blue-800 px-2 py-0.5 rounded">
                        {q.topic}
                      </span>
                    )}
                  </div>
                  
                  <p className="font-medium mb-3">{q.question}</p>
                  
                  {q.type === 'Multiple Choice' && q.options && q.options.length > 0 && (
                    <div className="ml-4 mb-3">
                      <p className="text-sm text-gray-500 mb-1">Options:</p>
                      <ul className="space-y-1">
                        {q.options.map((option, i) => (
                          option ? (
                            <li key={i} className={`text-sm flex items-center ${option === q.answer ? 'text-green-600 font-medium' : ''}`}>
                              {option === q.answer ? (
                                <CheckCircle className="h-3 w-3 mr-2 text-green-600" />
                              ) : (
                                <XCircle className="h-3 w-3 mr-2 text-gray-400" />
                              )}
                              {option}
                            </li>
                          ) : null
                        ))}
                      </ul>
                    </div>
                  )}
                  
                  <div className="text-sm">
                    <span className="font-medium text-gray-700">Answer: </span>
                    <span>{q.answer}</span>
                  </div>
                </div>
              ))}
              
              <div className="flex justify-end gap-2 mt-4">
                <Button
                  variant="outline"
                  onClick={() => setIsAddingQuestion(false)}
                >
                  Cancel
                </Button>
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
            <div className="text-center py-12">
              <List className="h-12 w-12 mx-auto text-gray-400 mb-4" />
              <h3 className="text-lg font-medium mb-2">No Questions Added</h3>
              <p className="text-gray-500 max-w-md mx-auto mb-4">
                This test doesn't have any questions yet. Add questions manually or select from generated questions.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
