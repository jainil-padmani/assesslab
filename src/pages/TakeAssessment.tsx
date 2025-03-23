
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardFooter, 
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { 
  Assessment, 
  AssessmentQuestion, 
  StudentAssessmentAttempt 
} from "@/types/assessments";
import { Student } from "@/types/dashboard";
import { Clock, ArrowRight, ArrowLeft, Send, AlertCircle } from "lucide-react";
import { 
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { format, intervalToDuration } from "date-fns";

enum AssessmentStage {
  STUDENT_VERIFICATION,
  ACCESS_CODE,
  INSTRUCTIONS,
  ASSESSMENT,
  COMPLETE
}

export default function TakeAssessment() {
  const { linkCode } = useParams<{ linkCode: string }>();
  const navigate = useNavigate();
  
  const [stage, setStage] = useState<AssessmentStage>(AssessmentStage.STUDENT_VERIFICATION);
  const [grNumber, setGrNumber] = useState("");
  const [student, setStudent] = useState<Student | null>(null);
  const [accessCode, setAccessCode] = useState("");
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [studentAnswers, setStudentAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<string | null>(null);
  const [isTimeExpired, setIsTimeExpired] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [attemptId, setAttemptId] = useState<string | null>(null);
  
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const startTimeRef = useRef<Date | null>(null);
  
  // Fetch assessment details
  const { data: assessment, isLoading: isAssessmentLoading } = useQuery({
    queryKey: ["public-assessment", linkCode],
    queryFn: async () => {
      if (!linkCode) return null;
      
      const { data, error } = await supabase
        .from("assessments")
        .select("*, subjects(name, subject_code)")
        .eq("link_code", linkCode)
        .eq("status", "published")
        .single();
      
      if (error) {
        toast.error("Assessment not found or no longer available");
        throw error;
      }
      
      // Check if assessment is available
      const now = new Date();
      
      if (data.available_from && new Date(data.available_from) > now) {
        toast.error("This assessment is not available yet");
        throw new Error("Assessment not available yet");
      }
      
      if (data.available_until && new Date(data.available_until) < now) {
        toast.error("This assessment is no longer available");
        throw new Error("Assessment no longer available");
      }
      
      return data as Assessment & { subjects: { name: string, subject_code: string } };
    },
    enabled: !!linkCode
  });
  
  // Fetch assessment questions
  const { data: questions, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ["public-assessment-questions", linkCode],
    queryFn: async () => {
      if (!linkCode || !assessment?.id) return [];
      
      const { data, error } = await supabase
        .from("assessment_questions")
        .select("*")
        .eq("assessment_id", assessment.id)
        .order("order_number");
      
      if (error) {
        toast.error("Failed to load assessment questions");
        throw error;
      }
      
      return data as AssessmentQuestion[];
    },
    enabled: !!linkCode && !!assessment?.id
  });
  
  // Verify student
  const verifyStudentMutation = useMutation({
    mutationFn: async () => {
      if (!grNumber) {
        throw new Error("Please enter your GR Number / Roll Number");
      }
      
      // Find student by GR number or roll number
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .or(`gr_number.eq.${grNumber},roll_number.eq.${grNumber}`)
        .single();
      
      if (error || !data) {
        throw new Error("Student not found. Please check your GR Number / Roll Number");
      }
      
      // Check if student has already completed this assessment
      if (assessment?.id) {
        const { data: existingAttempts, error: attemptsError } = await supabase
          .from("student_assessment_attempts")
          .select("*")
          .eq("assessment_id", assessment.id)
          .eq("student_id", data.id)
          .eq("status", "completed");
          
        if (attemptsError) {
          console.error("Error checking existing attempts:", attemptsError);
        } else if (existingAttempts && existingAttempts.length > 0 && !assessment.allow_multiple_attempts) {
          throw new Error("You have already completed this assessment, and multiple attempts are not allowed");
        }
      }
      
      return data as Student;
    },
    onSuccess: (data) => {
      setStudent(data);
      if (assessment?.access_code) {
        setStage(AssessmentStage.ACCESS_CODE);
      } else {
        setStage(AssessmentStage.INSTRUCTIONS);
      }
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });
  
  // Verify access code
  const verifyAccessCodeMutation = useMutation({
    mutationFn: async () => {
      if (!accessCode) {
        throw new Error("Please enter the access code");
      }
      
      if (accessCode !== assessment?.access_code) {
        throw new Error("Invalid access code");
      }
      
      return true;
    },
    onSuccess: () => {
      setStage(AssessmentStage.INSTRUCTIONS);
    },
    onError: (error: any) => {
      toast.error(error.message);
    }
  });
  
  // Start assessment attempt
  const startAttemptMutation = useMutation({
    mutationFn: async () => {
      if (!assessment?.id || !student?.id) {
        throw new Error("Assessment or student information missing");
      }
      
      // Create a new attempt record
      const { data, error } = await supabase
        .from("student_assessment_attempts")
        .insert({
          assessment_id: assessment.id,
          student_id: student.id,
          start_time: new Date().toISOString(),
          status: "in_progress",
          ip_address: "N/A" // Could be captured if needed
        })
        .select();
        
      if (error) {
        throw error;
      }
      
      return data[0] as StudentAssessmentAttempt;
    },
    onSuccess: (data) => {
      setAttemptId(data.id);
      setStage(AssessmentStage.ASSESSMENT);
      startTimer();
    },
    onError: (error: any) => {
      toast.error(`Failed to start assessment: ${error.message}`);
    }
  });
  
  // Submit answers
  const submitAnswersMutation = useMutation({
    mutationFn: async () => {
      if (!assessment?.id || !student?.id || !attemptId || !questions) {
        throw new Error("Assessment information missing");
      }
      
      const endTime = new Date().toISOString();
      
      // Calculate score for MCQ questions
      let score = 0;
      let maxScore = 0;
      const answers = [];
      
      for (const question of questions) {
        maxScore += question.marks;
        const studentAnswer = studentAnswers[question.id] || "";
        
        let isCorrect = false;
        if (question.question_type === "mcq" && question.correct_answer) {
          isCorrect = studentAnswer === question.correct_answer;
          if (isCorrect) {
            score += question.marks;
          }
        }
        
        // Store student answer
        answers.push({
          attempt_id: attemptId,
          question_id: question.id,
          student_answer: studentAnswer,
          is_correct: question.question_type === "mcq" ? isCorrect : null,
          marks_awarded: question.question_type === "mcq" && isCorrect ? question.marks : null
        });
      }
      
      // Update the attempt
      const percentage = maxScore > 0 ? Math.round((score / maxScore) * 100) : 0;
      
      const { error: attemptError } = await supabase
        .from("student_assessment_attempts")
        .update({
          end_time: endTime,
          status: "completed",
          score,
          max_score: maxScore,
          percentage
        })
        .eq("id", attemptId);
        
      if (attemptError) {
        throw attemptError;
      }
      
      // Store all student answers
      if (answers.length > 0) {
        const { error: answersError } = await supabase
          .from("student_assessment_answers")
          .insert(answers);
          
        if (answersError) {
          throw answersError;
        }
      }
      
      // Create or update the corresponding test grade if the assessment is linked to a test
      if (assessment.test_id) {
        // First check if a test grade already exists
        const { data: existingGrades, error: gradesError } = await supabase
          .from("test_grades")
          .select("*")
          .eq("test_id", assessment.test_id)
          .eq("student_id", student.id);
          
        if (gradesError) {
          console.error("Error checking existing grades:", gradesError);
        } else {
          const gradeData = {
            test_id: assessment.test_id,
            student_id: student.id,
            marks: score,
            remarks: `Assessment score: ${score}/${maxScore} (${percentage}%)`
          };
          
          if (existingGrades && existingGrades.length > 0) {
            // Update existing grade
            const { error: updateError } = await supabase
              .from("test_grades")
              .update(gradeData)
              .eq("id", existingGrades[0].id);
              
            if (updateError) {
              console.error("Error updating test grade:", updateError);
            }
          } else {
            // Create new grade
            const { error: insertError } = await supabase
              .from("test_grades")
              .insert(gradeData);
              
            if (insertError) {
              console.error("Error creating test grade:", insertError);
            }
          }
        }
      }
      
      return { score, maxScore, percentage };
    },
    onSuccess: () => {
      setStage(AssessmentStage.COMPLETE);
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    },
    onError: (error: any) => {
      toast.error(`Failed to submit assessment: ${error.message}`);
    }
  });
  
  const startTimer = () => {
    if (!assessment?.time_limit) return;
    
    startTimeRef.current = new Date();
    const durationInMs = assessment.time_limit * 60 * 1000;
    const endTime = new Date(startTimeRef.current.getTime() + durationInMs);
    
    // Clear existing timer if any
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    // Update timer every second
    timerRef.current = setInterval(() => {
      const now = new Date();
      
      if (now >= endTime) {
        setIsTimeExpired(true);
        setTimeLeft("00:00:00");
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }
        
        // Auto-submit when time expires
        submitAnswersMutation.mutate();
      } else {
        const remaining = intervalToDuration({
          start: now,
          end: endTime
        });
        
        setTimeLeft(
          `${String(remaining.hours).padStart(2, '0')}:${String(remaining.minutes).padStart(2, '0')}:${String(remaining.seconds).padStart(2, '0')}`
        );
      }
    }, 1000);
  };
  
  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);
  
  // Handle answer change
  const handleAnswerChange = (questionId: string, answer: string) => {
    setStudentAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  
  const handleVerifyStudent = (e: React.FormEvent) => {
    e.preventDefault();
    verifyStudentMutation.mutate();
  };
  
  const handleVerifyAccessCode = (e: React.FormEvent) => {
    e.preventDefault();
    verifyAccessCodeMutation.mutate();
  };
  
  const handleStartAssessment = () => {
    startAttemptMutation.mutate();
  };
  
  const handleSubmitAssessment = () => {
    setShowConfirmSubmit(false);
    submitAnswersMutation.mutate();
  };
  
  const navigateToNextQuestion = () => {
    if (currentQuestionIndex < (questions?.length || 0) - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const navigateToPrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  if (isAssessmentLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <p>Loading assessment...</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!assessment) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle>Assessment Not Found</CardTitle>
            <CardDescription>
              The assessment you're looking for doesn't exist or is no longer available.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button 
              className="w-full" 
              onClick={() => navigate("/")}
            >
              Return to Home
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 p-4">
      <Card className="w-full max-w-4xl">
        {stage === AssessmentStage.STUDENT_VERIFICATION && (
          <>
            <CardHeader>
              <CardTitle>{assessment.title}</CardTitle>
              <CardDescription>
                {assessment.subjects?.name} ({assessment.subjects?.subject_code})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyStudent}>
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-medium">Student Verification</h2>
                    <p className="text-sm text-muted-foreground">
                      Please enter your GR Number or Roll Number to continue
                    </p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="grNumber">GR Number / Roll Number</Label>
                    <Input
                      id="grNumber"
                      value={grNumber}
                      onChange={(e) => setGrNumber(e.target.value)}
                      placeholder="Enter your GR Number or Roll Number"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={verifyStudentMutation.isPending}
                  >
                    {verifyStudentMutation.isPending ? "Verifying..." : "Continue"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
        
        {stage === AssessmentStage.ACCESS_CODE && (
          <>
            <CardHeader>
              <CardTitle>{assessment.title}</CardTitle>
              <CardDescription>
                {assessment.subjects?.name} ({assessment.subjects?.subject_code})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleVerifyAccessCode}>
                <div className="space-y-4">
                  <div className="text-center mb-6">
                    <h2 className="text-lg font-medium">Student Verification</h2>
                    <div className="p-4 border rounded-md bg-muted">
                      <div className="font-medium">{student?.name}</div>
                      <div className="text-sm text-muted-foreground">
                        GR: {student?.gr_number} • Roll: {student?.roll_number || "N/A"}
                      </div>
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="accessCode">Access Code</Label>
                    <Input
                      id="accessCode"
                      value={accessCode}
                      onChange={(e) => setAccessCode(e.target.value)}
                      placeholder="Enter the access code provided by your teacher"
                      required
                    />
                  </div>
                  
                  <Button 
                    type="submit" 
                    className="w-full"
                    disabled={verifyAccessCodeMutation.isPending}
                  >
                    {verifyAccessCodeMutation.isPending ? "Verifying..." : "Continue"}
                  </Button>
                </div>
              </form>
            </CardContent>
          </>
        )}
        
        {stage === AssessmentStage.INSTRUCTIONS && (
          <>
            <CardHeader>
              <CardTitle>{assessment.title}</CardTitle>
              <CardDescription>
                {assessment.subjects?.name} ({assessment.subjects?.subject_code})
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 border rounded-md bg-muted">
                  <div className="font-medium">{student?.name}</div>
                  <div className="text-sm text-muted-foreground">
                    GR: {student?.gr_number} • Roll: {student?.roll_number || "N/A"}
                  </div>
                </div>
                
                <div className="space-y-4">
                  <h2 className="text-lg font-medium">Assessment Instructions</h2>
                  
                  {assessment.instructions && (
                    <div className="p-4 border rounded-md">
                      <p>{assessment.instructions}</p>
                    </div>
                  )}
                  
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {assessment.time_limit ? (
                        <div className="flex items-center p-2 bg-muted rounded-md">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>Time Limit: {assessment.time_limit} minutes</span>
                        </div>
                      ) : (
                        <div className="flex items-center p-2 bg-muted rounded-md">
                          <Clock className="h-4 w-4 mr-2" />
                          <span>No time limit</span>
                        </div>
                      )}
                    </div>
                    
                    <div className="text-sm text-muted-foreground">
                      <ul className="list-disc pl-5 space-y-1">
                        <li>Total Questions: {questions?.length || 0}</li>
                        {questions && questions.length > 0 && (
                          <>
                            <li>
                              MCQ Questions: {questions.filter(q => q.question_type === "mcq").length}
                            </li>
                            <li>
                              Theory Questions: {questions.filter(q => q.question_type === "theory").length}
                            </li>
                          </>
                        )}
                        {assessment.shuffle_answers && (
                          <li>Answer options will be shuffled for MCQ questions</li>
                        )}
                        {assessment.one_question_at_time && (
                          <li>Questions will be presented one at a time</li>
                        )}
                      </ul>
                    </div>
                    
                    <Alert>
                      <AlertCircle className="h-4 w-4" />
                      <AlertDescription>
                        Once you start the assessment, the timer will begin. Complete all questions before submitting.
                      </AlertDescription>
                    </Alert>
                  </div>
                </div>
                
                <Button 
                  onClick={handleStartAssessment}
                  className="w-full"
                  disabled={isQuestionsLoading || startAttemptMutation.isPending}
                >
                  {isQuestionsLoading 
                    ? "Loading Questions..." 
                    : startAttemptMutation.isPending 
                      ? "Starting..." 
                      : "Start Assessment"}
                </Button>
              </div>
            </CardContent>
          </>
        )}
        
        {stage === AssessmentStage.ASSESSMENT && questions && (
          <>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>{assessment.title}</CardTitle>
                <CardDescription>
                  {assessment.subjects?.name} ({assessment.subjects?.subject_code})
                </CardDescription>
              </div>
              
              {assessment.time_limit && (
                <div className={`p-2 rounded-md font-mono ${
                  isTimeExpired ? "bg-red-100 text-red-800" : "bg-muted"
                }`}>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2" />
                    <span>{timeLeft || "00:00:00"}</span>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {assessment.one_question_at_time ? (
                // One question at a time mode
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="text-sm font-medium">
                      Question {currentQuestionIndex + 1} of {questions.length}
                    </div>
                    <div className="text-sm">
                      {questions[currentQuestionIndex].marks} {questions[currentQuestionIndex].marks > 1 ? "marks" : "mark"}
                    </div>
                  </div>
                  
                  <div className="p-4 border rounded-md">
                    <p className="font-medium mb-4">{questions[currentQuestionIndex].question_text}</p>
                    
                    {questions[currentQuestionIndex].question_type === "mcq" && 
                     questions[currentQuestionIndex].options && (
                      <div className="space-y-2">
                        {questions[currentQuestionIndex].options.map((option) => (
                          <div key={option.id} className="flex items-center space-x-2">
                            <input
                              type="radio"
                              id={`option-${option.id}`}
                              name={`question-${questions[currentQuestionIndex].id}`}
                              value={option.id}
                              checked={studentAnswers[questions[currentQuestionIndex].id] === option.id}
                              onChange={() => handleAnswerChange(questions[currentQuestionIndex].id, option.id)}
                              className="h-4 w-4"
                            />
                            <Label 
                              htmlFor={`option-${option.id}`}
                              className="cursor-pointer"
                            >
                              {option.text}
                            </Label>
                          </div>
                        ))}
                      </div>
                    )}
                    
                    {questions[currentQuestionIndex].question_type === "theory" && (
                      <Textarea
                        placeholder="Type your answer here..."
                        value={studentAnswers[questions[currentQuestionIndex].id] || ""}
                        onChange={(e) => handleAnswerChange(questions[currentQuestionIndex].id, e.target.value)}
                        rows={6}
                        className="mt-2"
                      />
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <Button
                      variant="outline"
                      onClick={navigateToPrevQuestion}
                      disabled={currentQuestionIndex === 0}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Previous
                    </Button>
                    
                    {currentQuestionIndex < questions.length - 1 ? (
                      <Button
                        onClick={navigateToNextQuestion}
                      >
                        Next
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </Button>
                    ) : (
                      <Button
                        onClick={() => setShowConfirmSubmit(true)}
                      >
                        Submit Assessment
                        <Send className="ml-2 h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              ) : (
                // All questions at once mode
                <div className="space-y-8">
                  {questions.map((question, index) => (
                    <div key={question.id} className="p-4 border rounded-md">
                      <div className="flex items-center justify-between mb-2">
                        <div className="font-medium">Question {index + 1}</div>
                        <div className="text-sm">
                          {question.marks} {question.marks > 1 ? "marks" : "mark"}
                        </div>
                      </div>
                      
                      <p className="mb-4">{question.question_text}</p>
                      
                      {question.question_type === "mcq" && question.options && (
                        <div className="space-y-2 ml-4">
                          {question.options.map((option) => (
                            <div key={option.id} className="flex items-center space-x-2">
                              <input
                                type="radio"
                                id={`option-${question.id}-${option.id}`}
                                name={`question-${question.id}`}
                                value={option.id}
                                checked={studentAnswers[question.id] === option.id}
                                onChange={() => handleAnswerChange(question.id, option.id)}
                                className="h-4 w-4"
                              />
                              <Label 
                                htmlFor={`option-${question.id}-${option.id}`}
                                className="cursor-pointer"
                              >
                                {option.text}
                              </Label>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {question.question_type === "theory" && (
                        <Textarea
                          placeholder="Type your answer here..."
                          value={studentAnswers[question.id] || ""}
                          onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                          rows={4}
                          className="mt-2"
                        />
                      )}
                    </div>
                  ))}
                  
                  <Button
                    onClick={() => setShowConfirmSubmit(true)}
                    className="w-full"
                  >
                    Submit Assessment
                    <Send className="ml-2 h-4 w-4" />
                  </Button>
                </div>
              )}
            </CardContent>
          </>
        )}
        
        {stage === AssessmentStage.COMPLETE && (
          <>
            <CardHeader>
              <CardTitle>Assessment Submitted</CardTitle>
              <CardDescription>
                Thank you for completing the assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-center py-6">
                <div className="text-2xl font-bold mb-2">
                  {submitAnswersMutation.data?.score || 0}/{submitAnswersMutation.data?.maxScore || 0}
                </div>
                <div className="text-lg">
                  Score: {submitAnswersMutation.data?.percentage || 0}%
                </div>
                <p className="text-sm text-muted-foreground mt-4">
                  Submitted on {format(new Date(), "MMM d, yyyy 'at' h:mm a")}
                </p>
              </div>
              
              {assessment.show_responses && assessment.show_responses_timing === 'after_attempt' && (
                <Card>
                  <CardHeader>
                    <CardTitle>Assessment Results</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-center">
                      Your results will be available as per your instructor's settings.
                    </p>
                  </CardContent>
                </Card>
              )}
              
              <Button
                onClick={() => navigate("/")}
                className="w-full"
              >
                Return to Home
              </Button>
            </CardContent>
          </>
        )}
      </Card>
      
      {/* Confirm Submit Dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your assessment? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm">
              {questions && Object.keys(studentAnswers).length === questions.length
                ? "All questions have been answered."
                : `Warning: ${questions ? questions.length - Object.keys(studentAnswers).length : 0} questions are unanswered.`
              }
            </p>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowConfirmSubmit(false)}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmitAssessment}
              disabled={submitAnswersMutation.isPending}
            >
              {submitAnswersMutation.isPending ? "Submitting..." : "Submit"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
