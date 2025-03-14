import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { PaperFormat, PaperSection, PaperQuestion } from "@/types/papers";
import { Plus, Trash, AlignJustify, ChevronDown } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { CourseOutcome } from "@/types/dashboard";

interface PaperFormatBuilderProps {
  paperFormat: PaperFormat;
  setPaperFormat: React.Dispatch<React.SetStateAction<PaperFormat>>;
  courseOutcomes?: CourseOutcome[];
}

export function PaperFormatBuilder({ paperFormat, setPaperFormat, courseOutcomes = [] }: PaperFormatBuilderProps) {
  const addSection = () => {
    const newSection: PaperSection = {
      id: uuidv4(),
      title: `Section ${String.fromCharCode(65 + paperFormat.sections.length)}`,
      instructions: "",
      questions: []
    };
    
    setPaperFormat(prev => ({
      ...prev,
      sections: [...prev.sections, newSection]
    }));
  };

  const updateSection = (sectionId: string, updatedSection: Partial<PaperSection>) => {
    setPaperFormat(prev => ({
      ...prev,
      sections: prev.sections.map(section => 
        section.id === sectionId ? { ...section, ...updatedSection } : section
      )
    }));
  };

  const removeSection = (sectionId: string) => {
    setPaperFormat(prev => ({
      ...prev,
      sections: prev.sections.filter(section => section.id !== sectionId)
    }));
  };

  const addQuestion = (sectionId: string) => {
    const section = paperFormat.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const questionNumber = section.questions.length + 1;
    
    const newQuestion: PaperQuestion = {
      id: uuidv4(),
      number: questionNumber.toString(),
      text: "",
      marks: 0,
      level: "remember"
    };
    
    updateSection(sectionId, {
      questions: [...section.questions, newQuestion]
    });
  };

  const addSubQuestion = (sectionId: string, parentQuestionId: string) => {
    const section = paperFormat.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    const parentQuestion = section.questions.find(q => q.id === parentQuestionId);
    if (!parentQuestion) return;
    
    const subQuestions = parentQuestion.subQuestions || [];
    const nextSubNumber = String.fromCharCode(97 + subQuestions.length); // a, b, c, ...
    
    const newSubQuestion: PaperQuestion = {
      id: uuidv4(),
      number: `${parentQuestion.number}.${nextSubNumber}`,
      text: "",
      marks: 0,
      level: "remember"
    };
    
    updateQuestion(sectionId, parentQuestionId, {
      subQuestions: [...subQuestions, newSubQuestion]
    });
  };

  const updateQuestion = (sectionId: string, questionId: string, updatedQuestion: Partial<PaperQuestion>) => {
    setPaperFormat(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;
        
        return {
          ...section,
          questions: updateQuestionInArray(section.questions, questionId, updatedQuestion)
        };
      })
    }));
  };

  const updateQuestionInArray = (
    questions: PaperQuestion[], 
    questionId: string, 
    updatedQuestion: Partial<PaperQuestion>
  ): PaperQuestion[] => {
    return questions.map(question => {
      if (question.id === questionId) {
        return { ...question, ...updatedQuestion };
      }
      
      if (question.subQuestions) {
        return {
          ...question,
          subQuestions: updateQuestionInArray(question.subQuestions, questionId, updatedQuestion)
        };
      }
      
      return question;
    });
  };

  const removeQuestion = (sectionId: string, questionId: string) => {
    const section = paperFormat.sections.find(s => s.id === sectionId);
    if (!section) return;
    
    if (section.questions.some(q => q.id === questionId)) {
      updateSection(sectionId, {
        questions: section.questions.filter(q => q.id !== questionId)
      });
      return;
    }
    
    setPaperFormat(prev => ({
      ...prev,
      sections: prev.sections.map(section => {
        if (section.id !== sectionId) return section;
        
        return {
          ...section,
          questions: removeSubQuestionRecursive(section.questions, questionId)
        };
      })
    }));
  };

  const removeSubQuestionRecursive = (questions: PaperQuestion[], questionId: string): PaperQuestion[] => {
    return questions.map(question => {
      if (!question.subQuestions) return question;
      
      if (question.subQuestions.some(sq => sq.id === questionId)) {
        return {
          ...question,
          subQuestions: question.subQuestions.filter(sq => sq.id !== questionId)
        };
      }
      
      return {
        ...question,
        subQuestions: removeSubQuestionRecursive(question.subQuestions, questionId)
      };
    });
  };

  const calculateTotalMarks = (): number => {
    let total = 0;
    
    for (const section of paperFormat.sections) {
      for (const question of section.questions) {
        total += question.marks;
        
        if (question.subQuestions) {
          for (const subQuestion of question.subQuestions) {
            total += subQuestion.marks;
          }
        }
      }
    }
    
    return total;
  };

  const totalMarks = calculateTotalMarks();
  if (totalMarks !== paperFormat.totalMarks) {
    setPaperFormat(prev => ({ ...prev, totalMarks }));
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle>Paper Structure</CardTitle>
          <div className="text-sm text-muted-foreground">
            Total Marks: {paperFormat.totalMarks}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {paperFormat.sections.map((section, sectionIndex) => (
            <div key={section.id} className="border rounded-lg p-4 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlignJustify className="h-4 w-4 text-muted-foreground" />
                  <Input 
                    value={section.title}
                    onChange={(e) => updateSection(section.id, { title: e.target.value })}
                    className="w-[300px]"
                    placeholder="Section title"
                  />
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => removeSection(section.id)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
                </Button>
              </div>
              
              <div>
                <label className="text-sm font-medium mb-1 block">Instructions</label>
                <Textarea 
                  value={section.instructions || ""}
                  onChange={(e) => updateSection(section.id, { instructions: e.target.value })}
                  placeholder="Section instructions"
                  className="h-20"
                />
              </div>
              
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-sm font-medium">Questions</h4>
                  <Button variant="outline" size="sm" onClick={() => addQuestion(section.id)}>
                    <Plus className="h-3.5 w-3.5 mr-1" />
                    Add Question
                  </Button>
                </div>
                
                {section.questions.length === 0 && (
                  <div className="text-center p-4 bg-muted/50 rounded-md">
                    <p className="text-sm text-muted-foreground">No questions added yet</p>
                  </div>
                )}
                
                {section.questions.map((question, qIndex) => (
                  <Accordion type="single" collapsible key={question.id}>
                    <AccordionItem value={question.id} className="border p-2 rounded-lg">
                      <AccordionTrigger className="py-2 px-3 hover:no-underline">
                        <div className="flex items-center justify-between w-full pr-4">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold">Q{question.number}.</span>
                            <span className="text-sm truncate max-w-[300px]">
                              {question.text || "No question text"}
                            </span>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {question.marks} marks
                          </div>
                        </div>
                      </AccordionTrigger>
                      <AccordionContent className="px-3 pt-2 pb-3">
                        <div className="space-y-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <label className="text-xs font-medium mb-1 block">Question Text</label>
                              <Textarea 
                                value={question.text}
                                onChange={(e) => updateQuestion(section.id, question.id, { text: e.target.value })}
                                placeholder="Enter question text"
                                className="h-20"
                              />
                            </div>
                            <div className="grid grid-cols-3 gap-2">
                              <div>
                                <label className="text-xs font-medium mb-1 block">Marks</label>
                                <Input 
                                  type="number"
                                  min={0}
                                  value={question.marks}
                                  onChange={(e) => updateQuestion(section.id, question.id, { marks: parseInt(e.target.value) || 0 })}
                                />
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Bloom's Level</label>
                                <Select 
                                  value={question.level}
                                  onValueChange={(value) => updateQuestion(section.id, question.id, { level: value })}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="remember">Remember</SelectItem>
                                    <SelectItem value="understand">Understand</SelectItem>
                                    <SelectItem value="apply">Apply</SelectItem>
                                    <SelectItem value="analyze">Analyze</SelectItem>
                                    <SelectItem value="evaluate">Evaluate</SelectItem>
                                    <SelectItem value="create">Create</SelectItem>
                                  </SelectContent>
                                </Select>
                              </div>
                              <div>
                                <label className="text-xs font-medium mb-1 block">Course Outcome</label>
                                <Select 
                                  value={question.courseOutcome?.toString() || "none"}
                                  onValueChange={(value) => updateQuestion(section.id, question.id, { courseOutcome: value === "none" ? undefined : parseInt(value) })}
                                >
                                  <SelectTrigger>
                                    <SelectValue placeholder="Select CO" />
                                  </SelectTrigger>
                                  <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    {courseOutcomes.map(co => (
                                      <SelectItem key={co.id} value={co.co_number.toString()}>
                                        CO{co.co_number}
                                      </SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>
                          </div>
                          
                          <div className="space-y-2 pt-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-xs font-medium">Sub-questions</h5>
                              <Button 
                                variant="outline" 
                                size="sm" 
                                onClick={() => addSubQuestion(section.id, question.id)}
                              >
                                <Plus className="h-3 w-3 mr-1" />
                                Add Sub-question
                              </Button>
                            </div>
                            
                            {(!question.subQuestions || question.subQuestions.length === 0) ? (
                              <div className="text-center p-3 bg-muted/40 rounded-md">
                                <p className="text-xs text-muted-foreground">No sub-questions added</p>
                              </div>
                            ) : (
                              <div className="space-y-2">
                                {question.subQuestions.map((subQ) => (
                                  <div key={subQ.id} className="border rounded-md p-2">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-1">
                                        <span className="text-xs font-medium">Q{subQ.number}</span>
                                      </div>
                                      <Button 
                                        variant="ghost" 
                                        size="icon" 
                                        className="h-6 w-6" 
                                        onClick={() => removeQuestion(section.id, subQ.id)}
                                      >
                                        <Trash className="h-3 w-3 text-destructive" />
                                      </Button>
                                    </div>
                                    
                                    <div className="grid grid-cols-1 sm:grid-cols-6 gap-2">
                                      <div className="sm:col-span-3">
                                        <Input 
                                          value={subQ.text}
                                          onChange={(e) => updateQuestion(section.id, subQ.id, { text: e.target.value })}
                                          placeholder="Sub-question text"
                                          className="text-xs"
                                        />
                                      </div>
                                      <div>
                                        <Input 
                                          type="number"
                                          min={0}
                                          value={subQ.marks}
                                          onChange={(e) => updateQuestion(section.id, subQ.id, { marks: parseInt(e.target.value) || 0 })}
                                          placeholder="Marks"
                                          className="text-xs"
                                        />
                                      </div>
                                      <div>
                                        <Select 
                                          value={subQ.level}
                                          onValueChange={(value) => updateQuestion(section.id, subQ.id, { level: value })}
                                        >
                                          <SelectTrigger className="text-xs">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="remember">Remember</SelectItem>
                                            <SelectItem value="understand">Understand</SelectItem>
                                            <SelectItem value="apply">Apply</SelectItem>
                                            <SelectItem value="analyze">Analyze</SelectItem>
                                            <SelectItem value="evaluate">Evaluate</SelectItem>
                                            <SelectItem value="create">Create</SelectItem>
                                          </SelectContent>
                                        </Select>
                                      </div>
                                      <div>
                                        <Select 
                                          value={subQ.courseOutcome?.toString() || "none"}
                                          onValueChange={(value) => updateQuestion(section.id, subQ.id, { courseOutcome: value === "none" ? undefined : parseInt(value) })}
                                        >
                                          <SelectTrigger className="text-xs">
                                            <SelectValue placeholder="CO" />
                                          </SelectTrigger>
                                          <SelectContent>
                                            <SelectItem value="none">None</SelectItem>
                                            {courseOutcomes.map(co => (
                                              <SelectItem key={co.id} value={co.co_number.toString()}>
                                                CO{co.co_number}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                          
                          <div className="flex justify-between pt-2">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => addSubQuestion(section.id, question.id)}
                            >
                              <Plus className="h-3.5 w-3.5 mr-1" />
                              Add Sub-question
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => removeQuestion(section.id, question.id)}
                            >
                              <Trash className="h-3.5 w-3.5 mr-1" />
                              Remove Question
                            </Button>
                          </div>
                        </div>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                ))}
              </div>
            </div>
          ))}
        </CardContent>
        <CardFooter>
          <Button variant="outline" onClick={addSection}>
            <Plus className="mr-2 h-4 w-4" />
            Add Section
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
