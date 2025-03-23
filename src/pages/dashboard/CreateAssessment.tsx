
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Save, Clock, Plus, Check, CalendarDays } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";
import { toast } from "sonner";
import { useSubjectData } from "@/hooks/assessment/useSubjectData";
import { useGeneratedQuestions } from "@/hooks/assessment/useGeneratedQuestions";
import { AssessmentQuestion } from "@/types/assessments";
import { AssessmentQuestionsTab } from "@/components/assessment/AssessmentQuestionsTab";
import DateTimePicker from "@/components/assessment/DateTimePicker";

export default function CreateAssessment() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState("details");
  
  // Assessment details state
  const [title, setTitle] = useState("");
  const [instructions, setInstructions] = useState("");
  const [selectedSubject, setSelectedSubject] = useState(subjectId || "");
  const [shuffleAnswers, setShuffleAnswers] = useState(false);
  const [timeLimit, setTimeLimit] = useState<number | undefined>(undefined);
  const [allowMultipleAttempts, setAllowMultipleAttempts] = useState(false);
  const [showResponses, setShowResponses] = useState(true);
  const [showResponsesTiming, setShowResponsesTiming] = useState("after_attempt");
  const [showCorrectAnswers, setShowCorrectAnswers] = useState(false);
  const [showCorrectAnswersAt, setShowCorrectAnswersAt] = useState<Date | undefined>(undefined);
  const [hideCorrectAnswersAt, setHideCorrectAnswersAt] = useState<Date | undefined>(undefined);
  const [oneQuestionAtTime, setOneQuestionAtTime] = useState(false);
  const [accessCode, setAccessCode] = useState("");
  const [requireAccessCode, setRequireAccessCode] = useState(false);
  const [dueDate, setDueDate] = useState<Date | undefined>(undefined);
  const [availableFrom, setAvailableFrom] = useState<Date | undefined>(undefined);
  const [availableUntil, setAvailableUntil] = useState<Date | undefined>(undefined);
  
  // Questions state
  const [questions, setQuestions] = useState<AssessmentQuestion[]>([]);
  
  // Generate a random link code for assessment
  const generateLinkCode = () => {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
  };
  
  // Fetch all subjects
  const { data: subjects } = useSubjectData();
  
  // Create assessment mutation
  const createAssessmentMutation = useMutation({
    mutationFn: async ({ status }: { status: 'draft' | 'published' }) => {
      if (!title) {
        throw new Error("Assessment title is required");
      }
      
      if (!selectedSubject) {
        throw new Error("Please select a subject");
      }
      
      if (status === 'published' && questions.length === 0) {
        throw new Error("You need to add at least one question to publish the assessment");
      }
      
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to create an assessment");
      }
      
      console.log("Creating assessment with data:", {
        title,
        instructions,
        subject_id: selectedSubject,
        user_id: user.id,
        shuffle_answers: shuffleAnswers,
        time_limit: timeLimit,
        allow_multiple_attempts: allowMultipleAttempts,
        show_responses: showResponses,
        show_responses_timing: showResponsesTiming,
        show_correct_answers: showCorrectAnswers,
        show_correct_answers_at: showCorrectAnswersAt?.toISOString(),
        hide_correct_answers_at: hideCorrectAnswersAt?.toISOString(),
        one_question_at_time: oneQuestionAtTime,
        access_code: requireAccessCode ? accessCode : null,
        due_date: dueDate?.toISOString(),
        available_from: availableFrom?.toISOString(),
        available_until: availableUntil?.toISOString(),
        status,
        link_code: status === 'published' ? generateLinkCode() : null
      });
      
      // Create assessment
      const { data: assessmentData, error: assessmentError } = await supabase
        .from("assessments")
        .insert({
          title,
          instructions,
          subject_id: selectedSubject,
          user_id: user.id,
          shuffle_answers: shuffleAnswers,
          time_limit: timeLimit,
          allow_multiple_attempts: allowMultipleAttempts,
          show_responses: showResponses,
          show_responses_timing: showResponsesTiming,
          show_correct_answers: showCorrectAnswers,
          show_correct_answers_at: showCorrectAnswersAt?.toISOString(),
          hide_correct_answers_at: hideCorrectAnswersAt?.toISOString(),
          one_question_at_time: oneQuestionAtTime,
          access_code: requireAccessCode ? accessCode : null,
          due_date: dueDate?.toISOString(),
          available_from: availableFrom?.toISOString(),
          available_until: availableUntil?.toISOString(),
          status,
          link_code: status === 'published' ? generateLinkCode() : null
        })
        .select();
        
      if (assessmentError) {
        console.error("Assessment creation error:", assessmentError);
        throw new Error(`Database error: ${assessmentError.message}`);
      }
      
      if (!assessmentData || assessmentData.length === 0) {
        console.error("No assessment data returned");
        throw new Error("Failed to create assessment: No data returned");
      }
      
      const assessment = assessmentData[0];
      console.log("Assessment created:", assessment);
      
      // Add questions if any
      if (questions.length > 0) {
        const formattedQuestions = questions.map((q, index) => ({
          assessment_id: assessment.id,
          question_text: q.question_text,
          question_type: q.question_type,
          options: q.options,
          correct_answer: q.correct_answer,
          marks: q.marks,
          order_number: index + 1,
          source_question_id: q.source_question_id
        }));
        
        console.log("Adding questions:", formattedQuestions);
        try {
          const { error: questionsError } = await supabase
            .from("assessment_questions")
            .insert(formattedQuestions);
            
          if (questionsError) {
            console.error("Questions insert error:", questionsError);
            // Don't throw here, we'll just log the error and continue
            // The assessment was already created successfully
            toast.error(`Warning: Questions could not be added: ${questionsError.message}`);
          }
        } catch (err) {
          console.error("Error adding questions:", err);
          toast.error("Questions could not be added, but assessment was created");
        }
      }
      
      return assessment;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["subjectAssessments", selectedSubject] });
      toast.success(`Assessment ${data.status === 'published' ? 'published' : 'saved as draft'} successfully`);
      navigate(`/dashboard/assessments/detail/${data.id}`);
    },
    onError: (error: any) => {
      const errorMessage = error?.message || "Unknown error occurred";
      console.error("Create assessment error:", error);
      toast.error(`Error creating assessment: ${errorMessage}`);
    }
  });

  const handleSave = (publish: boolean = false) => {
    createAssessmentMutation.mutate({ status: publish ? 'published' : 'draft' });
  };

  // Handle access code toggle
  const handleAccessCodeToggle = (checked: boolean) => {
    setRequireAccessCode(checked);
    if (!checked) {
      setAccessCode('');
    }
  };

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Create New Assessment</h1>
          <p className="text-gray-600 mt-2">
            Design your assessment with questions and settings
          </p>
        </div>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => handleSave(false)}
            disabled={createAssessmentMutation.isPending}
          >
            <Save className="mr-2 h-4 w-4" />
            Save as Draft
          </Button>
          <Button 
            onClick={() => handleSave(true)}
            disabled={createAssessmentMutation.isPending}
          >
            <Check className="mr-2 h-4 w-4" />
            Save & Publish
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Assessment Title *</Label>
                <Input 
                  id="title" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Enter assessment title"
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="instructions">Quiz Instructions</Label>
                <Textarea 
                  id="instructions" 
                  value={instructions} 
                  onChange={(e) => setInstructions(e.target.value)}
                  placeholder="Enter instructions for students"
                  rows={4}
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="subject">Subject *</Label>
                <select
                  id="subject"
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  required
                >
                  <option value="">Select a subject</option>
                  {subjects?.map((subject) => (
                    <option key={subject.id} value={subject.id}>{subject.name}</option>
                  ))}
                </select>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Assessment Options</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Shuffle Answers</Label>
                  <p className="text-sm text-muted-foreground">
                    Randomize the order of answers for multiple choice questions
                  </p>
                </div>
                <Switch 
                  checked={shuffleAnswers} 
                  onCheckedChange={setShuffleAnswers} 
                />
              </div>
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Label htmlFor="timeLimit">Time Limit</Label>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </div>
                <div className="flex items-center space-x-2">
                  <Input 
                    id="timeLimit" 
                    type="number" 
                    min="0"
                    value={timeLimit || ''} 
                    onChange={(e) => setTimeLimit(e.target.value ? parseInt(e.target.value) : undefined)}
                    placeholder="No time limit"
                    className="w-24"
                  />
                  <span className="text-sm text-muted-foreground">Minutes (leave empty for no limit)</span>
                </div>
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Allow Multiple Attempts</Label>
                  <p className="text-sm text-muted-foreground">
                    Let students take the assessment more than once
                  </p>
                </div>
                <Switch 
                  checked={allowMultipleAttempts} 
                  onCheckedChange={setAllowMultipleAttempts} 
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Let Students See Their Quiz Responses</Label>
                  <p className="text-sm text-muted-foreground">
                    Incorrect questions will be marked in student feedback
                  </p>
                </div>
                <Switch 
                  checked={showResponses} 
                  onCheckedChange={setShowResponses} 
                />
              </div>
              
              {showResponses && (
                <div className="space-y-2 ml-6">
                  <Label htmlFor="responseTiming">Show responses</Label>
                  <select
                    id="responseTiming"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={showResponsesTiming}
                    onChange={(e) => setShowResponsesTiming(e.target.value)}
                  >
                    <option value="after_attempt">Only once after each attempt</option>
                    <option value="after_due_date">After due date</option>
                    <option value="never">Never</option>
                  </select>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Let Students See The Correct Answers</Label>
                  <p className="text-sm text-muted-foreground">
                    Show correct answers for quiz questions
                  </p>
                </div>
                <Switch 
                  checked={showCorrectAnswers} 
                  onCheckedChange={setShowCorrectAnswers} 
                />
              </div>
              
              {showCorrectAnswers && (
                <div className="space-y-4 ml-6">
                  <div className="space-y-2">
                    <Label>Show Correct Answers At</Label>
                    <DateTimePicker 
                      date={showCorrectAnswersAt} 
                      setDate={setShowCorrectAnswersAt} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Hide Correct Answers At</Label>
                    <DateTimePicker 
                      date={hideCorrectAnswersAt} 
                      setDate={setHideCorrectAnswersAt} 
                    />
                  </div>
                </div>
              )}
              
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Show one question at a time</Label>
                  <p className="text-sm text-muted-foreground">
                    Students will navigate through questions one by one
                  </p>
                </div>
                <Switch 
                  checked={oneQuestionAtTime} 
                  onCheckedChange={setOneQuestionAtTime} 
                />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Quiz Restrictions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="accessCode">Require an access code</Label>
                  <Switch 
                    checked={requireAccessCode}
                    onCheckedChange={handleAccessCodeToggle}
                  />
                </div>
                
                {requireAccessCode && (
                  <Input 
                    id="accessCode" 
                    value={accessCode} 
                    onChange={(e) => setAccessCode(e.target.value)}
                    placeholder="ex: Password85"
                    className="mt-2"
                  />
                )}
              </div>
              
              <div className="space-y-2">
                <Label className="flex items-center space-x-2">
                  <CalendarDays className="h-4 w-4" />
                  <span>Schedule</span>
                </Label>
                
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label>Due Date (Optional)</Label>
                    <DateTimePicker 
                      date={dueDate} 
                      setDate={setDueDate} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Available from (Optional)</Label>
                    <DateTimePicker 
                      date={availableFrom} 
                      setDate={setAvailableFrom} 
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Available until (Optional)</Label>
                    <DateTimePicker 
                      date={availableUntil} 
                      setDate={setAvailableUntil} 
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="questions">
          <AssessmentQuestionsTab 
            questions={questions}
            setQuestions={setQuestions}
            subjectId={selectedSubject}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}
