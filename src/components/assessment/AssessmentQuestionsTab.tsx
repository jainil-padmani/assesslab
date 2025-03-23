
import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus, X, Trash, FileText } from "lucide-react";
import { useGeneratedQuestions, useUniqueTopics } from "@/hooks/assessment/useGeneratedQuestions";
import { AssessmentQuestion } from "@/types/assessments";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { toast } from "sonner";

interface AssessmentQuestionsTabProps {
  questions: AssessmentQuestion[];
  setQuestions: (questions: AssessmentQuestion[]) => void;
  subjectId: string;
}

export function AssessmentQuestionsTab({ 
  questions, 
  setQuestions,
  subjectId
}: AssessmentQuestionsTabProps) {
  const [showAddQuestion, setShowAddQuestion] = useState(false);
  const [showGeneratedQuestions, setShowGeneratedQuestions] = useState(false);
  const [selectedTopic, setSelectedTopic] = useState("");
  
  // New question form state
  const [questionText, setQuestionText] = useState("");
  const [questionType, setQuestionType] = useState<"mcq" | "theory">("mcq");
  const [mcqOptions, setMcqOptions] = useState([
    { id: "1", text: "" },
    { id: "2", text: "" },
    { id: "3", text: "" },
    { id: "4", text: "" }
  ]);
  const [correctAnswer, setCorrectAnswer] = useState("");
  const [marks, setMarks] = useState(1);
  
  // Fetch unique topics for the selected subject
  const { data: topics = [], isLoading: isTopicsLoading } = useUniqueTopics(subjectId);
  
  // Fetch generated questions for the selected topic
  const { data: topicQuestions = [], isLoading: isQuestionsLoading } = useGeneratedQuestions(subjectId);
  
  const handleAddOption = () => {
    const newId = (mcqOptions.length + 1).toString();
    setMcqOptions([...mcqOptions, { id: newId, text: "" }]);
  };
  
  const handleRemoveOption = (id: string) => {
    if (mcqOptions.length <= 2) {
      toast.error("At least two options are required");
      return;
    }
    setMcqOptions(mcqOptions.filter(option => option.id !== id));
    if (correctAnswer === id) {
      setCorrectAnswer("");
    }
  };
  
  const handleOptionChange = (id: string, text: string) => {
    setMcqOptions(mcqOptions.map(option => 
      option.id === id ? { ...option, text } : option
    ));
  };
  
  const handleAddQuestion = () => {
    if (!questionText) {
      toast.error("Question text is required");
      return;
    }
    
    if (questionType === "mcq") {
      // Validate MCQ options
      const emptyOptions = mcqOptions.filter(option => !option.text.trim());
      if (emptyOptions.length > 0) {
        toast.error("All options must have text");
        return;
      }
      
      if (!correctAnswer) {
        toast.error("Please select a correct answer");
        return;
      }
    }
    
    const newQuestion: AssessmentQuestion = {
      id: Math.random().toString(),
      assessment_id: "",
      question_text: questionText,
      question_type: questionType,
      options: questionType === "mcq" ? mcqOptions : undefined,
      correct_answer: correctAnswer || undefined,
      marks,
      order_number: questions.length + 1,
      created_at: new Date().toISOString()
    };
    
    setQuestions([...questions, newQuestion]);
    resetForm();
    setShowAddQuestion(false);
  };
  
  const resetForm = () => {
    setQuestionText("");
    setQuestionType("mcq");
    setMcqOptions([
      { id: "1", text: "" },
      { id: "2", text: "" },
      { id: "3", text: "" },
      { id: "4", text: "" }
    ]);
    setCorrectAnswer("");
    setMarks(1);
  };
  
  const handleRemoveQuestion = (index: number) => {
    const newQuestions = [...questions];
    newQuestions.splice(index, 1);
    // Update order numbers
    const updatedQuestions = newQuestions.map((q, i) => ({
      ...q,
      order_number: i + 1
    }));
    setQuestions(updatedQuestions);
  };
  
  const handleAddGeneratedQuestion = (question: any) => {
    // Transform the generated question to the format we need
    const options = question.options?.map((opt: any, index: number) => ({
      id: (index + 1).toString(),
      text: opt.text
    })) || [];
    
    const correctOptionIndex = question.options?.findIndex((opt: any) => 
      opt.id === question.correctOption || opt.text === question.answer
    );
    
    const newQuestion: AssessmentQuestion = {
      id: Math.random().toString(),
      assessment_id: "",
      question_text: question.text,
      question_type: question.type === "mcq" ? "mcq" : "theory",
      options: question.type === "mcq" ? options : undefined,
      correct_answer: question.type === "mcq" && correctOptionIndex !== undefined && correctOptionIndex !== -1 
        ? (correctOptionIndex + 1).toString() 
        : question.answer || "",
      marks: question.marks || 1,
      order_number: questions.length + 1,
      source_question_id: question.id,
      created_at: new Date().toISOString()
    };
    
    setQuestions([...questions, newQuestion]);
    toast.success("Question added to assessment");
  };
  
  return (
    <div className="space-y-4">
      {questions.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Assessment Questions ({questions.length})</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {questions.map((question, index) => (
                <div key={question.id} className="border rounded-md p-4 relative">
                  <Button 
                    variant="outline" 
                    size="icon"
                    className="absolute top-2 right-2"
                    onClick={() => handleRemoveQuestion(index)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                  
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
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-8 border rounded-md">
          <p className="text-gray-500">No questions added yet</p>
        </div>
      )}
      
      <div className="flex justify-end space-x-2">
        <Button 
          variant="outline" 
          onClick={() => {
            setShowGeneratedQuestions(true);
            setShowAddQuestion(false);
          }}
        >
          <FileText className="mr-2 h-4 w-4" />
          Add from Generated Questions
        </Button>
        <Button 
          onClick={() => {
            setShowAddQuestion(true);
            setShowGeneratedQuestions(false);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Add New Question
        </Button>
      </div>
      
      {showAddQuestion && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Question</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="questionText">Question Text</Label>
              <Textarea 
                id="questionText" 
                value={questionText} 
                onChange={(e) => setQuestionText(e.target.value)}
                placeholder="Enter your question here"
                rows={3}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="questionType">Question Type</Label>
              <select
                id="questionType"
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                value={questionType}
                onChange={(e) => setQuestionType(e.target.value as "mcq" | "theory")}
              >
                <option value="mcq">Multiple Choice</option>
                <option value="theory">Theory/Descriptive</option>
              </select>
            </div>
            
            {questionType === "mcq" && (
              <div className="space-y-3">
                <Label>Options</Label>
                {mcqOptions.map((option) => (
                  <div key={option.id} className="flex items-center gap-2">
                    <input
                      type="radio"
                      id={`option-${option.id}`}
                      name="correctAnswer"
                      checked={correctAnswer === option.id}
                      onChange={() => setCorrectAnswer(option.id)}
                      className="h-4 w-4"
                    />
                    <Input 
                      value={option.text} 
                      onChange={(e) => handleOptionChange(option.id, e.target.value)}
                      placeholder={`Option ${option.id}`}
                      className="flex-1"
                    />
                    <Button 
                      variant="ghost" 
                      size="icon"
                      onClick={() => handleRemoveOption(option.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
                
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleAddOption}
                >
                  <Plus className="mr-2 h-3 w-3" />
                  Add Option
                </Button>
              </div>
            )}
            
            {questionType === "theory" && (
              <div className="space-y-2">
                <Label htmlFor="modelAnswer">Model Answer (Optional)</Label>
                <Textarea 
                  id="modelAnswer" 
                  value={correctAnswer} 
                  onChange={(e) => setCorrectAnswer(e.target.value)}
                  placeholder="Enter the model answer here"
                  rows={3}
                />
              </div>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="marks">Marks</Label>
              <Input 
                id="marks" 
                type="number" 
                value={marks} 
                onChange={(e) => setMarks(parseInt(e.target.value))}
                min={1}
                className="w-24"
              />
            </div>
            
            <div className="flex justify-end space-x-2 pt-2">
              <Button 
                variant="outline" 
                onClick={() => {
                  resetForm();
                  setShowAddQuestion(false);
                }}
              >
                Cancel
              </Button>
              <Button onClick={handleAddQuestion}>
                Add Question
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
      
      {showGeneratedQuestions && (
        <Card>
          <CardHeader>
            <CardTitle>Add from Generated Questions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {!subjectId ? (
              <div className="text-center py-4">
                <p className="text-gray-500">Please select a subject first</p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="topic">Select Topic</Label>
                  <select
                    id="topic"
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                    value={selectedTopic}
                    onChange={(e) => setSelectedTopic(e.target.value)}
                  >
                    <option value="">Select a topic</option>
                    {topics.map((topic) => (
                      <option key={topic} value={topic}>{topic}</option>
                    ))}
                  </select>
                </div>
                
                {isTopicsLoading && (
                  <div className="text-center py-4">
                    <p className="text-gray-500">Loading topics...</p>
                  </div>
                )}
                
                {selectedTopic && (
                  <div className="border rounded-md p-4 mt-4">
                    <h3 className="font-medium mb-2">Questions for topic: {selectedTopic}</h3>
                    
                    {isQuestionsLoading ? (
                      <div className="text-center py-4">
                        <p className="text-gray-500">Loading questions...</p>
                      </div>
                    ) : (
                      <ScrollArea className="h-[300px] pr-4">
                        <div className="space-y-4">
                          {topicQuestions.filter(q => q.topic === selectedTopic).map((questionSet) => 
                            questionSet.questions.map((question, index) => (
                              <div key={`${questionSet.id}-${index}`} className="border-b pb-4 last:border-0">
                                <div className="font-medium mb-2">{question.text}</div>
                                
                                {question.type === "mcq" && question.options && (
                                  <div className="ml-4 space-y-1 mb-2">
                                    {question.options.map((option: any, optIndex: number) => (
                                      <div key={option.id || optIndex} className="flex items-center gap-2">
                                        <div 
                                          className={`h-3 w-3 rounded-full border ${
                                            option.id === question.correctOption 
                                              ? "bg-primary border-primary" 
                                              : "border-muted-foreground"
                                          }`}
                                        />
                                        <span className="text-sm">{option.text}</span>
                                      </div>
                                    ))}
                                  </div>
                                )}
                                
                                {question.type === "theory" && question.answer && (
                                  <div className="ml-4 mb-2">
                                    <div className="text-sm font-medium">Answer:</div>
                                    <div className="text-sm text-muted-foreground">{question.answer}</div>
                                  </div>
                                )}
                                
                                <div className="mt-2">
                                  <Button 
                                    size="sm"
                                    onClick={() => handleAddGeneratedQuestion(question)}
                                  >
                                    Add to Assessment
                                  </Button>
                                </div>
                                
                                <Separator className="mt-4" />
                              </div>
                            ))
                          )}
                          
                          {topicQuestions.filter(q => q.topic === selectedTopic).length === 0 && (
                            <div className="text-center py-4">
                              <p className="text-gray-500">No questions found for this topic</p>
                            </div>
                          )}
                        </div>
                      </ScrollArea>
                    )}
                  </div>
                )}
                
                <div className="flex justify-end space-x-2 pt-2">
                  <Button 
                    variant="outline" 
                    onClick={() => setShowGeneratedQuestions(false)}
                  >
                    Close
                  </Button>
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
