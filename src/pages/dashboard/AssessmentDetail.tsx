
import React, { useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Copy, Download, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Assessment, AssessmentQuestion, StudentAssessmentAttempt } from "@/types/assessments";
import { toast } from "sonner";
import QRCode from "react-qr-code";
import { format } from "date-fns";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Student } from "@/types/dashboard";

export default function AssessmentDetail() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();
  const tabFromQuery = searchParams.get("tab");
  const [activeTab, setActiveTab] = useState(tabFromQuery || "details");
  
  // Fetch assessment details
  const { data: assessment, isLoading: isAssessmentLoading } = useQuery({
    queryKey: ["assessment", assessmentId],
    queryFn: async () => {
      if (!assessmentId) return null;
      
      const { data, error } = await supabase
        .from("assessments")
        .select("*, subjects(*)")
        .eq("id", assessmentId)
        .single();
      
      if (error) {
        toast.error("Failed to load assessment details");
        throw error;
      }
      
      return data as Assessment & { subjects: { name: string, subject_code: string } };
    },
    enabled: !!assessmentId
  });
  
  // Fetch assessment questions
  const { data: questions, isLoading: isQuestionsLoading } = useQuery({
    queryKey: ["assessmentQuestions", assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      const { data, error } = await supabase
        .from("assessment_questions")
        .select("*")
        .eq("assessment_id", assessmentId)
        .order("order_number");
      
      if (error) {
        toast.error("Failed to load assessment questions");
        throw error;
      }
      
      return data as AssessmentQuestion[];
    },
    enabled: !!assessmentId
  });
  
  // Fetch student attempts
  const { data: attempts, isLoading: isAttemptsLoading } = useQuery({
    queryKey: ["assessmentAttempts", assessmentId],
    queryFn: async () => {
      if (!assessmentId) return [];
      
      const { data, error } = await supabase
        .from("student_assessment_attempts")
        .select("*, students(*)")
        .eq("assessment_id", assessmentId)
        .order("created_at", { ascending: false });
      
      if (error) {
        toast.error("Failed to load student attempts");
        throw error;
      }
      
      return data as (StudentAssessmentAttempt & { students: Student })[];
    },
    enabled: !!assessmentId
  });
  
  const copyAssessmentLink = () => {
    if (!assessment?.link_code) return;
    
    const url = `${window.location.origin}/take-assessment/${assessment.link_code}`;
    navigator.clipboard.writeText(url);
    toast.success("Assessment link copied to clipboard");
  };
  
  const publishAssessmentMutation = useMutation({
    mutationFn: async () => {
      if (!assessmentId) throw new Error("Assessment ID is required");
      
      if (!questions || questions.length === 0) {
        throw new Error("You need to add at least one question to publish the assessment");
      }
      
      const linkCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      
      const { error } = await supabase
        .from("assessments")
        .update({
          status: "published",
          link_code: linkCode
        })
        .eq("id", assessmentId);
        
      if (error) throw error;
      
      return linkCode;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["assessment", assessmentId] });
      toast.success("Assessment published successfully");
      setActiveTab("share");
    },
    onError: (error: any) => {
      toast.error(`Failed to publish assessment: ${error.message}`);
    }
  });
  
  if (isAssessmentLoading) {
    return <div className="container mx-auto mt-8">Loading assessment details...</div>;
  }
  
  if (!assessment) {
    return <div className="container mx-auto mt-8">Assessment not found</div>;
  }
  
  const assessmentLink = assessment.link_code 
    ? `${window.location.origin}/take-assessment/${assessment.link_code}`
    : null;
    
  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-3xl font-bold">{assessment.title}</h1>
            <Badge variant={assessment.status === 'published' ? 'success' : 'secondary'}>
              {assessment.status === 'published' ? 'Published' : 'Draft'}
            </Badge>
          </div>
          <p className="text-gray-600 mt-2">
            Subject: {assessment.subjects?.name} ({assessment.subjects?.subject_code})
          </p>
        </div>
        
        {assessment.status === 'draft' && (
          <Button 
            onClick={() => publishAssessmentMutation.mutate()}
            disabled={publishAssessmentMutation.isPending}
          >
            {publishAssessmentMutation.isPending ? 'Publishing...' : 'Publish Assessment'}
          </Button>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="questions">Questions ({questions?.length || 0})</TabsTrigger>
          <TabsTrigger value="results">Results ({attempts?.length || 0})</TabsTrigger>
          {assessment.status === 'published' && (
            <TabsTrigger value="share">Share</TabsTrigger>
          )}
        </TabsList>
        
        <TabsContent value="details" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Title</h3>
                  <p>{assessment.title}</p>
                </div>
                
                {assessment.instructions && (
                  <div>
                    <h3 className="font-medium">Instructions</h3>
                    <p>{assessment.instructions}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium">Created On</h3>
                  <p>{format(new Date(assessment.created_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Last Updated</h3>
                  <p>{format(new Date(assessment.updated_at), "MMM d, yyyy 'at' h:mm a")}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Time Limit</h3>
                  <p>{assessment.time_limit ? `${assessment.time_limit} minutes` : 'No time limit'}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Multiple Attempts</h3>
                  <p>{assessment.allow_multiple_attempts ? 'Allowed' : 'Not allowed'}</p>
                </div>
                
                {assessment.due_date && (
                  <div>
                    <h3 className="font-medium">Due Date</h3>
                    <p>{format(new Date(assessment.due_date), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                
                {assessment.available_from && (
                  <div>
                    <h3 className="font-medium">Available From</h3>
                    <p>{format(new Date(assessment.available_from), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                
                {assessment.available_until && (
                  <div>
                    <h3 className="font-medium">Available Until</h3>
                    <p>{format(new Date(assessment.available_until), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                
                {assessment.access_code && (
                  <div>
                    <h3 className="font-medium">Access Code</h3>
                    <p>{assessment.access_code}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Assessment Options</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <h3 className="font-medium">Shuffle Answers</h3>
                  <p>{assessment.shuffle_answers ? 'Yes' : 'No'}</p>
                </div>
                
                <div>
                  <h3 className="font-medium">Show Student Responses</h3>
                  <p>{assessment.show_responses ? 'Yes' : 'No'}</p>
                </div>
                
                {assessment.show_responses && (
                  <div>
                    <h3 className="font-medium">Show Responses Timing</h3>
                    <p>
                      {assessment.show_responses_timing === 'after_attempt' && 'After each attempt'}
                      {assessment.show_responses_timing === 'after_due_date' && 'After due date'}
                      {assessment.show_responses_timing === 'never' && 'Never'}
                    </p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium">Show Correct Answers</h3>
                  <p>{assessment.show_correct_answers ? 'Yes' : 'No'}</p>
                </div>
                
                {assessment.show_correct_answers && assessment.show_correct_answers_at && (
                  <div>
                    <h3 className="font-medium">Show Correct Answers At</h3>
                    <p>{format(new Date(assessment.show_correct_answers_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                
                {assessment.show_correct_answers && assessment.hide_correct_answers_at && (
                  <div>
                    <h3 className="font-medium">Hide Correct Answers At</h3>
                    <p>{format(new Date(assessment.hide_correct_answers_at), "MMM d, yyyy 'at' h:mm a")}</p>
                  </div>
                )}
                
                <div>
                  <h3 className="font-medium">One Question at a Time</h3>
                  <p>{assessment.one_question_at_time ? 'Yes' : 'No'}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Questions</CardTitle>
            </CardHeader>
            <CardContent>
              {isQuestionsLoading ? (
                <div className="text-center py-4">Loading questions...</div>
              ) : questions && questions.length > 0 ? (
                <div className="space-y-4">
                  {questions.map((question, index) => (
                    <div key={question.id} className="border rounded-md p-4">
                      <div className="flex items-start gap-2 mb-2">
                        <span className="font-medium">Q{index + 1}.</span>
                        <div className="flex-1">
                          <div className="font-medium">{question.question_text}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {question.question_type.toUpperCase()} • {question.marks} {question.marks > 1 ? "marks" : "mark"}
                          </div>
                        </div>
                      </div>
                      
                      {question.question_type === "mcq" && question.options && (
                        <div className="ml-6 mt-2 space-y-1">
                          {question.options.map((option) => (
                            <div key={option.id} className="flex items-center gap-2">
                              <div 
                                className={`h-4 w-4 rounded-full border ${
                                  option.id === question.correct_answer 
                                    ? "bg-primary border-primary" 
                                    : "border-muted-foreground"
                                }`}
                              />
                              <span>{option.text}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {question.question_type === "theory" && question.correct_answer && (
                        <div className="ml-6 mt-2">
                          <div className="text-sm font-medium">Sample Answer:</div>
                          <div className="text-sm text-muted-foreground">{question.correct_answer}</div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No questions added to this assessment</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="results">
          <Card>
            <CardHeader>
              <CardTitle>Student Results</CardTitle>
            </CardHeader>
            <CardContent>
              {isAttemptsLoading ? (
                <div className="text-center py-4">Loading results...</div>
              ) : attempts && attempts.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Score</TableHead>
                      <TableHead>Percentage</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attempts.map((attempt) => (
                      <TableRow key={attempt.id}>
                        <TableCell className="font-medium">
                          {attempt.students?.name || "Unknown student"}
                        </TableCell>
                        <TableCell>
                          {format(new Date(attempt.start_time), "MMM d, yyyy 'at' h:mm a")}
                        </TableCell>
                        <TableCell>
                          <Badge 
                            variant={
                              attempt.status === 'completed' 
                                ? 'success' 
                                : attempt.status === 'in_progress'
                                  ? 'default'
                                  : 'secondary'
                            }
                          >
                            {attempt.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {attempt.score !== null && attempt.max_score !== null
                            ? `${attempt.score}/${attempt.max_score}`
                            : "-"}
                        </TableCell>
                        <TableCell>
                          {attempt.percentage !== null
                            ? `${attempt.percentage}%`
                            : "-"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <div className="text-center py-8">
                  <p className="text-gray-500">No student attempts yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        {assessment.status === 'published' && (
          <TabsContent value="share">
            <Card>
              <CardHeader>
                <CardTitle>Share Assessment</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center space-y-6">
                  {assessmentLink ? (
                    <>
                      <div className="p-4 bg-white">
                        <QRCode value={assessmentLink} />
                      </div>
                      
                      <div className="w-full max-w-md">
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 p-3 border rounded-md bg-muted text-sm overflow-hidden">
                            {assessmentLink}
                          </div>
                          <Button variant="outline" size="icon" onClick={copyAssessmentLink}>
                            <Copy className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                      
                      <div className="text-center max-w-md">
                        <p className="text-muted-foreground text-sm">
                          Share this link or QR code with your students to let them take the assessment. 
                          {assessment.access_code && (
                            <span className="font-medium"> Remember to provide them with the access code: <span className="text-primary">{assessment.access_code}</span></span>
                          )}
                        </p>
                      </div>
                    </>
                  ) : (
                    <div className="text-center py-8">
                      <p className="text-gray-500">This assessment is not published yet</p>
                      <Button 
                        className="mt-4"
                        onClick={() => publishAssessmentMutation.mutate()}
                        disabled={publishAssessmentMutation.isPending}
                      >
                        {publishAssessmentMutation.isPending ? 'Publishing...' : 'Publish Assessment'}
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
