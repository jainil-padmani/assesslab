
import React, { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import { fetchAssessmentDetails, fetchAssessmentQuestions } from "@/utils/assessment/assessmentManager";
import { ArrowLeft, Calendar, Clock, Copy, Link, QrCode, Users } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";
import QRCode from "qrcode.react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

const AssessmentDetail = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  
  const [qrModalOpen, setQrModalOpen] = useState(false);
  const [attemptViewModalOpen, setAttemptViewModalOpen] = useState(false);
  const [selectedAttempt, setSelectedAttempt] = useState<any>(null);
  
  // Fetch assessment details
  const { data: assessment, isLoading: isLoadingDetails, error: detailsError } = useQuery({
    queryKey: ["assessment-details", assessmentId],
    queryFn: () => fetchAssessmentDetails(assessmentId!),
    enabled: !!assessmentId
  });
  
  // Fetch assessment questions
  const { data: questions, isLoading: isLoadingQuestions, error: questionsError } = useQuery({
    queryKey: ["assessment-questions", assessmentId],
    queryFn: () => fetchAssessmentQuestions(assessmentId!),
    enabled: !!assessmentId
  });
  
  // Fetch student attempts
  const { data: attempts, isLoading: isLoadingAttempts } = useQuery({
    queryKey: ["assessment-attempts", assessmentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('student_assessment_attempts')
        .select(`
          id, 
          student_id, 
          score, 
          possible_score, 
          status, 
          submitted_at, 
          time_spent,
          students(name, gr_number)
        `)
        .eq('assessment_id', assessmentId!)
        .order('submitted_at', { ascending: false });
        
      if (error) throw error;
      return data || [];
    },
    enabled: !!assessmentId
  });
  
  // Generate link for assessment
  const assessmentLink = `${window.location.origin}/dashboard/assessments/take/${assessmentId}`;
  
  const handleBackClick = () => {
    if (assessment?.subject_id) {
      navigate(`/dashboard/assessments/subject/${assessment.subject_id}`);
    } else {
      navigate("/dashboard/assessments");
    }
  };
  
  const copyLink = () => {
    navigator.clipboard.writeText(assessmentLink);
    toast.success("Link copied to clipboard!");
  };
  
  const showQrCode = () => {
    setQrModalOpen(true);
  };
  
  const viewAttemptDetails = (attempt: any) => {
    setSelectedAttempt(attempt);
    setAttemptViewModalOpen(true);
  };
  
  // Format date function
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      return format(new Date(dateString), "MMM dd, yyyy h:mm a");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  // Format time spent
  const formatTimeSpent = (seconds: number) => {
    if (!seconds) return "N/A";
    
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    
    if (minutes === 0) {
      return `${remainingSeconds} sec`;
    } else if (remainingSeconds === 0) {
      return `${minutes} min`;
    } else {
      return `${minutes} min ${remainingSeconds} sec`;
    }
  };
  
  // Loading state
  if (isLoadingDetails || isLoadingQuestions) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={handleBackClick} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Loading Assessment...</h1>
        </div>
        <div className="animate-pulse space-y-4">
          <div className="h-8 w-3/4 bg-gray-200 rounded"></div>
          <div className="h-4 w-1/2 bg-gray-200 rounded"></div>
          <div className="h-64 bg-gray-200 rounded mt-6"></div>
        </div>
      </div>
    );
  }
  
  // Error state
  if (detailsError || questionsError) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={handleBackClick} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Error Loading Assessment</h1>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error</CardTitle>
          </CardHeader>
          <CardContent>
            <p>
              There was a problem loading the assessment. Please try again later.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center mb-6">
        <Button variant="ghost" onClick={handleBackClick} className="mr-4">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{assessment?.title || "Assessment Details"}</h1>
          <p className="text-muted-foreground">
            {assessment?.status === "published" ? "Published" : "Draft"} • Created on {formatDate(assessment?.created_at || '')}
          </p>
        </div>
      </div>
      
      <div className="flex flex-col md:flex-row gap-6">
        {/* Main content */}
        <div className="w-full md:w-2/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Overview</CardTitle>
              <CardDescription>Review the assessment details and questions</CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="details" className="w-full">
                <TabsList className="mb-4">
                  <TabsTrigger value="details">Details</TabsTrigger>
                  <TabsTrigger value="questions">
                    Questions ({questions?.length || 0})
                  </TabsTrigger>
                  <TabsTrigger value="results">
                    Results ({attempts?.length || 0})
                  </TabsTrigger>
                </TabsList>
                
                <TabsContent value="details">
                  <div className="space-y-6">
                    <div>
                      <h3 className="text-lg font-medium mb-2">Instructions</h3>
                      <div className="text-sm bg-muted p-4 rounded-md">
                        {assessment?.instructions || "No instructions provided."}
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <h3 className="text-lg font-medium mb-3">Assessment Options</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Shuffle Answers:</span>
                            <span>{assessment?.options?.shuffle_answers ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Time Limit:</span>
                            <span>
                              {assessment?.options?.time_limit_enabled 
                                ? `${assessment.options.time_limit_minutes} minutes` 
                                : "No limit"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Multiple Attempts:</span>
                            <span>{assessment?.options?.allow_multiple_attempts ? "Allowed" : "Not allowed"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Show Quiz Responses:</span>
                            <span>{assessment?.options?.show_quiz_responses ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Show Once After Attempt:</span>
                            <span>{assessment?.options?.show_once_after_attempt ? "Yes" : "No"}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Show Correct Answers:</span>
                            <span>{assessment?.options?.show_correct_answers ? "Yes" : "No"}</span>
                          </div>
                          {assessment?.options?.show_correct_answers && (
                            <>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Show Correct At:</span>
                                <span>
                                  {assessment.options.show_correct_answers_at 
                                    ? formatDate(assessment.options.show_correct_answers_at) 
                                    : "Immediately"}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-muted-foreground">Hide Correct At:</span>
                                <span>
                                  {assessment.options.hide_correct_answers_at 
                                    ? formatDate(assessment.options.hide_correct_answers_at) 
                                    : "Never"}
                                </span>
                              </div>
                            </>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">One Question at a Time:</span>
                            <span>{assessment?.options?.show_one_question_at_time ? "Yes" : "No"}</span>
                          </div>
                        </div>
                      </div>
                      
                      <div>
                        <h3 className="text-lg font-medium mb-3">Restrictions & Availability</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Access Code Required:</span>
                            <span>{assessment?.restrictions?.require_access_code ? "Yes" : "No"}</span>
                          </div>
                          {assessment?.restrictions?.require_access_code && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Access Code:</span>
                              <span className="font-mono bg-muted px-2 py-0.5 rounded">
                                {assessment.restrictions.access_code}
                              </span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">IP Restriction:</span>
                            <span>{assessment?.restrictions?.filter_ip ? "Yes" : "No"}</span>
                          </div>
                          {assessment?.restrictions?.filter_ip && (
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Allowed IP:</span>
                              <span className="font-mono">
                                {assessment.restrictions.filter_ip_address}
                              </span>
                            </div>
                          )}
                          <Separator className="my-2" />
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Due Date:</span>
                            <span>
                              {assessment?.due_date 
                                ? formatDate(assessment.due_date) 
                                : "No due date"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Available From:</span>
                            <span>
                              {assessment?.available_from 
                                ? formatDate(assessment.available_from) 
                                : "Immediately"}
                            </span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-muted-foreground">Available Until:</span>
                            <span>
                              {assessment?.available_until 
                                ? formatDate(assessment.available_until) 
                                : "No end date"}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </TabsContent>
                
                <TabsContent value="questions">
                  <ScrollArea className="h-[500px] pr-4">
                    {questions && questions.length > 0 ? (
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
                                Points: {question.points || 1}
                              </div>
                            </CardFooter>
                          </Card>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p>No questions found for this assessment.</p>
                      </div>
                    )}
                  </ScrollArea>
                </TabsContent>
                
                <TabsContent value="results">
                  {isLoadingAttempts ? (
                    <div className="text-center py-8">
                      <p>Loading student attempts...</p>
                    </div>
                  ) : attempts && attempts.length > 0 ? (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Total Attempts</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">{attempts.length}</p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Average Score</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">
                              {attempts.length > 0 
                                ? Math.round((attempts.reduce((sum, a) => sum + (a.score / a.possible_score * 100), 0) / attempts.length) * 10) / 10
                                : 0}%
                            </p>
                          </CardContent>
                        </Card>
                        
                        <Card>
                          <CardHeader className="pb-2">
                            <CardTitle className="text-sm">Completion Rate</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <p className="text-2xl font-bold">
                              {attempts.filter(a => a.status === 'completed').length} / {attempts.length}
                            </p>
                          </CardContent>
                        </Card>
                      </div>
                      
                      <div className="rounded-md border">
                        <div className="grid grid-cols-5 bg-muted p-3 text-sm font-medium">
                          <div className="col-span-2">Student</div>
                          <div className="text-center">Score</div>
                          <div className="text-center">Time Spent</div>
                          <div className="text-center">Submitted</div>
                        </div>
                        <div className="divide-y">
                          {attempts.map((attempt) => (
                            <div 
                              key={attempt.id}
                              className="grid grid-cols-5 p-3 text-sm hover:bg-muted/50 cursor-pointer"
                              onClick={() => viewAttemptDetails(attempt)}
                            >
                              <div className="col-span-2">
                                <div className="font-medium">{attempt.students.name}</div>
                                <div className="text-muted-foreground">{attempt.students.gr_number}</div>
                              </div>
                              <div className="text-center self-center">
                                {attempt.score}/{attempt.possible_score} ({Math.round(attempt.score / attempt.possible_score * 100)}%)
                              </div>
                              <div className="text-center self-center">
                                {formatTimeSpent(attempt.time_spent)}
                              </div>
                              <div className="text-center self-center">
                                {formatDate(attempt.submitted_at)}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <p>No students have taken this assessment yet.</p>
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>
        
        {/* Sidebar */}
        <div className="w-full md:w-1/3 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Share Assessment</CardTitle>
              <CardDescription>
                Generate links and QR codes for students to access this assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex flex-col space-y-2">
                <div className="bg-muted p-2 rounded-md flex items-center justify-between">
                  <div className="text-sm truncate max-w-[180px]">
                    {assessmentLink}
                  </div>
                  <Button size="sm" variant="ghost" onClick={copyLink}>
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
                <div className="text-xs text-muted-foreground">
                  Share this link with students to take the assessment
                </div>
              </div>
            </CardContent>
            <CardFooter className="flex flex-col space-y-2">
              <Button className="w-full" onClick={copyLink}>
                <Link className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <Button variant="outline" className="w-full" onClick={showQrCode}>
                <QrCode className="h-4 w-4 mr-2" />
                Show QR Code
              </Button>
            </CardFooter>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Assessment Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center text-sm">
                  <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground mr-2">Due:</span>
                  <span>{assessment?.due_date ? formatDate(assessment.due_date) : "No due date"}</span>
                </div>
                <div className="flex items-center text-sm">
                  <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground mr-2">Time Limit:</span>
                  <span>
                    {assessment?.options?.time_limit_enabled 
                      ? `${assessment.options.time_limit_minutes} minutes` 
                      : "No limit"}
                  </span>
                </div>
                <div className="flex items-center text-sm">
                  <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                  <span className="text-muted-foreground mr-2">Attempts:</span>
                  <span>{attempts ? attempts.length : 0}</span>
                </div>
              </div>
            </CardContent>
            <CardFooter>
              <Button variant="outline" className="w-full" onClick={() => navigate(`/dashboard/assessments/take/${assessmentId}`)}>
                Preview Assessment
              </Button>
            </CardFooter>
          </Card>
        </div>
      </div>
      
      {/* QR Code Modal */}
      <Dialog open={qrModalOpen} onOpenChange={setQrModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Assessment QR Code</DialogTitle>
            <DialogDescription>
              Students can scan this QR code to access the assessment
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-center py-4">
            <div className="p-4 bg-white rounded-md">
              <QRCode value={assessmentLink} size={200} />
            </div>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" onClick={() => setQrModalOpen(false)}>
              Close
            </Button>
            <Button onClick={copyLink}>
              Copy Link
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      
      {/* Student Attempt Detail Modal */}
      <Dialog open={attemptViewModalOpen} onOpenChange={setAttemptViewModalOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Attempt Details</DialogTitle>
            <DialogDescription>
              {selectedAttempt?.students?.name} - {formatDate(selectedAttempt?.submitted_at)}
            </DialogDescription>
          </DialogHeader>
          {selectedAttempt && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Score</p>
                  <p className="font-medium">
                    {selectedAttempt.score}/{selectedAttempt.possible_score} ({Math.round(selectedAttempt.score / selectedAttempt.possible_score * 100)}%)
                  </p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Time Spent</p>
                  <p className="font-medium">{formatTimeSpent(selectedAttempt.time_spent)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-sm text-muted-foreground">Status</p>
                  <p className="font-medium capitalize">{selectedAttempt.status}</p>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h3 className="font-medium">Student Answers</h3>
                {/* This would show the student's answers with correct/incorrect marking */}
                <p className="text-sm text-muted-foreground">
                  Detailed student answers will be displayed here
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AssessmentDetail;
