
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, ChevronLeft, ChevronRight, Clock, User } from "lucide-react";
import { fetchAssessmentById, submitAssessmentAttempt } from "@/utils/assessment/assessmentService";
import { Assessment, AssessmentQuestion, StudentAssessmentAnswer } from "@/types/assessments";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const TakeAssessment = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [showTimeWarning, setShowTimeWarning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirmSubmit, setShowConfirmSubmit] = useState(false);
  const [studentId, setStudentId] = useState<string | null>(null);
  const [studentName, setStudentName] = useState("");
  
  // Check if user is logged in
  useEffect(() => {
    const checkUser = async () => {
      const { data } = await supabase.auth.getUser();
      if (data.user) {
        setStudentId(data.user.id);
      }
    };
    
    checkUser();
  }, []);
  
  // Fetch assessment details
  useEffect(() => {
    if (assessmentId) {
      fetchAssessment();
    }
  }, [assessmentId]);
  
  // Initialize timer if time limit is set
  useEffect(() => {
    if (assessment?.options.timeLimit.enabled) {
      const minutes = assessment.options.timeLimit.minutes;
      setTimeLeft(minutes * 60); // Convert to seconds
    }
  }, [assessment]);
  
  // Timer countdown
  useEffect(() => {
    if (timeLeft === null) return;
    
    if (timeLeft <= 300 && !showTimeWarning) { // 5 minutes warning
      setShowTimeWarning(true);
      toast.warning("5 minutes remaining!");
    }
    
    if (timeLeft <= 0) {
      toast.error("Time's up! Your assessment will be submitted.");
      handleSubmit();
      return;
    }
    
    const timerId = setTimeout(() => {
      setTimeLeft(timeLeft - 1);
    }, 1000);
    
    return () => clearTimeout(timerId);
  }, [timeLeft]);
  
  const fetchAssessment = async () => {
    if (!assessmentId) return;
    
    try {
      setLoading(true);
      const data = await fetchAssessmentById(assessmentId);
      
      if (data) {
        setAssessment(data);
        
        // Initialize answers object with empty strings
        if (data.questions && data.questions.length > 0) {
          const initialAnswers: Record<string, string> = {};
          data.questions.forEach(q => {
            initialAnswers[q.id] = '';
          });
          setAnswers(initialAnswers);
        }
      } else {
        toast.error("Assessment not found");
      }
    } catch (error) {
      console.error("Error fetching assessment:", error);
      toast.error("Failed to load assessment");
    } finally {
      setLoading(false);
    }
  };
  
  const handlePrevQuestion = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(currentQuestionIndex - 1);
    }
  };
  
  const handleNextQuestion = () => {
    if (assessment?.questions && currentQuestionIndex < assessment.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    }
  };
  
  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({
      ...prev,
      [questionId]: answer
    }));
  };
  
  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };
  
  const calculateScore = (): [number, number, StudentAssessmentAnswer[]] => {
    if (!assessment?.questions) return [0, 0, []];
    
    let score = 0;
    const possibleScore = assessment.questions.reduce((total, q) => total + q.points, 0);
    
    const assessmentAnswers: StudentAssessmentAnswer[] = assessment.questions.map(question => {
      const userAnswer = answers[question.id] || '';
      const isCorrect = userAnswer.toLowerCase() === question.correctAnswer.toLowerCase();
      
      if (isCorrect) {
        score += question.points;
      }
      
      return {
        questionId: question.id,
        answer: userAnswer,
        isCorrect,
        points: isCorrect ? question.points : 0
      };
    });
    
    return [score, possibleScore, assessmentAnswers];
  };
  
  const handleSubmit = async () => {
    if (!assessment || !assessmentId || !studentId) {
      toast.error("Cannot submit assessment. Missing information.");
      return;
    }
    
    try {
      setIsSubmitting(true);
      setShowConfirmSubmit(false);
      
      // Calculate score
      const [score, possibleScore, studentAnswers] = calculateScore();
      
      // Calculate time spent (in seconds)
      const timeSpent = assessment.options.timeLimit.enabled
        ? (assessment.options.timeLimit.minutes * 60) - (timeLeft || 0)
        : 0;
      
      // Submit the attempt
      await submitAssessmentAttempt({
        assessmentId,
        studentId,
        answers: studentAnswers,
        score,
        possibleScore,
        timeSpent,
        status: 'submitted',
        attemptNumber: 1
      });
      
      toast.success("Assessment submitted successfully!");
      
      // Navigate back to the assessment details
      navigate(`/dashboard/assessments/detail/${assessmentId}`);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast.error("Failed to submit assessment. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  // Render question based on type
  const renderQuestion = (question: AssessmentQuestion) => {
    switch (question.questionType) {
      case 'multiple_choice':
        return (
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            className="space-y-3 mt-4"
          >
            {question.options?.map((option, index) => (
              <div key={index} className="flex items-center space-x-2">
                <RadioGroupItem value={option} id={`option-${index}`} />
                <Label htmlFor={`option-${index}`}>{option}</Label>
              </div>
            ))}
          </RadioGroup>
        );
      
      case 'true_false':
        return (
          <RadioGroup
            value={answers[question.id] || ''}
            onValueChange={(value) => handleAnswerChange(question.id, value)}
            className="space-y-3 mt-4"
          >
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="true" id="true" />
              <Label htmlFor="true">True</Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="false" id="false" />
              <Label htmlFor="false">False</Label>
            </div>
          </RadioGroup>
        );
      
      case 'short_answer':
        return (
          <Input
            placeholder="Your answer"
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="mt-4"
          />
        );
      
      case 'essay':
        return (
          <Textarea
            placeholder="Your answer"
            value={answers[question.id] || ''}
            onChange={(e) => handleAnswerChange(question.id, e.target.value)}
            className="mt-4 min-h-[150px]"
          />
        );
      
      default:
        return (
          <div className="text-muted-foreground mt-4">
            Unknown question type: {question.questionType}
          </div>
        );
    }
  };
  
  if (loading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard/assessments")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <div className="h-8 bg-gray-200 rounded w-1/3 animate-pulse"></div>
        </div>
        
        <Card className="mb-6 animate-pulse">
          <CardHeader>
            <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </CardContent>
        </Card>
      </div>
    );
  }
  
  if (!assessment) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard/assessments")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">Assessment Not Found</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>Assessment Not Found</CardTitle>
            <CardDescription>
              The assessment you're looking for doesn't exist or has been deleted
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/dashboard/assessments")}>
              Back to Assessments
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  // Check if assessment has questions
  if (!assessment.questions || assessment.questions.length === 0) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center gap-2 mb-6">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard/assessments")}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold">{assessment.title}</h1>
        </div>
        
        <Card>
          <CardHeader>
            <CardTitle>No Questions Available</CardTitle>
            <CardDescription>
              This assessment doesn't have any questions yet
            </CardDescription>
          </CardHeader>
          <CardFooter>
            <Button onClick={() => navigate("/dashboard/assessments")}>
              Back to Assessments
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  const currentQuestion = assessment.questions[currentQuestionIndex];
  const progressPercentage = ((currentQuestionIndex + 1) / assessment.questions.length) * 100;
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/dashboard/assessments")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">{assessment.title}</h1>
      </div>
      
      {/* Time remaining */}
      {timeLeft !== null && (
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1">
            <span className="text-sm font-medium">Time Remaining</span>
            <span className={`flex items-center ${timeLeft < 300 ? 'text-red-500 font-bold' : ''}`}>
              <Clock className="h-4 w-4 mr-1" />
              {formatTime(timeLeft)}
            </span>
          </div>
        </div>
      )}
      
      {/* Progress bar */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm">
            Question {currentQuestionIndex + 1} of {assessment.questions.length}
          </span>
          <span className="text-sm">
            {Math.round(progressPercentage)}% Complete
          </span>
        </div>
        <Progress value={progressPercentage} className="h-2" />
      </div>
      
      {/* Question card */}
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Question {currentQuestionIndex + 1}</CardTitle>
          <CardDescription>
            {currentQuestion.points} {currentQuestion.points === 1 ? 'point' : 'points'}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="whitespace-pre-line mb-4">
            {currentQuestion.questionText}
          </div>
          
          {renderQuestion(currentQuestion)}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button 
            variant="outline"
            onClick={handlePrevQuestion}
            disabled={currentQuestionIndex === 0}
          >
            <ChevronLeft className="mr-2 h-4 w-4" />
            Previous
          </Button>
          
          {currentQuestionIndex < assessment.questions.length - 1 ? (
            <Button onClick={handleNextQuestion}>
              Next
              <ChevronRight className="ml-2 h-4 w-4" />
            </Button>
          ) : (
            <Button 
              variant="default" 
              onClick={() => setShowConfirmSubmit(true)}
              disabled={isSubmitting}
            >
              Submit Assessment
            </Button>
          )}
        </CardFooter>
      </Card>
      
      {/* Question navigation */}
      {!assessment.options.showOneQuestionAtTime && (
        <div className="flex flex-wrap gap-2 mb-6">
          {assessment.questions.map((_, index) => (
            <Button
              key={index}
              variant={index === currentQuestionIndex ? "default" : 
                answers[assessment.questions[index].id] ? "outline" : "ghost"}
              size="sm"
              onClick={() => setCurrentQuestionIndex(index)}
              className="w-10 h-10 rounded-full p-0"
            >
              {index + 1}
            </Button>
          ))}
        </div>
      )}
      
      {/* Submit confirmation dialog */}
      <Dialog open={showConfirmSubmit} onOpenChange={setShowConfirmSubmit}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assessment</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your assessment? You won't be able to change your answers after submission.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-2 py-2">
            <p><strong>Questions answered:</strong> {Object.values(answers).filter(a => a).length} of {assessment.questions.length}</p>
            
            {Object.values(answers).some(a => !a) && (
              <Alert variant="warning" className="text-amber-600 bg-amber-50">
                <AlertTitle>Some questions are unanswered</AlertTitle>
                <AlertDescription>
                  You have {assessment.questions.length - Object.values(answers).filter(a => a).length} unanswered questions.
                </AlertDescription>
              </Alert>
            )}
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowConfirmSubmit(false)}
            >
              Continue Working
            </Button>
            <Button 
              variant="default" 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Assessment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TakeAssessment;
