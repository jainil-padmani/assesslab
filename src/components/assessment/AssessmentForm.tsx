
import React, { useState } from 'react';
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
import { Assessment, AssessmentOption, AssessmentRestriction } from '@/types/assessments';
import { Calendar as CalendarIcon, Clock, Save } from 'lucide-react';
import { Calendar } from '@/components/ui/calendar';
import { format } from 'date-fns';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { cn } from '@/lib/utils';
import { createAssessment, updateAssessmentStatus } from '@/utils/assessment/assessmentService';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

// Define the form schema
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

  // Initialize the form with existing data or defaults
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

  // Get current user ID
  const getCurrentUserId = async () => {
    const { data } = await supabase.auth.getUser();
    return data.user?.id;
  };

  // Handle form submission
  const handleSubmit = async (values: FormValues, saveAsDraft: boolean = false) => {
    try {
      const userId = await getCurrentUserId();
      
      if (!userId) {
        toast.error("You must be logged in to create an assessment");
        return;
      }

      // Prepare assessment data
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

      // Create the assessment
      const assessmentId = await createAssessment(assessmentData);
      
      toast.success(`Assessment ${saveAsDraft ? 'saved as draft' : 'published'} successfully`);
      
      // Call onSubmit callback if provided
      if (onSubmit) {
        onSubmit(assessmentId);
      } else {
        // Navigate to the assessment details page
        navigate(`/dashboard/assessments/detail/${assessmentId}`);
      }
    } catch (error) {
      console.error("Error creating assessment:", error);
      toast.error("Failed to create assessment. Please try again.");
    }
  };

  // Component for time input field
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

  // Component for date picker
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
                    type="submit"
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
          <CardContent>
            {/* Questions content will be added here in a future update */}
            <div className="text-center py-10">
              <p className="text-muted-foreground">
                Please save your assessment details first to add questions
              </p>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="outline" 
              onClick={() => setActiveTab('details')}
            >
              Back to Details
            </Button>
            
            <Button 
              type="button" 
              onClick={() => form.handleSubmit((values) => handleSubmit(values, false))()}
            >
              Save & Publish
            </Button>
          </CardFooter>
        </Card>
      </TabsContent>
    </Tabs>
  );
};

export default AssessmentForm;
