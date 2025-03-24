
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Calendar, Clock, Edit, QrCode, Share, Trash } from "lucide-react";
import { fetchAssessmentById, updateAssessmentStatus } from "@/utils/assessment/assessmentService";
import { Assessment } from "@/types/assessments";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { format } from "date-fns";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { QRCodeSVG } from "qrcode.react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";

const AssessmentDetail = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  
  const [assessment, setAssessment] = useState<Assessment | null>(null);
  const [loading, setLoading] = useState(true);
  const [subjectName, setSubjectName] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  
  useEffect(() => {
    if (assessmentId) {
      fetchAssessment();
    }
  }, [assessmentId]);
  
  useEffect(() => {
    if (assessment) {
      fetchSubjectDetails();
      // Create share URL
      const baseUrl = window.location.origin;
      setShareUrl(`${baseUrl}/dashboard/assessments/take/${assessmentId}`);
    }
  }, [assessment]);
  
  const fetchAssessment = async () => {
    if (!assessmentId) return;
    
    try {
      setLoading(true);
      const data = await fetchAssessmentById(assessmentId);
      
      if (data) {
        setAssessment(data);
      } else {
        toast.error("Assessment not found");
      }
    } catch (error) {
      console.error("Error fetching assessment:", error);
      toast.error("Failed to load assessment details");
    } finally {
      setLoading(false);
    }
  };
  
  const fetchSubjectDetails = async () => {
    if (!assessment) return;
    
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', assessment.subjectId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setSubjectName(data.name);
      }
    } catch (error) {
      console.error("Error fetching subject details:", error);
    }
  };
  
  const handleStatusChange = async (status: Assessment['status']) => {
    if (!assessmentId) return;
    
    try {
      await updateAssessmentStatus(assessmentId, status);
      
      // Update local state
      if (assessment) {
        setAssessment({
          ...assessment,
          status,
        });
      }
      
      toast.success(`Assessment ${status === 'published' ? 'published' : 'archived'} successfully`);
    } catch (error) {
      console.error("Error updating assessment status:", error);
      toast.error("Failed to update assessment status");
    }
  };
  
  const copyToClipboard = () => {
    navigator.clipboard.writeText(shareUrl)
      .then(() => {
        toast.success("Link copied to clipboard");
      })
      .catch(() => {
        toast.error("Failed to copy link");
      });
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
        
        <Badge variant={
          assessment.status === 'draft' ? 'outline' :
          assessment.status === 'published' ? 'success' :
          'secondary'
        } className="ml-2">
          {assessment.status.charAt(0).toUpperCase() + assessment.status.slice(1)}
        </Badge>
      </div>
      
      <div className="flex justify-between items-start mb-6">
        <div>
          <p className="text-muted-foreground">
            Subject: {subjectName}
          </p>
          <p className="text-muted-foreground text-sm">
            Created: {assessment.createdAt ? format(new Date(assessment.createdAt), 'PPP') : 'N/A'}
          </p>
        </div>
        
        <div className="flex gap-2">
          {assessment.status === 'published' && (
            <Dialog>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Share className="mr-2 h-4 w-4" />
                  Share
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Share Assessment</DialogTitle>
                  <DialogDescription>
                    Share this assessment with students using the QR code or link
                  </DialogDescription>
                </DialogHeader>
                
                <div className="flex flex-col items-center justify-center py-4">
                  <QRCodeSVG value={shareUrl} size={200} />
                </div>
                
                <div className="flex items-center space-x-2">
                  <div className="grid flex-1 gap-2">
                    <Label htmlFor="link">Link</Label>
                    <Input
                      id="link"
                      value={shareUrl}
                      readOnly
                    />
                  </div>
                  <Button onClick={copyToClipboard} type="button" size="sm" className="px-3">
                    <span className="sr-only">Copy</span>
                    Copy
                  </Button>
                </div>
                
                <DialogFooter className="sm:justify-start">
                  <Button 
                    variant="secondary"
                    onClick={() => navigate(`/dashboard/assessments/take/${assessmentId}`)}
                  >
                    Preview Assessment
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
          
          <Button variant="outline">
            <Edit className="mr-2 h-4 w-4" />
            Edit
          </Button>
          
          {assessment.status === 'draft' ? (
            <Button 
              variant="default"
              onClick={() => handleStatusChange('published')}
            >
              Publish
            </Button>
          ) : (
            <Button 
              variant="destructive"
              onClick={() => handleStatusChange('archived')}
            >
              Archive
            </Button>
          )}
        </div>
      </div>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList>
          <TabsTrigger value="details">Details</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="responses">Responses</TabsTrigger>
        </TabsList>
        
        <TabsContent value="details">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Details</CardTitle>
              <CardDescription>
                Settings and configuration for this assessment
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-2">Instructions</h3>
                <p className="text-muted-foreground whitespace-pre-line">
                  {assessment.instructions || "No instructions provided"}
                </p>
              </div>
              
              <Separator />
              
              <div>
                <h3 className="text-lg font-medium mb-4">Settings</h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <h4 className="font-medium">Options</h4>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Shuffle Answers:</span>
                        <span>{assessment.options.shuffleAnswers ? "Yes" : "No"}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Time Limit:</span>
                        <span>
                          {assessment.options.timeLimit.enabled ? (
                            <div className="flex items-center">
                              <Clock className="mr-1 h-4 w-4" />
                              {assessment.options.timeLimit.minutes} minutes
                            </div>
                          ) : "No limit"}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Multiple Attempts:</span>
                        <span>{assessment.options.allowMultipleAttempts ? "Allowed" : "Not allowed"}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Show Student Responses:</span>
                        <span>{assessment.options.showResponses ? "Yes" : "No"}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Show Correct Answers:</span>
                        <span>{assessment.options.showCorrectAnswers ? "Yes" : "No"}</span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Show One Question at a Time:</span>
                        <span>{assessment.options.showOneQuestionAtTime ? "Yes" : "No"}</span>
                      </li>
                    </ul>
                  </div>
                  
                  <div className="space-y-2">
                    <h4 className="font-medium">Restrictions</h4>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Access Code Required:</span>
                        <span>{assessment.restrictions.requireAccessCode ? "Yes" : "No"}</span>
                      </li>
                      {assessment.restrictions.requireAccessCode && (
                        <li className="flex justify-between">
                          <span className="text-muted-foreground">Access Code:</span>
                          <code className="bg-muted px-2 py-1 rounded">
                            {assessment.restrictions.accessCode}
                          </code>
                        </li>
                      )}
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">IP Address Filtering:</span>
                        <span>{assessment.restrictions.filterIpAddresses ? "Enabled" : "Disabled"}</span>
                      </li>
                    </ul>
                    
                    <h4 className="font-medium mt-4">Dates</h4>
                    <ul className="space-y-2">
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Due Date:</span>
                        <span>
                          {assessment.dueDate ? (
                            <div className="flex items-center">
                              <Calendar className="mr-1 h-4 w-4" />
                              {format(new Date(assessment.dueDate), "PPP")}
                            </div>
                          ) : "No due date"}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Available From:</span>
                        <span>
                          {assessment.availableFrom ? format(new Date(assessment.availableFrom), "PPP") : "Always available"}
                        </span>
                      </li>
                      <li className="flex justify-between">
                        <span className="text-muted-foreground">Available Until:</span>
                        <span>
                          {assessment.availableUntil ? format(new Date(assessment.availableUntil), "PPP") : "No end date"}
                        </span>
                      </li>
                    </ul>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="questions">
          <Card>
            <CardHeader>
              <CardTitle>Assessment Questions</CardTitle>
              <CardDescription>
                Questions included in this assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              {assessment.questions && assessment.questions.length > 0 ? (
                <div className="space-y-4">
                  {assessment.questions.map((question, index) => (
                    <Card key={question.id}>
                      <CardHeader className="pb-2">
                        <div className="flex justify-between">
                          <CardTitle className="text-base">Question {index + 1}</CardTitle>
                          <Badge>{question.questionType}</Badge>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <p className="whitespace-pre-line">{question.questionText}</p>
                        
                        {question.options && question.options.length > 0 && (
                          <div className="mt-2">
                            <h4 className="text-sm font-medium mb-1">Options:</h4>
                            <ul className="list-disc list-inside space-y-1">
                              {question.options.map((option, i) => (
                                <li key={i} className={option === question.correctAnswer ? "font-medium" : ""}>
                                  {option}
                                  {option === question.correctAnswer && " (Correct)"}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                        
                        <div className="flex justify-between mt-2 text-sm text-muted-foreground">
                          <span>Points: {question.points}</span>
                          <span>Correct answer: {question.correctAnswer}</span>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-10">
                  <p className="text-muted-foreground">No questions added to this assessment yet</p>
                  <Button variant="outline" className="mt-4">
                    Add Questions
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="responses">
          <Card>
            <CardHeader>
              <CardTitle>Student Responses</CardTitle>
              <CardDescription>
                View all student attempts for this assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-10">
                <p className="text-muted-foreground">
                  No student responses yet
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default AssessmentDetail;
