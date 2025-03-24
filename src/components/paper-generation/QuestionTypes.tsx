
import React from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, Minus, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";

type QuestionMode = "multiple-choice" | "theory";

interface TheoryQuestionConfig {
  "1 mark": number;
  "2 marks": number;
  "4 marks": number;
  "8 marks": number;
}

interface CourseOutcome {
  id: string;
  co_number: number;
  description: string;
  questionCount: number;
  selected: boolean;
  open: boolean;
  questionDistribution: {
    "1 mark": number;
    "2 marks": number;
    "4 marks": number;
    "8 marks": number;
  }
}

interface QuestionTypesProps {
  questionMode: QuestionMode;
  setQuestionMode: (mode: QuestionMode) => void;
  multipleChoiceCount: number;
  setMultipleChoiceCount: (count: number) => void;
  theoryQuestionConfig: TheoryQuestionConfig;
  courseOutcomes: CourseOutcome[];
  setCourseOutcomes: React.Dispatch<React.SetStateAction<CourseOutcome[]>>;
  isLoadingCourseOutcomes: boolean;
  calculateTotalMarks: () => number;
}

export function QuestionTypes({
  questionMode,
  setQuestionMode,
  multipleChoiceCount,
  setMultipleChoiceCount,
  theoryQuestionConfig,
  courseOutcomes,
  setCourseOutcomes,
  isLoadingCourseOutcomes,
  calculateTotalMarks,
}: QuestionTypesProps) {
  
  const handleMultipleChoiceCountChange = (delta: number) => {
    setMultipleChoiceCount(prev => Math.max(1, prev + delta));
  };
  
  const handleMultipleChoiceInputChange = (value: string) => {
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= 1) {
      setMultipleChoiceCount(numValue);
    }
  };
  
  const toggleCourseOutcome = (id: string) => {
    setCourseOutcomes(prev => 
      prev.map(co => 
        co.id === id ? { ...co, selected: !co.selected } : co
      )
    );
  };
  
  const toggleOutcomeCollapsible = (id: string) => {
    setCourseOutcomes(prev => 
      prev.map(co => 
        co.id === id ? { ...co, open: !co.open } : co
      )
    );
  };
  
  const updateCourseOutcomeDistribution = (
    outcomeId: string, 
    markCategory: keyof TheoryQuestionConfig, 
    delta: number
  ) => {
    setCourseOutcomes(prev => 
      prev.map(co => {
        if (co.id === outcomeId) {
          const newValue = Math.max(0, co.questionDistribution[markCategory] + delta);
          const newDistribution = { ...co.questionDistribution, [markCategory]: newValue };
          const totalQuestions = Object.values(newDistribution).reduce((sum, val) => sum + val, 0);
          
          return {
            ...co,
            questionCount: totalQuestions,
            questionDistribution: newDistribution
          };
        }
        return co;
      })
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Question Types</CardTitle>
        <CardDescription>Choose the type of questions to generate</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <Tabs defaultValue={questionMode} onValueChange={(value) => setQuestionMode(value as QuestionMode)}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="multiple-choice">Multiple Choice</TabsTrigger>
            <TabsTrigger value="theory">Theory Questions</TabsTrigger>
          </TabsList>
          
          <TabsContent value="multiple-choice" className="space-y-4 pt-4">
            <div>
              <Label>Number of Multiple Choice Questions</Label>
              <div className="flex items-center gap-2 mt-1">
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 w-8 p-0"
                  onClick={() => handleMultipleChoiceCountChange(-1)}
                >
                  <Minus className="h-4 w-4" />
                </Button>
                <Input
                  type="number"
                  min={1}
                  value={multipleChoiceCount}
                  onChange={(e) => handleMultipleChoiceInputChange(e.target.value)}
                  className="h-8 w-20 text-center"
                />
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="h-8 w-8 p-0"
                  onClick={() => handleMultipleChoiceCountChange(1)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
              <p className="text-sm text-muted-foreground mt-1">
                Multiple choice questions will have 4 options each with one correct answer.
              </p>
            </div>
          </TabsContent>
          
          <TabsContent value="theory" className="space-y-4 pt-4">
            <div className="space-y-4">
              <div className="border-t pt-4 mt-4">
                <div className="flex items-center">
                  <Label className="text-base font-medium">Course Outcome Mapping</Label>
                  <div className="bg-yellow-100 text-yellow-800 text-xs px-2 py-1 rounded flex items-center ml-2">
                    <AlertCircle className="h-3 w-3 mr-1" />
                    Required for theory questions
                  </div>
                </div>
                
                {isLoadingCourseOutcomes ? (
                  <div className="animate-pulse mt-2">Loading course outcomes...</div>
                ) : courseOutcomes.length === 0 ? (
                  <div className="text-sm text-muted-foreground mt-2">
                    No course outcomes found for this subject. Please select a subject with defined course outcomes.
                  </div>
                ) : (
                  <div className="space-y-3 mt-3">
                    {courseOutcomes.map((co) => (
                      <Collapsible 
                        key={co.id} 
                        className="border rounded-md"
                        open={co.open}
                        onOpenChange={() => toggleOutcomeCollapsible(co.id)}
                      >
                        <div className="flex items-center p-3 border-b">
                          <Checkbox 
                            id={`co-${co.id}`}
                            checked={co.selected}
                            onCheckedChange={() => toggleCourseOutcome(co.id)}
                            className="mr-3"
                          />
                          <div className="flex-1">
                            <Label htmlFor={`co-${co.id}`} className="font-medium">
                              CO{co.co_number}: {co.description}
                            </Label>
                          </div>
                          
                          <CollapsibleTrigger asChild>
                            <Button variant="ghost" size="sm" className="p-1 h-8 w-8">
                              {co.open ? (
                                <ChevronUp className="h-4 w-4" />
                              ) : (
                                <ChevronDown className="h-4 w-4" />
                              )}
                            </Button>
                          </CollapsibleTrigger>
                        </div>
                        
                        <CollapsibleContent>
                          {co.selected && (
                            <div className="p-3 space-y-3">
                              <div className="text-sm font-medium">Question Distribution for CO{co.co_number}</div>
                              
                              {(Object.keys(co.questionDistribution) as Array<keyof TheoryQuestionConfig>).map((markCategory) => (
                                <div key={markCategory} className="flex items-center justify-between">
                                  <Label className="text-sm">{markCategory} Questions</Label>
                                  <div className="flex items-center gap-2">
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-6 w-6 p-0"
                                      onClick={() => updateCourseOutcomeDistribution(co.id, markCategory, -1)}
                                    >
                                      <Minus className="h-3 w-3" />
                                    </Button>
                                    <span className="text-sm w-6 text-center">
                                      {co.questionDistribution[markCategory]}
                                    </span>
                                    <Button 
                                      size="sm" 
                                      variant="outline" 
                                      className="h-6 w-6 p-0"
                                      onClick={() => updateCourseOutcomeDistribution(co.id, markCategory, 1)}
                                    >
                                      <Plus className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ))}
                              
                              <div className="flex items-center justify-between pt-2 border-t text-sm font-medium">
                                <span>Total Questions:</span>
                                <span>{co.questionCount}</span>
                              </div>
                            </div>
                          )}
                        </CollapsibleContent>
                      </Collapsible>
                    ))}
                    
                    {/* Summary of all selected course outcomes */}
                    {courseOutcomes.filter(co => co.selected).length > 0 && (
                      <div className="mt-4 p-3 border rounded-md bg-gray-50">
                        <h4 className="text-sm font-medium mb-2">Question Distribution Summary</h4>
                        <div className="space-y-1">
                          {(Object.keys(theoryQuestionConfig) as Array<keyof TheoryQuestionConfig>).map((markCategory) => {
                            const totalForCategory = courseOutcomes
                              .filter(co => co.selected)
                              .reduce((sum, co) => sum + co.questionDistribution[markCategory], 0);
                            
                            return (
                              <div key={markCategory} className="flex justify-between text-sm">
                                <span>{markCategory} Questions:</span>
                                <span>{totalForCategory}</span>
                              </div>
                            );
                          })}
                          <div className="flex justify-between font-medium pt-1 mt-1 border-t">
                            <span>Total Marks:</span>
                            <span>{calculateTotalMarks()}</span>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
