import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { DateTimePicker } from "@/components/DateTimePicker";
import { Switch } from "@/components/ui/switch";
// Import Loader2 from lucide-react
import { ArrowLeft, Plus, Settings, Trash, Download, Clock, FileText, Users, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAssessmentDetail } from "@/hooks/useAssessmentDetail";
import { AssessmentQuestion } from "@/types/assessments";

export default function AssessmentDetail() {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const [isEditMode, setIsEditMode] = useState(false);
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newQuestionType, setNewQuestionType] = useState<'multiple_choice' | 'short_answer' | 'essay' | 'true_false'>('multiple_choice');
  const [newQuestionPoints, setNewQuestionPoints] = useState<number>(1);
  const [newQuestionOptions, setNewQuestionOptions] = useState<string[]>([]);
  const [newQuestionCorrectAnswer, setNewQuestionCorrectAnswer] = useState("");
  const [newQuestionOrder, setNewQuestionOrder] = useState<number>(0);

  const { 
    assessment, 
    questions,
    isLoading: assessmentLoading,
    fetchAssessment,
    updateAssessment,
    deleteAssessment,
    createQuestion,
    updateQuestion,
    deleteQuestion,
    isLoading,
    error
  } = useAssessmentDetail(assessmentId);

  useEffect(() => {
    if (error) {
      toast.error(error.message);
    }
  }, [error]);

  const handleGoBack = () => {
    navigate("/dashboard/assessments");
  };

  const handleEditToggle = () => {
    setIsEditMode(!isEditMode);
  };

  const handleAssessmentUpdate = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!assessment) return;

    const form = e.currentTarget;
    const formData = new FormData(form);

    const updatedAssessmentData = {
      title: formData.get("title") as string,
      instructions: formData.get("instructions") as string,
      options: {
        shuffleAnswers: formData.get("shuffleAnswers") === "on",
        timeLimit: {
          enabled: formData.get("timeLimitEnabled") === "on",
          minutes: parseInt(formData.get("timeLimitMinutes") as string),
        },
        allowMultipleAttempts: formData.get("allowMultipleAttempts") === "on",
        showResponses: formData.get("showResponses") === "on",
        showResponsesOnlyOnce: formData.get("showResponsesOnlyOnce") === "on",
        showCorrectAnswers: formData.get("showCorrectAnswers") === "on",
        showCorrectAnswersAt: formData.get("showCorrectAnswersAt") as string | null,
        hideCorrectAnswersAt: formData.get("hideCorrectAnswersAt") as string | null,
        showOneQuestionAtTime: formData.get("showOneQuestionAtTime") === "on",
      },
      restrictions: {
        requireAccessCode: formData.get("requireAccessCode") === "on",
        accessCode: formData.get("accessCode") as string | null,
        filterIpAddresses: formData.get("filterIpAddresses") === "on",
        allowedIpAddresses: (formData.get("allowedIpAddresses") as string)?.split(",").map((ip) => ip.trim()) || null,
      },
      assignTo: (formData.get("assignTo") as string)?.split(",").map((id) => id.trim()) || null,
      dueDate: formData.get("dueDate") as string | null,
      availableFrom: formData.get("availableFrom") as string | null,
      availableUntil: formData.get("availableUntil") as string | null,
      status: formData.get("status") as "draft" | "published" | "archived",
    };

    try {
      if (assessment) {
        await updateAssessment(assessment.id, updatedAssessmentData);
        toast.success("Assessment updated successfully");
        setIsEditMode(false);
      }
    } catch (error) {
      console.error("Error updating assessment:", error);
      toast.error("Failed to update assessment");
    }
  };

  const handleDeleteAssessment = async () => {
    if (!assessment) return;
    try {
      await deleteAssessment(assessment.id);
      toast.success("Assessment deleted successfully");
      navigate("/dashboard/assessments");
    } catch (error) {
      console.error("Error deleting assessment:", error);
      toast.error("Failed to delete assessment");
    }
  };

  const handleCreateQuestion = async () => {
    if (!assessment) return;

    const newQuestionData = {
      assessmentId: assessment.id,
      questionText: newQuestionText,
      questionType: newQuestionType,
      options: newQuestionOptions,
      correctAnswer: newQuestionCorrectAnswer,
      points: newQuestionPoints,
      questionOrder: newQuestionOrder,
    };

    try {
      await createQuestion(newQuestionData);
      toast.success("Question created successfully");
      setNewQuestionText("");
      setNewQuestionType("multiple_choice");
      setNewQuestionOptions([]);
      setNewQuestionCorrectAnswer("");
      setNewQuestionPoints(1);
      setNewQuestionOrder(0);
    } catch (error) {
      console.error("Error creating question:", error);
      toast.error("Failed to create question");
    }
  };

  const handleUpdateQuestion = async (questionId: string, updatedQuestionData: Partial<AssessmentQuestion>) => {
    try {
      await updateQuestion(questionId, updatedQuestionData);
      toast.success("Question updated successfully");
    } catch (error) {
      console.error("Error updating question:", error);
      toast.error("Failed to update question");
    }
  };

  const handleDeleteQuestion = async (questionId: string) => {
    try {
      await deleteQuestion(questionId);
      toast.success("Question deleted successfully");
    } catch (error) {
      console.error("Error deleting question:", error);
      toast.error("Failed to delete question");
    }
  };

  if (!assessmentId) {
    return <div className="text-center py-12">Assessment ID is required</div>;
  }

  // Fix the reference to refetchAssessment by ensuring it's properly used from the hook
  

  const renderAssessmentDetails = () => {
    if (assessmentLoading) {
      return (
        
          
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          
        
      );
    }

    if (!assessment) {
      return <div className="text-center py-12">Assessment not found</div>;
    }

    return (
      
        
          
            
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Assessments
            
          
          
            
              Assessment Details
            
            
              Manage assessment settings and questions.
            
          
          
            
              
                
                  
                    
                      Title
                    
                    
                      {assessment.title}
                    
                  
                  
                    
                      Instructions
                    
                    
                      {assessment.instructions || "No instructions provided."}
                    
                  
                
                
                  
                    
                      Shuffle Answers
                    
                    
                      {assessment.options.shuffleAnswers ? "Yes" : "No"}
                    
                  
                  
                    
                      Time Limit
                    
                    
                      {assessment.options.timeLimit.enabled
                        ? `${assessment.options.timeLimit.minutes} minutes`
                        : "No time limit"}
                    
                  
                  
                    
                      Allow Multiple Attempts
                    
                    
                      {assessment.options.allowMultipleAttempts ? "Yes" : "No"}
                    
                  
                  
                    
                      Show Responses
                    
                    
                      {assessment.options.showResponses ? "Yes" : "No"}
                    
                  
                  
                    
                      Show Responses Only Once
                    
                    
                      {assessment.options.showResponsesOnlyOnce ? "Yes" : "No"}
                    
                  
                  
                    
                      Show Correct Answers
                    
                    
                      {assessment.options.showCorrectAnswers ? "Yes" : "No"}
                    
                  
                  
                    
                      Show Correct Answers At
                    
                    
                      {assessment.options.showCorrectAnswersAt || "Immediately"}
                    
                  
                  
                    
                      Hide Correct Answers At
                    
                    
                      {assessment.options.hideCorrectAnswersAt || "Never"}
                    
                  
                  
                    
                      Show One Question At Time
                    
                    
                      {assessment.options.showOneQuestionAtTime ? "Yes" : "No"}
                    
                  
                
                
                  
                    
                      Require Access Code
                    
                    
                      {assessment.restrictions.requireAccessCode ? "Yes" : "No"}
                    
                  
                  
                    
                      Access Code
                    
                    
                      {assessment.restrictions.accessCode || "No access code"}
                    
                  
                  
                    
                      Filter IP Addresses
                    
                    
                      {assessment.restrictions.filterIpAddresses ? "Yes" : "No"}
                    
                  
                  
                    
                      Allowed IP Addresses
                    
                    
                      {assessment.restrictions.allowedIpAddresses?.join(", ") || "No IP restrictions"}
                    
                  
                
                
                  
                    
                      Assign To
                    
                    
                      {assessment.assignTo?.join(", ") || "Not assigned"}
                    
                  
                  
                    
                      Due Date
                    
                    
                      {assessment.dueDate || "No due date"}
                    
                  
                  
                    
                      Available From
                    
                    
                      {assessment.availableFrom || "Immediately"}
                    
                  
                  
                    
                      Available Until
                    
                    
                      {assessment.availableUntil || "No end date"}
                    
                  
                
              
            
          
        
      
    );
  };

  const renderAssessmentEditForm = () => {
    if (assessmentLoading) {
      return (
        
          
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          
        
      );
    }

    if (!assessment) {
      return <div className="text-center py-12">Assessment not found</div>;
    }

    return (
      
        
          
            
              
                
                  
                    Title
                  
                  
                    
                  
                
                
                  
                    Instructions
                  
                  
                    
                  
                
              
            
            
              
                
                  
                    Shuffle Answers
                  
                  
                    
                  
                
                
                  
                    Time Limit
                  
                  
                    
                      
                        Enable Time Limit
                      
                      
                        
                      
                    
                    
                      
                        Minutes
                      
                      
                        
                      
                    
                  
                
                
                  
                    Allow Multiple Attempts
                  
                  
                    
                  
                
                
                  
                    Show Responses
                  
                  
                    
                  
                
                
                  
                    Show Responses Only Once
                  
                  
                    
                  
                
                
                  
                    Show Correct Answers
                  
                  
                    
                  
                
                
                  
                    Show Correct Answers At
                  
                  
                    
                      
                        Show Correct Answers At
                      
                      
                        
                      
                    
                  
                
                
                  
                    Hide Correct Answers At
                  
                  
                    
                      
                        Hide Correct Answers At
                      
                      
                        
                      
                    
                  
                
                
                  
                    Show One Question At Time
                  
                  
                    
                  
                
              
            
            
              
                
                  
                    Require Access Code
                  
                  
                    
                  
                
                
                  
                    Access Code
                  
                  
                    
                  
                
                
                  
                    Filter IP Addresses
                  
                  
                    
                  
                
                
                  
                    Allowed IP Addresses
                  
                  
                    
                  
                
              
            
            
              
                
                  
                    Assign To
                  
                  
                    
                  
                
                
                  
                    Due Date
                  
                  
                    
                      
                    
                  
                
                
                  
                    Available From
                  
                  
                    
                      
                    
                  
                
                
                  
                    Available Until
                  
                  
                    
                      
                    
                  
                
              
            
            
              
                
                  Status
                
                
                  
                    
                      Draft
                    
                    
                      Published
                    
                    
                      Archived
                    
                  
                
              
            
          
        
      
    );
  };

  return (
    
      
        
          
            {isEditMode ? renderAssessmentEditForm() : renderAssessmentDetails()}
          
          
            
              
                {isEditMode ? (
                  
                    Cancel
                  
                ) : (
                  
                    
                      <Settings className="h-4 w-4 mr-2" />
                      Edit Assessment
                    
                  
                )}
              
              
                
                  
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Assessment
                  
                
              
            
          
        
        
          
            
              
                
                  Question Text
                
                
                  
                
              
              
                
                  Question Type
                
                
                  
                    
                      Multiple Choice
                    
                    
                      Short Answer
                    
                    
                      Essay
                    
                    
                      True/False
                    
                  
                
              
              
                
                  Points
                
                
                  
                    
                  
                
              
              
                
                  Correct Answer
                
                
                  
                    
                  
                
              
              
                
                  Question Order
                
                
                  
                    
                  
                
              
              
                
                  Create Question
                
              
            
          
          
            
              {questions?.map((question) => (
                
                  
                    
                      
                        
                          
                            
                              Question Text
                            
                            
                              
                                
                              
                            
                          
                          
                            
                              Question Type
                            
                            
                              
                                
                                  Multiple Choice
                                
                                
                                  Short Answer
                                
                                
                                  Essay
                                
                                
                                  True/False
                                
                              
                            
                          
                          
                            
                              Points
                            
                            
                              
                                
                              
                            
                          
                          
                            
                              Correct Answer
                            
                            
                              
                                
                              
                            
                          
                          
                            
                              Question Order
                            
                            
                              
                                
                              
                            
                          
                        
                        
                          
                            
                              <Trash className="h-4 w-4 mr-2" />
                              Delete Question
                            
                          
                        
                      
                    
                  
                
              ))}
            
          
        
      
    
  );
}
