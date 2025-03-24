
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { fetchAssessmentDetails, fetchAssessmentQuestions, submitAssessmentAnswers } from "@/utils/assessment/assessmentManager";
import { ArrowLeft, ArrowRight, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

const TakeAssessment = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  
  // Student identification
  const [grNumber, setGrNumber] = useState("");
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentDetails, setStudentDetails] = useState<any>(null);
  const [accessCode, setAccessCode] = useState("");
  const [isVerifying, setIsVerifying] = useState(false);
  
  // Assessment state
  const [isStarted, setIsStarted] = useState(false);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: string]: string }>({});
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [timeSpent, setTimeSpent] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submissionScore, setSubmissionScore] = useState<{
    score: number;
    possibleScore: number;
  } | null>(null);
  
  // Fetch assessment details
  const { data: assessment, isLoading: isLoadingDetails, error: detailsError } = useQuery({
    queryKey: ["take-assessment-details", assessmentId],
    queryFn: () => fetchAssessmentDetails(assessmentId!),
    enabled: !!assessmentId
  });
  
  // Fetch assessment questions
  const { data: questions, isLoading: isLoadingQuestions, error: questionsError } = useQuery({
    queryKey: ["take-assessment-questions", assessmentId],
    queryFn: () => fetchAssessmentQuestions(assessmentId!),
    enabled: !!assessmentId
  });
  
  // Set up the timer
  useEffect(() => {
    let timer: number | undefined;
    
    if (isStarted && assessment?.options?.time_limit_enabled && assessment.options.time_limit_minutes) {
      // Convert minutes to seconds
      const timeLimitInSeconds = assessment.options.time_limit_minutes * 60;
      
      if (timeRemaining === null) {
        setTimeRemaining(timeLimitInSeconds);
      }
      
      timer = window.setInterval(() => {
        setTimeRemaining(prev => {
          if (prev === null || prev <= 0) {
            clearInterval(timer);
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
        
        setTimeSpent(prev => prev + 1);
      }, 1000);
    } else if (isStarted) {
      // If there's no time limit, just track time spent
      timer = window.setInterval(() => {
        setTimeSpent(prev => prev + 1);
      }, 1000);
    }
    
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isStarted, assessment]);
  
  // Format time display
  const formatTime = (totalSeconds: number) => {
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    const seconds = totalSeconds % 60;
    
    const parts = [];
    
    if (hours > 0) {
      parts.push(`${hours}h`);
    }
    
    if (minutes > 0 || hours > 0) {
      parts.push(`${minutes}m`);
    }
    
    parts.push(`${seconds}s`);
    
    return parts.join(' ');
  };
  
  // Handle time up
  const handleTimeUp = () => {
    toast.warning("Time's up! The assessment will be submitted automatically.");
    handleSubmitAssessment();
  };
  
  // Verify student GR number
  const verifyStudent = async () => {
    if (!grNumber.trim()) {
      toast.error("Please enter your GR Number");
      return;
    }
    
    setIsVerifying(true);
    
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, name, gr_number, roll_number')
        .eq('gr_number', grNumber)
        .maybeSingle();
        
      if (error) throw error;
      
      if (!data) {
        toast.error("Student not found. Please check your GR Number");
        setIsVerifying(false);
        return;
      }
      
      setStudentDetails(data);
      setStudentId(data.id);
      
      // Check if access code is required
      if (assessment?.restrictions?.require_access_code) {
        // Don't auto-proceed, let them enter the access code
      } else {
        // If no access code required, proceed
        setIsStarted(true);
      }
      
      setIsVerifying(false);
    } catch (error) {
      console.error('Error verifying student:', error);
      toast.error("There was a problem verifying your ID. Please try again.");
      setIsVerifying(false);
    }
  };
  
  // Verify access code
  const verifyAccessCode = () => {
    if (!accessCode.trim()) {
      toast.error("Please enter the access code");
      return;
    }
    
    if (assessment?.restrictions?.access_code === accessCode) {
      setIsStarted(true);
    } else {
      toast.error("Incorrect access code. Please try again.");
    }
  };
  
  // Handle answer change
  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: value
    }));
  };
  
  // Navigate between questions
  const handleNext = () => {
    if (questions && currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  // Submit assessment
  const handleSubmitAssessment = async () => {
    if (!studentId || !questions || !assessmentId) return;
    
    setIsSubmitting(true);
    
    try {
      // Format answers for submission
      const formattedAnswers = Object.entries(answers).map(([questionId, answer]) => ({
        question_id: questionId,
        answer
      }));
      
      // Submit answers
      const result = await submitAssessmentAnswers(
        assessmentId,
        studentId,
        formattedAnswers,
        timeSpent
      );
      
      setSubmissionSuccess(true);
      setSubmissionScore({
        score: result.score,
        possibleScore: result.possibleScore
      });
      
      toast.success("Assessment submitted successfully!");
    } catch (error) {
      console.error('Error submitting assessment:', error);
      toast.error("There was a problem submitting your assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Loading state
  if (isLoadingDetails || isLoadingQuestions) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Loading Assessment...</h1>
          <p>Please wait while we load your assessment.</p>
        </div>
      </div>
    );
  }
  
  // Error state
  if (detailsError || questionsError || !assessment) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Assessment Not Found</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              The assessment you're looking for is not available or may have been removed.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Check availability
  const now = new Date();
  const isBeforeAvailableFrom = assessment.available_from && new Date(assessment.available_from) > now;
  const isAfterAvailableUntil = assessment.available_until && new Date(assessment.available_until) < now;
  
  if (isBeforeAvailableFrom) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{assessment.title}</CardTitle>
            <CardDescription>
              This assessment is not yet available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Not Available</AlertTitle>
              <AlertDescription>
                This assessment will be available from {new Date(assessment.available_from).toLocaleString()}.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  if (isAfterAvailableUntil) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{assessment.title}</CardTitle>
            <CardDescription>
              This assessment is no longer available
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Closed</AlertTitle>
              <AlertDescription>
                This assessment was available until {new Date(assessment.available_until).toLocaleString()} and is now closed.
              </AlertDescription>
            </Alert>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Success screen after submission
  if (submissionSuccess) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardHeader className="text-center">
            <div className="flex justify-center mb-4">
              <CheckCircle className="h-12 w-12 text-green-500" />
            </div>
            <CardTitle>Assessment Submitted</CardTitle>
            <CardDescription>
              Thank you for completing the assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="bg-muted p-4 rounded-md text-center">
                <p className="text-sm text-muted-foreground mb-1">Your Score</p>
                <h3 className="text-3xl font-bold">
                  {submissionScore?.score}/{submissionScore?.possibleScore}
                </h3>
                <p className="text-lg font-medium">
                  {submissionScore ? Math.round(submissionScore.score / submissionScore.possibleScore * 100) : 0}%
                </p>
              </div>
              
              {assessment.options?.show_quiz_responses && (
                <div className="text-center">
                  <p className="text-sm text-muted-foreground">
                    {assessment.options.show_once_after_attempt 
                      ? "You can now view your responses. This will only be available once."
                      : "You can view your responses below."}
                  </p>
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter className="flex justify-center">
            <Button onClick={() => navigate(-1)}>
              Finish
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Student identification screen
  if (!isStarted) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>{assessment.title}</CardTitle>
            <CardDescription>
              Please enter your information to start the assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {!studentId ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="gr-number">GR Number / Roll Number</Label>
                    <Input
                      id="gr-number"
                      placeholder="Enter your GR Number or Roll Number"
                      value={grNumber}
                      onChange={(e) => setGrNumber(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full" 
                    onClick={verifyStudent}
                    disabled={isVerifying || !grNumber.trim()}
                  >
                    {isVerifying ? "Verifying..." : "Verify"}
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="bg-muted p-4 rounded-md">
                    <h3 className="font-medium mb-2">Student Information</h3>
                    <div className="grid grid-cols-2 gap-2 text-sm">
                      <div className="text-muted-foreground">Name:</div>
                      <div>{studentDetails?.name}</div>
                      
                      <div className="text-muted-foreground">GR Number:</div>
                      <div>{studentDetails?.gr_number}</div>
                      
                      {studentDetails?.roll_number && (
                        <>
                          <div className="text-muted-foreground">Roll Number:</div>
                          <div>{studentDetails.roll_number}</div>
                        </>
                      )}
                    </div>
                  </div>
                  
                  {assessment.restrictions?.require_access_code && (
                    <div className="space-y-2">
                      <Label htmlFor="access-code">Access Code</Label>
                      <Input
                        id="access-code"
                        placeholder="Enter the access code provided by your teacher"
                        value={accessCode}
                        onChange={(e) => setAccessCode(e.target.value)}
                      />
                      <Button 
                        className="w-full mt-2" 
                        onClick={verifyAccessCode}
                        disabled={!accessCode.trim()}
                      >
                        Submit Access Code
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </CardContent>
          <CardFooter>
            {assessment.instructions && (
              <div className="space-y-2 w-full">
                <h3 className="font-medium">Assessment Instructions:</h3>
                <div className="text-sm bg-muted p-3 rounded-md">
                  {assessment.instructions}
                </div>
              </div>
            )}
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Actual assessment screen
  const currentQuestion = questions && questions.length > 0 
    ? questions[currentQuestionIndex] 
    : null;
  
  if (!currentQuestion) {
    return (
      <div className="container mx-auto p-4 max-w-3xl">
        <Card>
          <CardHeader>
            <CardTitle>No Questions Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There are no questions available for this assessment.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => navigate(-1)}>
              Go Back
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // One question at a time or all questions
  const showOneQuestionAtTime = assessment.options?.show_one_question_at_time;
  
  return (
    <div className="container mx-auto p-4 max-w-3xl">
      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>{assessment.title}</CardTitle>
            {assessment.options?.time_limit_enabled && timeRemaining !== null && (
              <div className="flex items-center bg-muted px-3 py-1 rounded-md">
                <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                <span className={`text-sm font-medium ${timeRemaining < 60 ? 'text-red-500' : ''}`}>
                  {formatTime(timeRemaining)}
                </span>
              </div>
            )}
          </div>
          <CardDescription>
            {showOneQuestionAtTime 
              ? `Question ${currentQuestionIndex + 1} of ${questions?.length}`
              : `${questions?.length} Questions • ${assessment.options?.time_limit_enabled 
                ? `${assessment.options.time_limit_minutes} Minutes` 
                : "No Time Limit"}`
            }
          </CardDescription>
        </CardHeader>
        
        <CardContent>
          {showOneQuestionAtTime ? (
            // Show one question at a time
            <div className="space-y-4">
              <div className="text-lg font-medium">{currentQuestion.question_text}</div>
              
              {currentQuestion.question_type === 'multiple_choice' && currentQuestion.options && (
                <RadioGroup 
                  value={answers[currentQuestion.id] || ''} 
                  onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
                >
                  <div className="space-y-2">
                    {currentQuestion.options.map((option, i) => (
                      <div key={i} className="flex items-center space-x-2">
                        <RadioGroupItem value={option} id={`option-${i}`} />
                        <Label htmlFor={`option-${i}`}>{option}</Label>
                      </div>
                    ))}
                  </div>
                </RadioGroup>
              )}
              
              {currentQuestion.question_type === 'text' && (
                <Textarea 
                  placeholder="Type your answer here..." 
                  value={answers[currentQuestion.id] || ''}
                  onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                  className="min-h-[150px]"
                />
              )}
            </div>
          ) : (
            // Show all questions
            <div className="space-y-8">
              {questions?.map((question, index) => (
                <div key={question.id} className="space-y-4">
                  <div className="text-lg font-medium">
                    {index + 1}. {question.question_text}
                  </div>
                  
                  {question.question_type === 'multiple_choice' && question.options && (
                    <RadioGroup 
                      value={answers[question.id] || ''} 
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                    >
                      <div className="space-y-2">
                        {question.options.map((option, i) => (
                          <div key={i} className="flex items-center space-x-2">
                            <RadioGroupItem value={option} id={`q${index}-option-${i}`} />
                            <Label htmlFor={`q${index}-option-${i}`}>{option}</Label>
                          </div>
                        ))}
                      </div>
                    </RadioGroup>
                  )}
                  
                  {question.question_type === 'text' && (
                    <Textarea 
                      placeholder="Type your answer here..." 
                      value={answers[question.id] || ''}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      className="min-h-[100px]"
                    />
                  )}
                  
                  {index < questions.length - 1 && <Separator />}
                </div>
              ))}
            </div>
          )}
        </CardContent>
        
        <CardFooter>
          <div className="w-full flex justify-between">
            {showOneQuestionAtTime ? (
              <>
                <Button 
                  variant="outline" 
                  onClick={handlePrevious}
                  disabled={currentQuestionIndex === 0}
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
                
                {currentQuestionIndex < (questions?.length || 0) - 1 ? (
                  <Button onClick={handleNext}>
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <Button 
                    onClick={handleSubmitAssessment}
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? "Submitting..." : "Submit Assessment"}
                  </Button>
                )}
              </>
            ) : (
              <Button 
                className="w-full" 
                onClick={handleSubmitAssessment}
                disabled={isSubmitting}
              >
                {isSubmitting ? "Submitting..." : "Submit Assessment"}
              </Button>
            )}
          </div>
        </CardFooter>
      </Card>
    </div>
  );
};

export default TakeAssessment;
