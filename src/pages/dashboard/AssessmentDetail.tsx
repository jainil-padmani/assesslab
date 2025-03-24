
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

  const renderAssessmentDetails = () => {
    if (assessmentLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!assessment) {
      return <div className="text-center py-12">Assessment not found</div>;
    }

    return (
      <div className="space-y-6">
        <Button variant="outline" onClick={handleGoBack} className="flex items-center">
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Assessments
        </Button>

        <div>
          <h1 className="text-2xl font-bold">
            Assessment Details
          </h1>
          <p className="text-muted-foreground">
            Manage assessment settings and questions.
          </p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label>
                  Title
                </Label>
                <div className="font-medium">
                  {assessment.title}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Instructions
                </Label>
                <div className="font-medium">
                  {assessment.instructions || "No instructions provided."}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="space-y-2">
                <Label>
                  Shuffle Answers
                </Label>
                <div>
                  {assessment.options.shuffleAnswers ? "Yes" : "No"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Time Limit
                </Label>
                <div>
                  {assessment.options.timeLimit.enabled
                    ? `${assessment.options.timeLimit.minutes} minutes`
                    : "No time limit"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Allow Multiple Attempts
                </Label>
                <div>
                  {assessment.options.allowMultipleAttempts ? "Yes" : "No"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Show Responses
                </Label>
                <div>
                  {assessment.options.showResponses ? "Yes" : "No"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Show Responses Only Once
                </Label>
                <div>
                  {assessment.options.showResponsesOnlyOnce ? "Yes" : "No"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Show Correct Answers
                </Label>
                <div>
                  {assessment.options.showCorrectAnswers ? "Yes" : "No"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Show Correct Answers At
                </Label>
                <div>
                  {assessment.options.showCorrectAnswersAt || "Immediately"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Hide Correct Answers At
                </Label>
                <div>
                  {assessment.options.hideCorrectAnswersAt || "Never"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Show One Question At Time
                </Label>
                <div>
                  {assessment.options.showOneQuestionAtTime ? "Yes" : "No"}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="space-y-2">
                <Label>
                  Require Access Code
                </Label>
                <div>
                  {assessment.restrictions.requireAccessCode ? "Yes" : "No"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Access Code
                </Label>
                <div>
                  {assessment.restrictions.accessCode || "No access code"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Filter IP Addresses
                </Label>
                <div>
                  {assessment.restrictions.filterIpAddresses ? "Yes" : "No"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Allowed IP Addresses
                </Label>
                <div>
                  {assessment.restrictions.allowedIpAddresses?.join(", ") || "No IP restrictions"}
                </div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 mt-6">
              <div className="space-y-2">
                <Label>
                  Assign To
                </Label>
                <div>
                  {assessment.assignTo?.join(", ") || "Not assigned"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Due Date
                </Label>
                <div>
                  {assessment.dueDate || "No due date"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Available From
                </Label>
                <div>
                  {assessment.availableFrom || "Immediately"}
                </div>
              </div>
              <div className="space-y-2">
                <Label>
                  Available Until
                </Label>
                <div>
                  {assessment.availableUntil || "No end date"}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  };

  const renderAssessmentEditForm = () => {
    if (assessmentLoading) {
      return (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!assessment) {
      return <div className="text-center py-12">Assessment not found</div>;
    }

    return (
      <form onSubmit={handleAssessmentUpdate}>
        <Card>
          <CardHeader>
            <CardTitle>Edit Assessment</CardTitle>
            <CardDescription>Update assessment settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="title">
                  Title
                </Label>
                <Input 
                  id="title" 
                  name="title" 
                  defaultValue={assessment.title}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="instructions">
                  Instructions
                </Label>
                <Textarea 
                  id="instructions" 
                  name="instructions" 
                  defaultValue={assessment.instructions || ""}
                  rows={3}
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="shuffleAnswers" 
                  name="shuffleAnswers" 
                  defaultChecked={assessment.options.shuffleAnswers}
                />
                <Label htmlFor="shuffleAnswers">
                  Shuffle Answers
                </Label>
              </div>

              <div className="space-y-2">
                <Label>
                  Time Limit
                </Label>
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="timeLimitEnabled" 
                    name="timeLimitEnabled" 
                    defaultChecked={assessment.options.timeLimit.enabled}
                  />
                  <Label htmlFor="timeLimitEnabled">
                    Enable Time Limit
                  </Label>
                </div>
                <div className="flex items-center space-x-2">
                  <Label htmlFor="timeLimitMinutes">
                    Minutes
                  </Label>
                  <Input 
                    id="timeLimitMinutes" 
                    name="timeLimitMinutes" 
                    type="number" 
                    defaultValue={assessment.options.timeLimit.minutes}
                    min={1}
                    max={180}
                    className="w-24"
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="allowMultipleAttempts" 
                  name="allowMultipleAttempts" 
                  defaultChecked={assessment.options.allowMultipleAttempts}
                />
                <Label htmlFor="allowMultipleAttempts">
                  Allow Multiple Attempts
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showResponses" 
                  name="showResponses" 
                  defaultChecked={assessment.options.showResponses}
                />
                <Label htmlFor="showResponses">
                  Show Responses
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showResponsesOnlyOnce" 
                  name="showResponsesOnlyOnce" 
                  defaultChecked={assessment.options.showResponsesOnlyOnce}
                />
                <Label htmlFor="showResponsesOnlyOnce">
                  Show Responses Only Once
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showCorrectAnswers" 
                  name="showCorrectAnswers" 
                  defaultChecked={assessment.options.showCorrectAnswers}
                />
                <Label htmlFor="showCorrectAnswers">
                  Show Correct Answers
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="showCorrectAnswersAt">
                  Show Correct Answers At
                </Label>
                <DateTimePicker 
                  placeholder="Select date and time" 
                  value={assessment.options.showCorrectAnswersAt ? new Date(assessment.options.showCorrectAnswersAt) : null} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hideCorrectAnswersAt">
                  Hide Correct Answers At
                </Label>
                <DateTimePicker 
                  placeholder="Select date and time" 
                  value={assessment.options.hideCorrectAnswersAt ? new Date(assessment.options.hideCorrectAnswersAt) : null} 
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="showOneQuestionAtTime" 
                  name="showOneQuestionAtTime" 
                  defaultChecked={assessment.options.showOneQuestionAtTime}
                />
                <Label htmlFor="showOneQuestionAtTime">
                  Show One Question At Time
                </Label>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="requireAccessCode" 
                  name="requireAccessCode" 
                  defaultChecked={assessment.restrictions.requireAccessCode}
                />
                <Label htmlFor="requireAccessCode">
                  Require Access Code
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accessCode">
                  Access Code
                </Label>
                <Input 
                  id="accessCode" 
                  name="accessCode" 
                  defaultValue={assessment.restrictions.accessCode || ""}
                />
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox 
                  id="filterIpAddresses" 
                  name="filterIpAddresses" 
                  defaultChecked={assessment.restrictions.filterIpAddresses}
                />
                <Label htmlFor="filterIpAddresses">
                  Filter IP Addresses
                </Label>
              </div>

              <div className="space-y-2">
                <Label htmlFor="allowedIpAddresses">
                  Allowed IP Addresses
                </Label>
                <Input 
                  id="allowedIpAddresses" 
                  name="allowedIpAddresses" 
                  defaultValue={assessment.restrictions.allowedIpAddresses?.join(", ") || ""}
                  placeholder="Comma-separated IP addresses"
                />
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assignTo">
                  Assign To
                </Label>
                <Input 
                  id="assignTo" 
                  name="assignTo" 
                  defaultValue={assessment.assignTo?.join(", ") || ""}
                  placeholder="Comma-separated student IDs"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="dueDate">
                  Due Date
                </Label>
                <DateTimePicker 
                  placeholder="Select date and time" 
                  value={assessment.dueDate ? new Date(assessment.dueDate) : null} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableFrom">
                  Available From
                </Label>
                <DateTimePicker 
                  placeholder="Select date and time" 
                  value={assessment.availableFrom ? new Date(assessment.availableFrom) : null} 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="availableUntil">
                  Available Until
                </Label>
                <DateTimePicker 
                  placeholder="Select date and time" 
                  value={assessment.availableUntil ? new Date(assessment.availableUntil) : null} 
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="status">
                Status
              </Label>
              <Select name="status" defaultValue={assessment.status}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">
                    Draft
                  </SelectItem>
                  <SelectItem value="published">
                    Published
                  </SelectItem>
                  <SelectItem value="archived">
                    Archived
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={handleEditToggle}>
                Cancel
              </Button>
              <Button type="submit">
                Save Changes
              </Button>
            </div>
          </CardContent>
        </Card>
      </form>
    );
  };

  return (
    <div className="container mx-auto py-8 space-y-6 max-w-5xl">
      <div className="space-y-6">
        <div>
          {isEditMode ? renderAssessmentEditForm() : renderAssessmentDetails()}
        </div>
        <div className="flex justify-between">
          <div>
            {isEditMode ? (
              <Button variant="outline" onClick={handleEditToggle}>
                Cancel
              </Button>
            ) : (
              <Button variant="outline" onClick={handleEditToggle}>
                <Settings className="h-4 w-4 mr-2" />
                Edit Assessment
              </Button>
            )}
          </div>
          <div>
            <Button variant="destructive" onClick={handleDeleteAssessment}>
              <Trash className="h-4 w-4 mr-2" />
              Delete Assessment
            </Button>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Questions</CardTitle>
          <CardDescription>Manage assessment questions</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-4 border p-4 rounded-md">
            <div className="space-y-2">
              <Label htmlFor="questionText">
                Question Text
              </Label>
              <Textarea 
                id="questionText" 
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
                rows={3}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionType">
                Question Type
              </Label>
              <Select 
                value={newQuestionType} 
                onValueChange={(value: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false') => 
                  setNewQuestionType(value)
                }
              >
                <SelectTrigger id="questionType">
                  <SelectValue placeholder="Select a question type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="multiple_choice">
                    Multiple Choice
                  </SelectItem>
                  <SelectItem value="short_answer">
                    Short Answer
                  </SelectItem>
                  <SelectItem value="essay">
                    Essay
                  </SelectItem>
                  <SelectItem value="true_false">
                    True/False
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="points">
                Points
              </Label>
              <Input 
                id="points" 
                type="number" 
                value={newQuestionPoints}
                onChange={(e) => setNewQuestionPoints(parseInt(e.target.value))}
                min={1}
                max={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="correctAnswer">
                Correct Answer
              </Label>
              <Input 
                id="correctAnswer" 
                value={newQuestionCorrectAnswer}
                onChange={(e) => setNewQuestionCorrectAnswer(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="questionOrder">
                Question Order
              </Label>
              <Input 
                id="questionOrder" 
                type="number" 
                value={newQuestionOrder}
                onChange={(e) => setNewQuestionOrder(parseInt(e.target.value))}
                min={0}
              />
            </div>
            <div>
              <Button onClick={handleCreateQuestion}>
                Create Question
              </Button>
            </div>
          </div>

          <div className="space-y-4">
            {questions?.map((question) => (
              <Card key={question.id}>
                <CardContent className="pt-6">
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor={`question-${question.id}-text`}>
                        Question Text
                      </Label>
                      <Textarea 
                        id={`question-${question.id}-text`} 
                        value={question.questionText}
                        onChange={(e) => handleUpdateQuestion(question.id, { questionText: e.target.value })}
                        rows={2}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`question-${question.id}-type`}>
                        Question Type
                      </Label>
                      <Select 
                        value={question.questionType} 
                        onValueChange={(value: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false') => 
                          handleUpdateQuestion(question.id, { questionType: value })
                        }
                      >
                        <SelectTrigger id={`question-${question.id}-type`}>
                          <SelectValue placeholder="Select a question type" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="multiple_choice">
                            Multiple Choice
                          </SelectItem>
                          <SelectItem value="short_answer">
                            Short Answer
                          </SelectItem>
                          <SelectItem value="essay">
                            Essay
                          </SelectItem>
                          <SelectItem value="true_false">
                            True/False
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`question-${question.id}-points`}>
                        Points
                      </Label>
                      <Input 
                        id={`question-${question.id}-points`} 
                        type="number" 
                        value={question.points}
                        onChange={(e) => handleUpdateQuestion(question.id, { points: parseInt(e.target.value) })}
                        min={1}
                        max={100}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`question-${question.id}-correctAnswer`}>
                        Correct Answer
                      </Label>
                      <Input 
                        id={`question-${question.id}-correctAnswer`} 
                        value={question.correctAnswer || ""}
                        onChange={(e) => handleUpdateQuestion(question.id, { correctAnswer: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor={`question-${question.id}-questionOrder`}>
                        Question Order
                      </Label>
                      <Input 
                        id={`question-${question.id}-questionOrder`} 
                        type="number" 
                        value={question.questionOrder || 0}
                        onChange={(e) => handleUpdateQuestion(question.id, { questionOrder: parseInt(e.target.value) })}
                        min={0}
                      />
                    </div>
                  </div>
                  <div className="mt-4 flex justify-end">
                    <Button 
                      variant="destructive" 
                      size="sm"
                      onClick={() => handleDeleteQuestion(question.id)}
                    >
                      <Trash className="h-4 w-4 mr-2" />
                      Delete Question
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
