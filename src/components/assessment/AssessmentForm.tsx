
import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Assessment, AssessmentOption, AssessmentQuestion, AssessmentRestriction } from '@/types/assessments';
import { Calendar as CalendarIcon, Clock, Save, Plus, Trash2, Database, ImportIcon, RefreshCw } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { createAssessment, updateAssessmentStatus, addQuestionsToAssessment } from '@/utils/assessment/assessmentService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery } from '@tanstack/react-query';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Json } from '@supabase/supabase-js';

const formSchema = z.object({
  title: z.string().min(3, 'Title must be at least 3 characters long'),
  instructions: z.string().optional(),
  options: z.object({
    shuffleAnswers: z.boolean().default(false),
    timeLimit: z.object({
      enabled: z.boolean().default(false),
      minutes: z.number().min(1).max(180).default(30),
    }),
    allowMultipleAttempts: z.boolean().default(false),
    showResponses: z.boolean().default(true),
    showResponsesOnlyOnce: z.boolean().default(false),
    showCorrectAnswers: z.boolean().default(false),
    showCorrectAnswersAt: z.string().nullable().default(null),
    hideCorrectAnswersAt: z.string().nullable().default(null),
    showOneQuestionAtTime: z.boolean().default(false),
  }),
  restrictions: z.object({
    requireAccessCode: z.boolean().default(false),
    accessCode: z.string().nullable().default(null),
    filterIpAddresses: z.boolean().default(false),
    allowedIpAddresses: z.array(z.string()).nullable().default(null),
  }),
  assignTo: z.array(z.string()).nullable().default(null),
  dueDate: z.string().nullable().default(null),
  availableFrom: z.string().nullable().default(null),
  availableUntil: z.string().nullable().default(null),
});

type FormValues = z.infer<typeof formSchema>;

interface AssessmentFormProps {
  subjectId: string;
  existingAssessment?: Assessment;
  onSubmit?: (assessmentId: string) => void;
}

const AssessmentForm: React.FC<AssessmentFormProps> = ({ 
  subjectId, 
  existingAssessment, 
  onSubmit 
}) => {
  const [activeTab, setActiveTab] = useState('details');
  const navigate = useNavigate();
  const [temporaryId, setTemporaryId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  const [newQuestion, setNewQuestion] = useState<{
    questionText: string;
    questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';
    options: string[];
    correctAnswer: string;
    points: number;
  }>({
    questionText: '',
    questionType: 'multiple_choice',
    options: ['', '', '', ''],
    correctAnswer: '',
    points: 1
  });

  // States for question import
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState<string>('all');
  const [questionMode, setQuestionMode] = useState<'theory' | 'practical'>('theory');
  const [importableQuestions, setImportableQuestions] = useState<any[]>([]);
  const [selectedQuestions, setSelectedQuestions] = useState<string[]>([]);
  const [isLoadingQuestions, setIsLoadingQuestions] = useState(false);

  // Fetch available topics for the subject
  const { data: topics = [], isLoading: loadingTopics } = useQuery({
    queryKey: ['question-topics', subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from('generated_questions')
        .select('topic')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      
      // Extract unique topics
      const uniqueTopics = [...new Set((data || []).map(item => item.topic))];
      return uniqueTopics;
    },
    enabled: !!subjectId
  });

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: existingAssessment ? {
      title: existingAssessment.title,
      instructions: existingAssessment.instructions || '',
      options: existingAssessment.options,
      restrictions: existingAssessment.restrictions,
      assignTo: existingAssessment.assignTo,
      dueDate: existingAssessment.dueDate,
      availableFrom: existingAssessment.availableFrom,
      availableUntil: existingAssessment.availableUntil,
    } : {
      title: '',
      instructions: '',
      options: {
        shuffleAnswers: false,
        timeLimit: {
          enabled: false,
          minutes: 30,
        },
        allowMultipleAttempts: false,
        showResponses: true,
        showResponsesOnlyOnce: false,
        showCorrectAnswers: false,
        showCorrectAnswersAt: null,
        hideCorrectAnswersAt: null,
        showOneQuestionAtTime: false,
      },
      restrictions: {
        requireAccessCode: false,
        accessCode: null,
        filterIpAddresses: false,
        allowedIpAddresses: null,
      },
      assignTo: null,
      dueDate: null,
      availableFrom: null,
      availableUntil: null,
    }
  });

  const getCurrentUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  };

  // Function to fetch importable questions based on topic and mode
  const fetchImportableQuestions = async () => {
    if (!subjectId) return;
    
    setIsLoadingQuestions(true);
    try {
      // Create the query
      let query = supabase
        .from('generated_questions')
        .select('*')
        .eq('subject_id', subjectId)
        .eq('question_mode', questionMode);
      
      if (selectedTopic !== 'all') {
        query = query.eq('topic', selectedTopic);
      }

      const { data, error } = await query.order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Process the questions from the data
      const processedQuestions = (data || []).flatMap(item => {
        const questionsData = item.questions;
        if (!questionsData || !Array.isArray(questionsData)) return [];
        
        return questionsData.map((q: any) => ({
          ...q,
          topic: item.topic,
          id: q.id || `${item.id}-${Math.random().toString(36).substring(2, 9)}`,
          generatedQuestionId: item.id
        }));
      });
      
      setImportableQuestions(processedQuestions);
    } catch (error) {
      console.error("Error fetching questions:", error);
      toast.error("Failed to fetch questions");
    } finally {
      setIsLoadingQuestions(false);
    }
  };

  // Function to handle question selection for import
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => 
      prev.includes(questionId) 
        ? prev.filter(id => id !== questionId)
        : [...prev, questionId]
    );
  };

  // Function to import selected questions
  const importSelectedQuestions = () => {
    const questionsToImport = importableQuestions.filter(q => selectedQuestions.includes(q.id));
    
    const formattedQuestions: AssessmentQuestion[] = questionsToImport.map((q, index) => ({
      id: `imported-${Date.now()}-${index}`,
      assessmentId: temporaryId || '',
      questionText: q.question,
      questionType: q.type === 'mcq' ? 'multiple_choice' : 'short_answer',
      options: q.type === 'mcq' && Array.isArray(q.options) ? q.options : null,
      correctAnswer: q.answer || '',
      points: 1,
      questionOrder: questions.length + index + 1,
      createdAt: new Date().toISOString()
    }));
    
    setQuestions(prev => [...prev, ...formattedQuestions]);
    setSelectedQuestions([]);
    setShowImportDialog(false);
    toast.success(`Imported ${formattedQuestions.length} question(s)`);
  };

  const handleSubmit = async (values: FormValues, saveAsDraft: boolean = false) => {
    try {
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast.error("You must be logged in to create an assessment");
        return;
      }

      const assessmentData = {
        title: values.title,
        instructions: values.instructions || null,
        options: values.options as AssessmentOption,
        restrictions: values.restrictions as AssessmentRestriction,
        assignTo: values.assignTo,
        dueDate: values.dueDate,
        availableFrom: values.availableFrom,
        availableUntil: values.availableUntil,
        subjectId: subjectId,
        createdBy: userId,
        status: saveAsDraft ? 'draft' : 'published' as Assessment['status'],
      };

      const assessmentId = await createAssessment(assessmentData);
      setTemporaryId(assessmentId);
      
      if (questions.length > 0) {
        await addQuestionsToAssessment(assessmentId, questions.map(q => ({
          questionText: q.questionText,
          questionType: q.questionType,
          options: q.options,
          correctAnswer: q.correctAnswer,
          points: q.points,
          questionOrder: q.questionOrder
        })));
      }
      
      toast.success(`Assessment ${saveAsDraft ? 'saved as draft' : 'published'} successfully`);
      
      if (onSubmit) {
        onSubmit(assessmentId);
      } else {
        navigate(`/dashboard/assessments/detail/${assessmentId}`);
      }
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast.error("Failed to create assessment. Please try again.");
    }
  };

  const addQuestion = () => {
    if (!newQuestion.questionText) {
      toast.error("Question text is required");
      return;
    }

    if (newQuestion.questionType === 'multiple_choice') {
      const nonEmptyOptions = newQuestion.options.filter(option => option.trim() !== '');
      if (nonEmptyOptions.length < 2) {
        toast.error("You need at least 2 options for a multiple choice question");
        return;
      }
      if (!newQuestion.correctAnswer) {
        toast.error("Please select a correct answer");
        return;
      }
    }

    if (newQuestion.questionType === 'true_false' && !['true', 'false'].includes(newQuestion.correctAnswer.toLowerCase())) {
      toast.error("Correct answer must be 'true' or 'false'");
      return;
    }

    const questionToAdd: AssessmentQuestion = {
      id: `temp-${Date.now()}`,
      assessmentId: temporaryId || '',
      questionText: newQuestion.questionText,
      questionType: newQuestion.questionType,
      options: newQuestion.questionType === 'multiple_choice' ? newQuestion.options : null,
      correctAnswer: newQuestion.correctAnswer,
      points: newQuestion.points,
      questionOrder: questions.length + 1,
      createdAt: new Date().toISOString()
    };

    setQuestions([...questions, questionToAdd]);

    setNewQuestion({
      questionText: '',
      questionType: 'multiple_choice',
      options: ['', '', '', ''],
      correctAnswer: '',
      points: 1
    });

    toast.success("Question added");
  };

  const removeQuestion = (index: number) => {
    const updatedQuestions = [...questions];
    updatedQuestions.splice(index, 1);
    const reorderedQuestions = updatedQuestions.map((q, idx) => ({
      ...q,
      questionOrder: idx + 1
    }));
    setQuestions(reorderedQuestions);
    toast.success("Question removed");
  };

  const TimeInput = ({ value, onChange }: { value: number; onChange: (value: number) => void }) => {
    return (
      <div className="flex items-center space-x-2">
        <Input
          type="number"
          min={1}
          max={180}
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value) || 1)}
          className="w-20"
        />
        <Label>minutes</Label>
      </div>
    );
  };

  const DatePicker = ({ value, onChange }: { value: string | null; onChange: (value: string | null) => void }) => {
    return (
      <Popover>
        <PopoverTrigger asChild>
          <Button
            variant="outline"
            className={cn(
              "w-full justify-start text-left font-normal",
              !value && "text-muted-foreground"
            )}
          >
            <CalendarIcon className="mr-2 h-4 w-4" />
            {value ? format(new Date(value), "PPP") : <span>Pick a date</span>}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          <Calendar
            mode="single"
            selected={value ? new Date(value) : undefined}
            onSelect={(date) => onChange(date ? date.toISOString() : null)}
            initialFocus
          />
        </PopoverContent>
      </Popover>
    );
  };

  // Effect to fetch questions when dialog opens
  useEffect(() => {
    if (showImportDialog) {
      fetchImportableQuestions();
    }
  }, [showImportDialog, selectedTopic, questionMode]);

  return (
    <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
      <TabsList className="grid grid-cols-2 w-full max-w-md mb-6">
        <TabsTrigger value="details">Details</TabsTrigger>
        <TabsTrigger value="questions">Questions</TabsTrigger>
      </TabsList>
      
      <TabsContent value="details">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Details</CardTitle>
            <CardDescription>
              Set up the basic information and settings for your assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form className="space-y-6" onSubmit={form.handleSubmit((values) => handleSubmit(values, false))}>
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Assessment Title*</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter assessment title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="instructions"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Quiz Instructions</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Enter instructions for students" 
                          className="min-h-[100px]" 
                          {...field} 
                        />
                      </FormControl>
                      <FormDescription>
                        Provide clear instructions for students taking this assessment
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-medium">Assessment Options</h3>
                  
                  <FormField
                    control={form.control}
                    name="options.shuffleAnswers"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Shuffle Answers</FormLabel>
                          <FormDescription>
                            Randomize the order of answers for each question
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="options.timeLimit.enabled"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Time Limit</FormLabel>
                          <FormDescription>
                            Set a time limit for completing the assessment
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('options.timeLimit.enabled') && (
                    <FormField
                      control={form.control}
                      name="options.timeLimit.minutes"
                      render={({ field }) => (
                        <FormItem className="ml-6 mt-2">
                          <FormLabel>Minutes</FormLabel>
                          <FormControl>
                            <TimeInput 
                              value={field.value} 
                              onChange={field.onChange} 
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="options.allowMultipleAttempts"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Allow Multiple Attempts</FormLabel>
                          <FormDescription>
                            Students can take the assessment more than once
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="options.showResponses"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Show Student Responses</FormLabel>
                          <FormDescription>
                            Let students see their responses after submission
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('options.showResponses') && (
                    <FormField
                      control={form.control}
                      name="options.showResponsesOnlyOnce"
                      render={({ field }) => (
                        <FormItem className="flex items-center justify-between ml-6">
                          <div>
                            <FormLabel>Only Once After Each Attempt</FormLabel>
                            <FormDescription>
                              Students can only see responses once after each attempt
                            </FormDescription>
                          </div>
                          <FormControl>
                            <Switch 
                              checked={field.value} 
                              onCheckedChange={field.onChange} 
                            />
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="options.showCorrectAnswers"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Show Correct Answers</FormLabel>
                          <FormDescription>
                            Let students see the correct answers
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('options.showCorrectAnswers') && (
                    <>
                      <FormField
                        control={form.control}
                        name="options.showCorrectAnswersAt"
                        render={({ field }) => (
                          <FormItem className="ml-6">
                            <FormLabel>Show Correct Answers At</FormLabel>
                            <FormControl>
                              <DatePicker 
                                value={field.value} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormDescription>
                              When to show correct answers (optional)
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={form.control}
                        name="options.hideCorrectAnswersAt"
                        render={({ field }) => (
                          <FormItem className="ml-6">
                            <FormLabel>Hide Correct Answers At</FormLabel>
                            <FormControl>
                              <DatePicker 
                                value={field.value} 
                                onChange={field.onChange} 
                              />
                            </FormControl>
                            <FormDescription>
                              When to hide correct answers (optional)
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </>
                  )}
                  
                  <FormField
                    control={form.control}
                    name="options.showOneQuestionAtTime"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Show One Question at a Time</FormLabel>
                          <FormDescription>
                            Display questions one by one instead of all at once
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-medium">Quiz Restrictions</h3>
                  
                  <FormField
                    control={form.control}
                    name="restrictions.requireAccessCode"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Require an Access Code</FormLabel>
                          <FormDescription>
                            Students need a code to access the assessment
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                  
                  {form.watch('restrictions.requireAccessCode') && (
                    <FormField
                      control={form.control}
                      name="restrictions.accessCode"
                      render={({ field }) => (
                        <FormItem className="ml-6">
                          <FormLabel>Required Access Code*</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="e.g., Password85" 
                              {...field} 
                              value={field.value || ''}
                              onChange={(e) => field.onChange(e.target.value || null)}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  )}
                  
                  <FormField
                    control={form.control}
                    name="restrictions.filterIpAddresses"
                    render={({ field }) => (
                      <FormItem className="flex items-center justify-between">
                        <div>
                          <FormLabel>Filter IP Addresses</FormLabel>
                          <FormDescription>
                            Restrict access to specific IP addresses
                          </FormDescription>
                        </div>
                        <FormControl>
                          <Switch 
                            checked={field.value} 
                            onCheckedChange={field.onChange} 
                          />
                        </FormControl>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="border rounded-lg p-4 space-y-4">
                  <h3 className="text-lg font-medium">Assignment Details</h3>
                  
                  <FormField
                    control={form.control}
                    name="dueDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Due Date</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={field.value} 
                            onChange={field.onChange} 
                          />
                        </FormControl>
                        <FormDescription>
                          When the assessment must be completed by
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="availableFrom"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available From</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={field.value} 
                            onChange={field.onChange} 
                          />
                        </FormControl>
                        <FormDescription>
                          When the assessment becomes available
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={form.control}
                    name="availableUntil"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Available Until</FormLabel>
                        <FormControl>
                          <DatePicker 
                            value={field.value} 
                            onChange={field.onChange} 
                          />
                        </FormControl>
                        <FormDescription>
                          When the assessment becomes unavailable
                        </FormDescription>
                      </FormItem>
                    )}
                  />
                </div>
                
                <div className="flex justify-end space-x-4">
                  <Button 
                    type="button" 
                    variant="outline"
                    onClick={() => handleSubmit(form.getValues(), true)}
                  >
                    <Save className="mr-2 h-4 w-4" />
                    Save Draft
                  </Button>
                  
                  <Button 
                    type="button"
                    onClick={() => setActiveTab('questions')}
                  >
                    Continue to Questions
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </TabsContent>
      
      <TabsContent value="questions">
        <Card>
          <CardHeader>
            <CardTitle>Assessment Questions</CardTitle>
            <CardDescription>
              Add questions to your assessment
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Questions ({questions.length})</h3>
              <Dialog open={showImportDialog} onOpenChange={setShowImportDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline">
                    <Database className="mr-2 h-4 w-4" />
                    Import from Question Bank
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-4xl">
                  <DialogHeader>
                    <DialogTitle>Import Questions from Question Bank</DialogTitle>
                    <DialogDescription>
                      Select questions from your question bank to add to this assessment.
                    </DialogDescription>
                  </DialogHeader>
                  
                  <div className="grid grid-cols-2 gap-4 py-4">
                    <div>
                      <Label htmlFor="topic">Topic</Label>
                      <Select 
                        value={selectedTopic} 
                        onValueChange={(value) => setSelectedTopic(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select topic" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All Topics</SelectItem>
                          {topics && topics.length > 0 ? (
                            topics.map((topic) => (
                              <SelectItem key={topic} value={topic}>
                                {topic}
                              </SelectItem>
                            ))
                          ) : (
                            <SelectItem value="none" disabled>No topics available</SelectItem>
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div>
                      <Label htmlFor="questionMode">Question Type</Label>
                      <Select 
                        value={questionMode} 
                        onValueChange={(value: 'theory' | 'practical') => setQuestionMode(value)}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select question type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="theory">Theory</SelectItem>
                          <SelectItem value="practical">Practical</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="flex justify-end mb-4">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={fetchImportableQuestions}
                      disabled={isLoadingQuestions}
                    >
                      <RefreshCw className={`mr-2 h-4 w-4 ${isLoadingQuestions ? "animate-spin" : ""}`} />
                      Refresh
                    </Button>
                  </div>
                  
                  <div className="max-h-[400px] overflow-y-auto border rounded">
                    {isLoadingQuestions ? (
                      <div className="flex justify-center items-center h-40">
                        <p className="text-muted-foreground">Loading questions...</p>
                      </div>
                    ) : importableQuestions.length === 0 ? (
                      <div className="flex justify-center items-center h-40">
                        <p className="text-muted-foreground">No questions found. Try selecting a different topic or generate questions first.</p>
                      </div>
                    ) : (
                      <div className="space-y-2 p-2">
                        {importableQuestions.map((question) => (
                          <div 
                            key={question.id} 
                            className={`p-3 border rounded flex justify-between items-start cursor-pointer hover:bg-muted transition-colors ${
                              selectedQuestions.includes(question.id) ? "border-primary bg-primary/10" : ""
                            }`}
                            onClick={() => toggleQuestionSelection(question.id)}
                          >
                            <div>
                              <div className="font-medium">{question.question}</div>
                              <div className="text-sm text-muted-foreground mt-1">
                                <Badge variant="outline" className="mr-2">
                                  {question.topic}
                                </Badge>
                                <Badge variant="secondary">
                                  {question.type === 'mcq' ? 'Multiple Choice' : 'Short Answer'}
                                </Badge>
                              </div>
                              {question.type === 'mcq' && question.options && Array.isArray(question.options) && question.options.length > 0 && (
                                <div className="mt-2 grid grid-cols-2 gap-1 text-sm">
                                  {question.options.map((option: string, index: number) => (
                                    <div key={index} className={`px-2 py-1 rounded ${option === question.answer ? "bg-green-100 text-green-800" : ""}`}>
                                      {option}
                                      {option === question.answer && " ✓"}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                            <div className="flex-shrink-0">
                              <input 
                                type="checkbox" 
                                checked={selectedQuestions.includes(question.id)}
                                readOnly
                                className="h-5 w-5"
                              />
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                  
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setShowImportDialog(false)}>
                      Cancel
                    </Button>
                    <Button 
                      onClick={importSelectedQuestions} 
                      disabled={selectedQuestions.length === 0}
                    >
                      Import Selected ({selectedQuestions.length})
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="border rounded-lg p-4 space-y-4">
              <h3 className="text-lg font-medium">Add New Question</h3>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="questionType">Question Type</Label>
                  <Select 
                    value={newQuestion.questionType} 
                    onValueChange={(value: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false') => {
                      setNewQuestion({
                        ...newQuestion,
                        questionType: value,
                        options: value === 'multiple_choice' ? ['', '', '', ''] : [],
                        correctAnswer: value === 'true_false' ? 'true' : ''
                      });
                    }}
                  >
                    <SelectTrigger id="questionType">
                      <SelectValue placeholder="Select question type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="multiple_choice">Multiple Choice</SelectItem>
                      <SelectItem value="short_answer">Short Answer</SelectItem>
                      <SelectItem value="essay">Essay</SelectItem>
                      <SelectItem value="true_false">True/False</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="questionText">Question Text*</Label>
                  <Textarea 
                    id="questionText"
                    placeholder="Enter the question"
                    className="min-h-[80px]"
                    value={newQuestion.questionText}
                    onChange={(e) => setNewQuestion({...newQuestion, questionText: e.target.value})}
                  />
                </div>
                
                {newQuestion.questionType === 'multiple_choice' && (
                  <div>
                    <Label>Answer Options*</Label>
                    <div className="space-y-2 mt-2">
                      {newQuestion.options && newQuestion.options.map((option, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <Input 
                            placeholder={`Option ${index + 1}`}
                            value={option}
                            onChange={(e) => {
                              const newOptions = [...newQuestion.options];
                              newOptions[index] = e.target.value;
                              setNewQuestion({...newQuestion, options: newOptions});
                            }}
                          />
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setNewQuestion({
                              ...newQuestion,
                              correctAnswer: option
                            })}
                            className={newQuestion.correctAnswer === option ? "border-green-500 bg-green-50" : ""}
                          >
                            Correct
                          </Button>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => {
                              const newOptions = [...newQuestion.options];
                              newOptions.splice(index, 1);
                              setNewQuestion({
                                ...newQuestion, 
                                options: newOptions,
                                correctAnswer: newQuestion.correctAnswer === option ? '' : newQuestion.correctAnswer
                              });
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                      
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="mt-2"
                        onClick={() => {
                          setNewQuestion({
                            ...newQuestion,
                            options: [...newQuestion.options, '']
                          });
                        }}
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Option
                      </Button>
                    </div>
                  </div>
                )}
                
                {newQuestion.questionType === 'true_false' && (
                  <div>
                    <Label>Correct Answer*</Label>
                    <div className="flex gap-4 mt-2">
                      <Button
                        type="button"
                        variant={newQuestion.correctAnswer === 'true' ? "default" : "outline"}
                        onClick={() => setNewQuestion({...newQuestion, correctAnswer: 'true'})}
                      >
                        True
                      </Button>
                      <Button
                        type="button"
                        variant={newQuestion.correctAnswer === 'false' ? "default" : "outline"}
                        onClick={() => setNewQuestion({...newQuestion, correctAnswer: 'false'})}
                      >
                        False
                      </Button>
                    </div>
                  </div>
                )}
                
                {(newQuestion.questionType === 'short_answer' || newQuestion.questionType === 'essay') && (
                  <div>
                    <Label htmlFor="correctAnswer">Correct Answer {newQuestion.questionType === 'short_answer' ? '*' : '(Optional)'}</Label>
                    <Textarea 
                      id="correctAnswer"
                      placeholder={`Enter the ${newQuestion.questionType === 'short_answer' ? 'correct answer' : 'model answer (optional)'}`}
                      className="min-h-[80px]"
                      value={newQuestion.correctAnswer}
                      onChange={(e) => setNewQuestion({...newQuestion, correctAnswer: e.target.value})}
                    />
                  </div>
                )}
                
                <div>
                  <Label htmlFor="points">Points</Label>
                  <Input 
                    id="points"
                    type="number"
                    min={1}
                    max={100}
                    value={newQuestion.points}
                    onChange={(e) => setNewQuestion({...newQuestion, points: parseInt(e.target.value) || 1})}
                  />
                </div>
                
                <Button type="button" onClick={addQuestion}>
                  <Plus className="h-4 w-4 mr-2" />
                  Add Question
                </Button>
              </div>
            </div>
            
            {questions.length > 0 ? (
              <div className="space-y-4">
                <h3 className="text-lg font-medium">Added Questions</h3>
                
                {questions.map((q, index) => (
                  <div key={q.id} className="border rounded-lg p-4">
                    <div className="flex justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold">{index + 1}.</span>
                        <Badge variant="outline">{q.questionType.replace('_', ' ')}</Badge>
                        <Badge variant="secondary">{q.points} {q.points === 1 ? 'point' : 'points'}</Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => removeQuestion(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <p className="mt-2">{q.questionText}</p>
                    
                    {q.questionType === 'multiple_choice' && q.options && (
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {q.options.map((option, i) => (
                          <div 
                            key={i} 
                            className={`px-3 py-2 border rounded ${option === q.correctAnswer ? 'bg-green-50 border-green-500' : ''}`}
                          >
                            {option}
                            {option === q.correctAnswer && ' (Correct)'}
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {(q.questionType === 'short_answer' || q.questionType === 'essay' || q.questionType === 'true_false') && (
                      <div className="mt-2">
                        <p className="text-sm text-muted-foreground">Correct answer: <span className="font-medium text-foreground">{q.correctAnswer}</span></p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center p-8 border rounded-lg bg-muted/30">
                <p className="text-muted-foreground">No questions added yet. Add your first question above or import from the question bank.</p>
              </div>
            )}
            
            <div className="flex justify-between pt-4 border-t">
              <Button 
                variant="outline" 
                onClick={() => setActiveTab('details')}
              >
                Back to Details
              </Button>
              
              <div className="space-x-4">
                <Button 
                  variant="outline"
                  onClick={() => handleSubmit(form.getValues(), true)}
                  disabled={!form.getValues().title || questions.length === 0}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
                
                <Button 
                  onClick={() => handleSubmit(form.getValues(), false)}
                  disabled={!form.getValues().title || questions.length === 0}
                >
                  Publish Assessment
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AssessmentForm;
