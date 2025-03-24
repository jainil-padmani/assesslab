
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
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!assessment) {
      return <div className="text-center py-12">Assessment not found</div>;
    }

    return (
      <div>
        <div className="flex justify-between items-center mb-6">
          <Button variant="ghost" onClick={handleGoBack} className="flex items-center">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Assessments
          </Button>
        </div>
        <div className="mb-6">
          <h1 className="text-2xl font-bold">
            Assessment Details
          </h1>
          <p className="text-muted-foreground">
            Manage assessment settings and questions.
          </p>
        </div>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <Label>
                      Title
                    </Label>
                    <div className="font-medium">
                      {assessment.title}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Instructions
                    </Label>
                    <div className="font-medium">
                      {assessment.instructions || "No instructions provided."}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <Label>
                      Shuffle Answers
                    </Label>
                    <div className="font-medium">
                      {assessment.options.shuffleAnswers ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Time Limit
                    </Label>
                    <div className="font-medium">
                      {assessment.options.timeLimit.enabled
                        ? `${assessment.options.timeLimit.minutes} minutes`
                        : "No time limit"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Allow Multiple Attempts
                    </Label>
                    <div className="font-medium">
                      {assessment.options.allowMultipleAttempts ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Show Responses
                    </Label>
                    <div className="font-medium">
                      {assessment.options.showResponses ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Show Responses Only Once
                    </Label>
                    <div className="font-medium">
                      {assessment.options.showResponsesOnlyOnce ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Show Correct Answers
                    </Label>
                    <div className="font-medium">
                      {assessment.options.showCorrectAnswers ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Show Correct Answers At
                    </Label>
                    <div className="font-medium">
                      {assessment.options.showCorrectAnswersAt || "Immediately"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Hide Correct Answers At
                    </Label>
                    <div className="font-medium">
                      {assessment.options.hideCorrectAnswersAt || "Never"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Show One Question At Time
                    </Label>
                    <div className="font-medium">
                      {assessment.options.showOneQuestionAtTime ? "Yes" : "No"}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <Label>
                      Require Access Code
                    </Label>
                    <div className="font-medium">
                      {assessment.restrictions.requireAccessCode ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Access Code
                    </Label>
                    <div className="font-medium">
                      {assessment.restrictions.accessCode || "No access code"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Filter IP Addresses
                    </Label>
                    <div className="font-medium">
                      {assessment.restrictions.filterIpAddresses ? "Yes" : "No"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Allowed IP Addresses
                    </Label>
                    <div className="font-medium">
                      {assessment.restrictions.allowedIpAddresses?.join(", ") || "No IP restrictions"}
                    </div>
                  </div>
                </div>
                <div>
                  <div className="mb-4">
                    <Label>
                      Assign To
                    </Label>
                    <div className="font-medium">
                      {assessment.assignTo?.join(", ") || "Not assigned"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Due Date
                    </Label>
                    <div className="font-medium">
                      {assessment.dueDate || "No due date"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Available From
                    </Label>
                    <div className="font-medium">
                      {assessment.availableFrom || "Immediately"}
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label>
                      Available Until
                    </Label>
                    <div className="font-medium">
                      {assessment.availableUntil || "No end date"}
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  };

  const renderAssessmentEditForm = () => {
    if (assessmentLoading) {
      return (
        <div className="flex justify-center items-center p-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      );
    }

    if (!assessment) {
      return <div className="text-center py-12">Assessment not found</div>;
    }

    return (
      <form onSubmit={handleAssessmentUpdate}>
        <div className="space-y-6">
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <Label htmlFor="title">
                      Title
                    </Label>
                    <Input
                      id="title"
                      name="title"
                      defaultValue={assessment.title}
                    />
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="instructions">
                      Instructions
                    </Label>
                    <Textarea
                      id="instructions"
                      name="instructions"
                      defaultValue={assessment.instructions || ""}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="shuffleAnswers"
                      name="shuffleAnswers"
                      defaultChecked={assessment.options.shuffleAnswers}
                    />
                    <Label htmlFor="shuffleAnswers">
                      Shuffle Answers
                    </Label>
                  </div>
                  <div className="space-y-2 mb-4">
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
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="allowMultipleAttempts"
                      name="allowMultipleAttempts"
                      defaultChecked={assessment.options.allowMultipleAttempts}
                    />
                    <Label htmlFor="allowMultipleAttempts">
                      Allow Multiple Attempts
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="showResponses"
                      name="showResponses"
                      defaultChecked={assessment.options.showResponses}
                    />
                    <Label htmlFor="showResponses">
                      Show Responses
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="showResponsesOnlyOnce"
                      name="showResponsesOnlyOnce"
                      defaultChecked={assessment.options.showResponsesOnlyOnce}
                    />
                    <Label htmlFor="showResponsesOnlyOnce">
                      Show Responses Only Once
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="showCorrectAnswers"
                      name="showCorrectAnswers"
                      defaultChecked={assessment.options.showCorrectAnswers}
                    />
                    <Label htmlFor="showCorrectAnswers">
                      Show Correct Answers
                    </Label>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="showCorrectAnswersAt">
                        Show Correct Answers At
                      </Label>
                      <DateTimePicker
                        id="showCorrectAnswersAt"
                        name="showCorrectAnswersAt"
                        value={assessment.options.showCorrectAnswersAt || undefined}
                      />
                    </div>
                  </div>
                  <div className="space-y-2 mb-4">
                    <div className="flex flex-col space-y-2">
                      <Label htmlFor="hideCorrectAnswersAt">
                        Hide Correct Answers At
                      </Label>
                      <DateTimePicker
                        id="hideCorrectAnswersAt"
                        name="hideCorrectAnswersAt"
                        value={assessment.options.hideCorrectAnswersAt || undefined}
                      />
                    </div>
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
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
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="requireAccessCode"
                      name="requireAccessCode"
                      defaultChecked={assessment.restrictions.requireAccessCode}
                    />
                    <Label htmlFor="requireAccessCode">
                      Require Access Code
                    </Label>
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="accessCode">
                      Access Code
                    </Label>
                    <Input
                      id="accessCode"
                      name="accessCode"
                      defaultValue={assessment.restrictions.accessCode || ""}
                    />
                  </div>
                  <div className="flex items-center space-x-2 mb-4">
                    <Checkbox
                      id="filterIpAddresses"
                      name="filterIpAddresses"
                      defaultChecked={assessment.restrictions.filterIpAddresses}
                    />
                    <Label htmlFor="filterIpAddresses">
                      Filter IP Addresses
                    </Label>
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="allowedIpAddresses">
                      Allowed IP Addresses
                    </Label>
                    <Input
                      id="allowedIpAddresses"
                      name="allowedIpAddresses"
                      defaultValue={assessment.restrictions.allowedIpAddresses?.join(", ") || ""}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="mb-4">
                    <Label htmlFor="assignTo">
                      Assign To
                    </Label>
                    <Input
                      id="assignTo"
                      name="assignTo"
                      defaultValue={assessment.assignTo?.join(", ") || ""}
                    />
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="dueDate">
                      Due Date
                    </Label>
                    <div className="mt-2">
                      <DateTimePicker
                        id="dueDate"
                        name="dueDate"
                        value={assessment.dueDate || undefined}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="availableFrom">
                      Available From
                    </Label>
                    <div className="mt-2">
                      <DateTimePicker
                        id="availableFrom"
                        name="availableFrom"
                        value={assessment.availableFrom || undefined}
                      />
                    </div>
                  </div>
                  <div className="mb-4">
                    <Label htmlFor="availableUntil">
                      Available Until
                    </Label>
                    <div className="mt-2">
                      <DateTimePicker
                        id="availableUntil"
                        name="availableUntil"
                        value={assessment.availableUntil || undefined}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
          <div className="flex items-center space-x-2">
            <Label htmlFor="status">
              Status
            </Label>
            <Select name="status" defaultValue={assessment.status}>
              <SelectTrigger className="w-40">
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
        </div>
        <div className="flex justify-end mt-6 space-x-2">
          <Button type="submit" disabled={isLoading}>
            Save Changes
          </Button>
        </div>
      </form>
    );
  };

  return (
    <div className="container mx-auto p-4">
      <div>
        {isEditMode ? renderAssessmentEditForm() : renderAssessmentDetails()}
      </div>
      <div className="flex justify-between mt-6">
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
          <Button
            variant="destructive"
            onClick={handleDeleteAssessment}
            disabled={isLoading}
          >
            <Trash className="h-4 w-4 mr-2" />
            Delete Assessment
          </Button>
        </div>
      </div>
      <Card className="mt-8">
        <CardHeader>
          <CardTitle>Add Question</CardTitle>
          <CardDescription>
            Create a new question for this assessment
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div>
              <Label htmlFor="questionText">
                Question Text
              </Label>
              <Textarea
                id="questionText"
                value={newQuestionText}
                onChange={(e) => setNewQuestionText(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="questionType">
                Question Type
              </Label>
              <Select
                value={newQuestionType}
                onValueChange={(value) => setNewQuestionType(value as any)}
              >
                <SelectTrigger>
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
            <div>
              <Label htmlFor="questionPoints">
                Points
              </Label>
              <Input
                id="questionPoints"
                type="number"
                value={newQuestionPoints}
                onChange={(e) => setNewQuestionPoints(Number(e.target.value))}
              />
            </div>
            <div>
              <Label htmlFor="correctAnswer">
                Correct Answer
              </Label>
              <Input
                id="correctAnswer"
                value={newQuestionCorrectAnswer}
                onChange={(e) => setNewQuestionCorrectAnswer(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="questionOrder">
                Question Order
              </Label>
              <Input
                id="questionOrder"
                type="number"
                value={newQuestionOrder}
                onChange={(e) => setNewQuestionOrder(Number(e.target.value))}
              />
            </div>
            <div>
              <Button onClick={handleCreateQuestion} disabled={!newQuestionText || isLoading}>
                Create Question
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
      <div className="mt-8">
        <h2 className="text-xl font-bold mb-4">Questions</h2>
        {questions?.map((question) => (
          <Card key={question.id} className="mb-4">
            <CardContent className="pt-6">
              <div>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor={`questionText-${question.id}`}>
                      Question Text
                    </Label>
                    <Textarea
                      id={`questionText-${question.id}`}
                      defaultValue={question.questionText}
                      onChange={(e) => handleUpdateQuestion(question.id, { questionText: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`questionType-${question.id}`}>
                      Question Type
                    </Label>
                    <Select
                      defaultValue={question.questionType}
                      onValueChange={(value) => handleUpdateQuestion(question.id, { questionType: value as any })}
                    >
                      <SelectTrigger>
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
                  <div>
                    <Label htmlFor={`points-${question.id}`}>
                      Points
                    </Label>
                    <Input
                      id={`points-${question.id}`}
                      type="number"
                      defaultValue={question.points}
                      onChange={(e) => handleUpdateQuestion(question.id, { points: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`correctAnswer-${question.id}`}>
                      Correct Answer
                    </Label>
                    <Input
                      id={`correctAnswer-${question.id}`}
                      defaultValue={question.correctAnswer}
                      onChange={(e) => handleUpdateQuestion(question.id, { correctAnswer: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`questionOrder-${question.id}`}>
                      Question Order
                    </Label>
                    <Input
                      id={`questionOrder-${question.id}`}
                      type="number"
                      defaultValue={question.questionOrder}
                      onChange={(e) => handleUpdateQuestion(question.id, { questionOrder: Number(e.target.value) })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`modelAnswer-${question.id}`}>
                      Model Answer
                    </Label>
                    <Textarea
                      id={`modelAnswer-${question.id}`}
                      defaultValue={question.modelAnswer || ''}
                      onChange={(e) => handleUpdateQuestion(question.id, { modelAnswer: e.target.value })}
                    />
                  </div>
                  <div>
                    <Label htmlFor={`explanation-${question.id}`}>
                      Explanation
                    </Label>
                    <Textarea
                      id={`explanation-${question.id}`}
                      defaultValue={question.explanation || ''}
                      onChange={(e) => handleUpdateQuestion(question.id, { explanation: e.target.value })}
                    />
                  </div>
                </div>
                <div className="mt-4 flex justify-end">
                  <Button
                    variant="destructive"
                    onClick={() => handleDeleteQuestion(question.id)}
                    disabled={isLoading}
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Delete Question
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
