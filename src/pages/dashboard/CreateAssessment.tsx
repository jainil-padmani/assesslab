
import React, { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { createAssessment, generateAccessCode } from "@/utils/assessment/assessmentManager";
import { ArrowLeft, CalendarIcon, Clock, Key, Save, Shield, Upload, Wifi } from "lucide-react";
import { toast } from "sonner";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { format } from "date-fns";

// Validation schema for assessment details
const assessmentDetailsSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  instructions: z.string().optional(),
  subject_id: z.string().min(1, { message: "Subject is required" }),
  
  // Options
  shuffle_answers: z.boolean().default(false),
  time_limit_enabled: z.boolean().default(false),
  time_limit_minutes: z.number().optional().nullable(),
  allow_multiple_attempts: z.boolean().default(false),
  show_quiz_responses: z.boolean().default(true),
  show_once_after_attempt: z.boolean().default(true),
  show_correct_answers: z.boolean().default(false),
  show_correct_answers_at: z.string().optional().nullable(),
  hide_correct_answers_at: z.string().optional().nullable(),
  show_one_question_at_time: z.boolean().default(false),
  
  // Restrictions
  require_access_code: z.boolean().default(false),
  access_code: z.string().optional().nullable(),
  filter_ip: z.boolean().default(false),
  filter_ip_address: z.string().optional().nullable(),
  
  // Assignment
  due_date: z.string().optional().nullable(),
  available_from: z.string().optional().nullable(),
  available_until: z.string().optional().nullable(),
});

// Question type
type Question = {
  id: string;
  question_text: string;
  question_type: 'multiple_choice' | 'text' | 'true_false';
  options?: string[];
  correct_answer: string;
  points: number;
};

const CreateAssessment = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const initialSubjectId = searchParams.get('subject');
  
  const [activeTab, setActiveTab] = useState('details');
  const [questions, setQuestions] = useState<Question[]>([]);
  const [topics, setTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string>('');
  const [topicQuestions, setTopicQuestions] = useState<any[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  
  // Fetch subjects
  const { data: subjects } = useQuery({
    queryKey: ["subjects-for-create-assessment"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name, subject_code');
        
      if (error) throw error;
      return data || [];
    }
  });
  
  // Form setup
  const form = useForm<z.infer<typeof assessmentDetailsSchema>>({
    resolver: zodResolver(assessmentDetailsSchema),
    defaultValues: {
      title: "",
      instructions: "",
      subject_id: initialSubjectId || "",
      shuffle_answers: false,
      time_limit_enabled: false,
      time_limit_minutes: 30,
      allow_multiple_attempts: false,
      show_quiz_responses: true,
      show_once_after_attempt: true,
      show_correct_answers: false,
      show_correct_answers_at: null,
      hide_correct_answers_at: null,
      show_one_question_at_time: false,
      require_access_code: false,
      access_code: null,
      filter_ip: false,
      filter_ip_address: null,
      due_date: null,
      available_from: null,
      available_until: null,
    }
  });
  
  // Watch the form values that affect other fields
  const watchTimeLimit = form.watch("time_limit_enabled");
  const watchAccessCode = form.watch("require_access_code");
  const watchFilterIP = form.watch("filter_ip");
  
  // Generate access code when the toggle is turned on
  useEffect(() => {
    if (watchAccessCode && !form.getValues("access_code")) {
      form.setValue("access_code", generateAccessCode());
    }
  }, [watchAccessCode, form]);
  
  // Reset time limit minutes when time limit is disabled
  useEffect(() => {
    if (!watchTimeLimit) {
      form.setValue("time_limit_minutes", null);
    } else if (!form.getValues("time_limit_minutes")) {
      form.setValue("time_limit_minutes", 30);
    }
  }, [watchTimeLimit, form]);
  
  // Fetch topics and questions based on subject
  useEffect(() => {
    const subjectId = form.getValues("subject_id");
    if (!subjectId) return;
    
    // Fetch topics from generated questions
    const fetchTopics = async () => {
      try {
        const { data, error } = await supabase
          .from('generated_questions')
          .select('topic')
          .eq('subject_id', subjectId)
          .order('created_at', { ascending: false });
          
        if (error) throw error;
        
        // Extract unique topics
        const uniqueTopics = Array.from(
          new Set(data.map(item => item.topic))
        );
        
        setTopics(uniqueTopics);
      } catch (error) {
        console.error('Error fetching topics:', error);
      }
    };
    
    fetchTopics();
  }, [form.getValues("subject_id")]);
  
  // Fetch questions for selected topic
  useEffect(() => {
    if (!selectedTopic || !form.getValues("subject_id")) return;
    
    const fetchQuestionsForTopic = async () => {
      try {
        const { data, error } = await supabase
          .from('generated_questions')
          .select('questions')
          .eq('subject_id', form.getValues("subject_id"))
          .eq('topic', selectedTopic)
          .order('created_at', { ascending: false })
          .limit(1);
          
        if (error) throw error;
        
        if (data && data.length > 0 && data[0].questions) {
          setTopicQuestions(Array.isArray(data[0].questions) ? data[0].questions : []);
        } else {
          setTopicQuestions([]);
        }
      } catch (error) {
        console.error('Error fetching questions for topic:', error);
        toast.error('Failed to load questions for the selected topic');
      }
    };
    
    fetchQuestionsForTopic();
  }, [selectedTopic, form.getValues("subject_id")]);
  
  // Handle adding a question to the assessment
  const handleAddQuestion = (question: any) => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      question_text: question.question,
      question_type: question.type === 'mcq' ? 'multiple_choice' : 'text',
      options: question.options,
      correct_answer: question.answer,
      points: 1
    };
    
    setQuestions([...questions, newQuestion]);
    toast.success('Question added to assessment');
  };
  
  // Handle removing a question from the assessment
  const handleRemoveQuestion = (questionId: string) => {
    setQuestions(questions.filter(q => q.id !== questionId));
    toast.success('Question removed from assessment');
  };
  
  // Handle form submission
  const onSubmit = async (values: z.infer<typeof assessmentDetailsSchema>, isPublishing = false) => {
    try {
      if (isPublishing) {
        setIsPublishing(true);
      } else {
        setIsSaving(true);
      }
      
      // Get current user
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('You must be logged in to create an assessment');
        return;
      }
      
      // Prepare assessment data
      const assessmentData = {
        title: values.title,
        instructions: values.instructions,
        subject_id: values.subject_id,
        created_by: session.user.id,
        options: {
          shuffle_answers: values.shuffle_answers,
          time_limit_enabled: values.time_limit_enabled,
          time_limit_minutes: values.time_limit_enabled ? values.time_limit_minutes : null,
          allow_multiple_attempts: values.allow_multiple_attempts,
          show_quiz_responses: values.show_quiz_responses,
          show_once_after_attempt: values.show_once_after_attempt,
          show_correct_answers: values.show_correct_answers,
          show_correct_answers_at: values.show_correct_answers_at,
          hide_correct_answers_at: values.hide_correct_answers_at,
          show_one_question_at_time: values.show_one_question_at_time
        },
        restrictions: {
          require_access_code: values.require_access_code,
          access_code: values.require_access_code ? values.access_code : null,
          filter_ip: values.filter_ip,
          filter_ip_address: values.filter_ip ? values.filter_ip_address : null
        },
        due_date: values.due_date,
        available_from: values.available_from,
        available_until: values.available_until
      };
      
      // Validate that we have questions if publishing
      if (isPublishing && questions.length === 0) {
        toast.error('You need to add at least one question before publishing');
        setIsPublishing(false);
        setActiveTab('questions');
        return;
      }
      
      // Create the assessment
      const assessmentId = await createAssessment(assessmentData, questions);
      
      if (isPublishing) {
        toast.success('Assessment published successfully!');
        navigate(`/dashboard/assessments/detail/${assessmentId}`);
      } else {
        toast.success('Assessment draft saved!');
        setIsSaving(false);
      }
    } catch (error: any) {
      console.error('Error submitting assessment:', error);
      toast.error(`Failed to save assessment: ${error.message || 'Unknown error'}`);
      setIsSaving(false);
      setIsPublishing(false);
    }
  };
  
  // Generate a demo question
  const generateDemoQuestion = () => {
    const newQuestion: Question = {
      id: crypto.randomUUID(),
      question_text: 'What is the capital of France?',
      question_type: 'multiple_choice',
      options: ['London', 'Berlin', 'Paris', 'Madrid'],
      correct_answer: 'Paris',
      points: 1
    };
    
    setQuestions([...questions, newQuestion]);
    toast.success('Demo question added');
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={() => navigate(-1)} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <h1 className="text-2xl font-bold">Create Assessment</h1>
      </div>
      
      <Form {...form}>
        <form onSubmit={form.handleSubmit(values => onSubmit(values, true))}>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="mb-4">
              <TabsTrigger value="details">Assessment Details</TabsTrigger>
              <TabsTrigger value="questions">
                Questions {questions.length > 0 && `(${questions.length})`}
              </TabsTrigger>
            </TabsList>
            
            <Card>
              <TabsContent value="details">
                <CardHeader>
                  <CardTitle>Assessment Details</CardTitle>
                  <CardDescription>
                    Configure the basic information and settings for your assessment
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Basic Information */}
                  <div className="space-y-4">
                    <FormField
                      control={form.control}
                      name="title"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Assessment Title *</FormLabel>
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
                              placeholder="Enter instructions for students (optional)"
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
                    
                    <FormField
                      control={form.control}
                      name="subject_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Subject *</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            defaultValue={field.value}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Select a subject" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {subjects && subjects.map((subject) => (
                                <SelectItem key={subject.id} value={subject.id}>
                                  {subject.name} ({subject.subject_code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  
                  <Separator />
                  
                  {/* Assessment Options */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Assessment Options</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="shuffle_answers"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Shuffle Answers</FormLabel>
                              <FormDescription>
                                Randomize the order of multiple-choice options
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
                        name="time_limit_enabled"
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
                      
                      {watchTimeLimit && (
                        <FormField
                          control={form.control}
                          name="time_limit_minutes"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Minutes</FormLabel>
                              <FormControl>
                                <Input 
                                  type="number" 
                                  min={1}
                                  {...field}
                                  onChange={e => field.onChange(e.target.value ? parseInt(e.target.value) : null)} 
                                />
                              </FormControl>
                              <FormDescription>
                                How many minutes students have to complete the assessment
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="allow_multiple_attempts"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Allow Multiple Attempts</FormLabel>
                              <FormDescription>
                                Let students take the assessment more than once
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
                        name="show_quiz_responses"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Let Students See Their Quiz Responses</FormLabel>
                              <FormDescription>
                                Show students which questions they got wrong
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
                        name="show_once_after_attempt"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Only Once After Each Attempt</FormLabel>
                              <FormDescription>
                                Students can only view their responses once after each attempt
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
                        name="show_correct_answers"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Let Students See Correct Answers</FormLabel>
                              <FormDescription>
                                Show students the correct answers to questions
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
                      
                      {form.watch("show_correct_answers") && (
                        <>
                          <FormField
                            control={form.control}
                            name="show_correct_answers_at"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Show Correct Answers At</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(new Date(field.value), "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value ? new Date(field.value) : undefined}
                                      onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormDescription>
                                  When to show correct answers to students (optional)
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={form.control}
                            name="hide_correct_answers_at"
                            render={({ field }) => (
                              <FormItem className="flex flex-col">
                                <FormLabel>Hide Correct Answers At</FormLabel>
                                <Popover>
                                  <PopoverTrigger asChild>
                                    <FormControl>
                                      <Button
                                        variant={"outline"}
                                        className={cn(
                                          "w-full pl-3 text-left font-normal",
                                          !field.value && "text-muted-foreground"
                                        )}
                                      >
                                        {field.value ? (
                                          format(new Date(field.value), "PPP")
                                        ) : (
                                          <span>Pick a date</span>
                                        )}
                                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                      </Button>
                                    </FormControl>
                                  </PopoverTrigger>
                                  <PopoverContent className="w-auto p-0" align="start">
                                    <Calendar
                                      mode="single"
                                      selected={field.value ? new Date(field.value) : undefined}
                                      onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                                      initialFocus
                                    />
                                  </PopoverContent>
                                </Popover>
                                <FormDescription>
                                  When to hide correct answers from students (optional)
                                </FormDescription>
                              </FormItem>
                            )}
                          />
                        </>
                      )}
                      
                      <FormField
                        control={form.control}
                        name="show_one_question_at_time"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div>
                              <FormLabel>Show One Question at a Time</FormLabel>
                              <FormDescription>
                                Present questions one-by-one instead of all at once
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
                  </div>
                  
                  <Separator />
                  
                  {/* Quiz Restrictions */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Quiz Restrictions</h3>
                    <div className="space-y-4">
                      <FormField
                        control={form.control}
                        name="require_access_code"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Key className="h-4 w-4 mr-2 text-muted-foreground" />
                              <div>
                                <FormLabel>Require an Access Code</FormLabel>
                                <FormDescription>
                                  Students need a code to access the assessment
                                </FormDescription>
                              </div>
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
                      
                      {watchAccessCode && (
                        <FormField
                          control={form.control}
                          name="access_code"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Required Access Code *</FormLabel>
                              <FormControl>
                                <div className="flex">
                                  <Input 
                                    placeholder="e.g. PASSWORD85" 
                                    {...field}
                                    value={field.value || ''}
                                    className="flex-1"
                                  />
                                  <Button 
                                    type="button" 
                                    variant="outline" 
                                    className="ml-2"
                                    onClick={() => form.setValue("access_code", generateAccessCode())}
                                  >
                                    Generate
                                  </Button>
                                </div>
                              </FormControl>
                              <FormDescription>
                                Share this code with your students
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                      
                      <FormField
                        control={form.control}
                        name="filter_ip"
                        render={({ field }) => (
                          <FormItem className="flex items-center justify-between">
                            <div className="flex items-center">
                              <Wifi className="h-4 w-4 mr-2 text-muted-foreground" />
                              <div>
                                <FormLabel>Filter IP Addresses</FormLabel>
                                <FormDescription>
                                  Restrict access to specific IP addresses
                                </FormDescription>
                              </div>
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
                      
                      {watchFilterIP && (
                        <FormField
                          control={form.control}
                          name="filter_ip_address"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Filter by IP Address *</FormLabel>
                              <FormControl>
                                <Input 
                                  placeholder="e.g. 192.168.217.1" 
                                  {...field}
                                  value={field.value || ''}
                                />
                              </FormControl>
                              <FormDescription>
                                Only allow access from this IP address
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      )}
                    </div>
                  </div>
                  
                  <Separator />
                  
                  {/* Assignment Details */}
                  <div>
                    <h3 className="text-lg font-medium mb-4">Assignment Details</h3>
                    <div className="space-y-4">
                      {/* Due Date */}
                      <FormField
                        control={form.control}
                        name="due_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Due Date</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>No due date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              The date by which students should complete the assessment
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      {/* Available From */}
                      <FormField
                        control={form.control}
                        name="available_from"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Available From</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>Available immediately</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              When students can start taking the assessment
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                      
                      {/* Available Until */}
                      <FormField
                        control={form.control}
                        name="available_until"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Available Until</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant={"outline"}
                                    className={cn(
                                      "w-full pl-3 text-left font-normal",
                                      !field.value && "text-muted-foreground"
                                    )}
                                  >
                                    {field.value ? (
                                      format(new Date(field.value), "PPP")
                                    ) : (
                                      <span>No end date</span>
                                    )}
                                    <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value ? new Date(field.value) : undefined}
                                  onSelect={(date) => field.onChange(date ? date.toISOString() : null)}
                                  initialFocus
                                />
                              </PopoverContent>
                            </Popover>
                            <FormDescription>
                              When the assessment becomes unavailable
                            </FormDescription>
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex justify-between w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate(-1)}
                    >
                      Cancel
                    </Button>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.handleSubmit((values) => onSubmit(values, false))()}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Draft'}
                      </Button>
                      <Button
                        type="button"
                        onClick={() => setActiveTab('questions')}
                      >
                        Next: Add Questions
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </TabsContent>
              
              <TabsContent value="questions">
                <CardHeader>
                  <CardTitle>Assessment Questions</CardTitle>
                  <CardDescription>
                    Add and manage the questions for your assessment
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Questions List */}
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <h3 className="text-lg font-medium">Selected Questions</h3>
                        <div className="text-sm text-muted-foreground">
                          {questions.length} questions added
                        </div>
                      </div>
                      
                      <ScrollArea className="h-[500px] border rounded-md p-4">
                        {questions.length > 0 ? (
                          <div className="space-y-4">
                            {questions.map((question, index) => (
                              <Card key={question.id} className="shadow-sm">
                                <CardHeader className="py-3 px-4">
                                  <div className="flex justify-between items-start">
                                    <CardTitle className="text-base">
                                      Question {index + 1}
                                    </CardTitle>
                                    <Badge variant="outline">
                                      {question.question_type === 'multiple_choice' 
                                        ? 'Multiple Choice' 
                                        : question.question_type === 'true_false'
                                          ? 'True/False'
                                          : 'Text'}
                                    </Badge>
                                  </div>
                                </CardHeader>
                                <CardContent className="py-2 px-4">
                                  <p className="text-sm mb-2">{question.question_text}</p>
                                  
                                  {question.question_type === 'multiple_choice' && question.options && (
                                    <div className="ml-4 space-y-1">
                                      {question.options.map((option, i) => (
                                        <div key={i} className="flex items-center text-sm">
                                          <div className={`w-4 h-4 rounded-full mr-2 ${
                                            option === question.correct_answer ? 'bg-green-500' : 'bg-gray-200'
                                          }`}></div>
                                          {option}
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                  
                                  {question.question_type === 'text' && (
                                    <div className="text-sm ml-4 italic text-muted-foreground">
                                      Answer: {question.correct_answer}
                                    </div>
                                  )}
                                </CardContent>
                                <CardFooter className="py-2 px-4 flex justify-between">
                                  <div className="text-sm">
                                    Points: {question.points}
                                  </div>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={() => handleRemoveQuestion(question.id)}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-50"
                                  >
                                    Remove
                                  </Button>
                                </CardFooter>
                              </Card>
                            ))}
                          </div>
                        ) : (
                          <div className="flex flex-col items-center justify-center h-[400px] text-center">
                            <Shield className="h-12 w-12 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium mb-2">No Questions Added</h3>
                            <p className="text-muted-foreground mb-4">
                              Select topic and questions from the right panel to add them to the assessment
                            </p>
                            <Button 
                              variant="outline" 
                              onClick={generateDemoQuestion}
                              className="mt-2"
                            >
                              Add Demo Question
                            </Button>
                          </div>
                        )}
                      </ScrollArea>
                    </div>
                    
                    {/* Add Questions */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-medium">Add Questions</h3>
                      
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="topic">Select Topic</Label>
                          <Select
                            value={selectedTopic}
                            onValueChange={setSelectedTopic}
                          >
                            <SelectTrigger id="topic">
                              <SelectValue placeholder="Choose a topic" />
                            </SelectTrigger>
                            <SelectContent>
                              {topics.map((topic) => (
                                <SelectItem key={topic} value={topic}>
                                  {topic}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          <p className="text-sm text-muted-foreground mt-1">
                            Select a topic to view available questions
                          </p>
                        </div>
                        
                        <ScrollArea className="h-[400px] border rounded-md p-4">
                          {selectedTopic ? (
                            <>
                              {topicQuestions.length > 0 ? (
                                <div className="space-y-4">
                                  {topicQuestions.map((question, index) => (
                                    <Card key={index} className="shadow-sm">
                                      <CardHeader className="py-3 px-4">
                                        <div className="flex justify-between items-start">
                                          <CardTitle className="text-base">
                                            {question.question.substring(0, 60)}
                                            {question.question.length > 60 ? '...' : ''}
                                          </CardTitle>
                                          <Badge variant="outline">
                                            {question.type === 'mcq' ? 'Multiple Choice' : 'Text'}
                                          </Badge>
                                        </div>
                                      </CardHeader>
                                      <CardContent className="py-2 px-4">
                                        {question.type === 'mcq' && question.options && (
                                          <div className="ml-4 space-y-1 text-sm">
                                            {question.options.map((option, i) => (
                                              <div key={i} className="flex items-center">
                                                <div className={`w-3 h-3 rounded-full mr-2 ${
                                                  option === question.answer ? 'bg-green-500' : 'bg-gray-200'
                                                }`}></div>
                                                {option}
                                              </div>
                                            ))}
                                          </div>
                                        )}
                                        
                                        {question.type !== 'mcq' && (
                                          <div className="text-sm ml-4 italic text-muted-foreground">
                                            Answer: {question.answer}
                                          </div>
                                        )}
                                      </CardContent>
                                      <CardFooter className="py-2 px-4">
                                        <Button
                                          variant="outline"
                                          size="sm"
                                          className="w-full"
                                          onClick={() => handleAddQuestion(question)}
                                        >
                                          Add to Assessment
                                        </Button>
                                      </CardFooter>
                                    </Card>
                                  ))}
                                </div>
                              ) : (
                                <div className="flex flex-col items-center justify-center h-[300px] text-center">
                                  <h3 className="text-lg font-medium mb-2">No Questions Found</h3>
                                  <p className="text-muted-foreground">
                                    There are no questions available for this topic
                                  </p>
                                </div>
                              )}
                            </>
                          ) : (
                            <div className="flex flex-col items-center justify-center h-[300px] text-center">
                              <Upload className="h-12 w-12 text-muted-foreground mb-4" />
                              <h3 className="text-lg font-medium mb-2">Select a Topic</h3>
                              <p className="text-muted-foreground">
                                Choose a topic from the dropdown above to view available questions
                              </p>
                            </div>
                          )}
                        </ScrollArea>
                      </div>
                    </div>
                  </div>
                </CardContent>
                <CardFooter>
                  <div className="flex justify-between w-full">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setActiveTab('details')}
                    >
                      Back to Details
                    </Button>
                    <div className="space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => form.handleSubmit((values) => onSubmit(values, false))()}
                        disabled={isSaving}
                      >
                        {isSaving ? 'Saving...' : 'Save Draft'}
                      </Button>
                      <Button
                        type="submit"
                        disabled={isPublishing || questions.length === 0}
                      >
                        {isPublishing ? 'Publishing...' : 'Save & Publish'}
                      </Button>
                    </div>
                  </div>
                </CardFooter>
              </TabsContent>
            </Card>
          </Tabs>
        </form>
      </Form>
    </div>
  );
};

export default CreateAssessment;
