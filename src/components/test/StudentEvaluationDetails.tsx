
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Loader2, Edit, Save } from "lucide-react";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import type { Json } from '@/integrations/supabase/types';
import { selectFromTestAnswers, updateTestAnswers, insertTestAnswers } from "@/utils/assessment/rpcFunctions";
import { EvaluationStatus } from "@/types/assessments";

interface StudentEvaluationDetailsProps {
  studentId: string;
  testId: string;
  subjectId: string;
}

const StudentEvaluationDetails: React.FC<StudentEvaluationDetailsProps> = ({
  studentId,
  testId,
  subjectId,
}) => {
  const [answerSheetUrl, setAnswerSheetUrl] = useState<string>("");
  const [textContent, setTextContent] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [editedContent, setEditedContent] = useState<string>("");

  const { data: evaluation, isLoading: evaluationLoading } = useQuery({
    queryKey: ["student-evaluation", studentId, testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_evaluations")
        .select("*")
        .eq("student_id", studentId)
        .eq("test_id", testId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching evaluation:", error);
        return null;
      }

      return data;
    },
  });

  useEffect(() => {
    const fetchAnswerSheet = async () => {
      setLoading(true);
      try {
        // Use the RPC function to get test answers
        const testAnswer = await selectFromTestAnswers(studentId, testId);
        
        if (testAnswer) {
          if (testAnswer.answer_sheet_url) setAnswerSheetUrl(testAnswer.answer_sheet_url);
          if (testAnswer.text_content) {
            setTextContent(testAnswer.text_content);
            setEditedContent(testAnswer.text_content);
          }
          setLoading(false);
          return;
        }
        
        // Fallback to assessments_master
        const { data, error } = await supabase
          .from("assessments_master")
          .select("*")
          .eq("created_by", studentId)
          .eq("subject_id", subjectId)
          .maybeSingle();

        if (!error && data) {
          // Try to extract data from options JSON field
          const options = data.options as Json;
          
          if (typeof options === 'object' && options !== null) {
            const optionsObj = options as Record<string, any>;
            
            if (optionsObj.answerSheetUrl && typeof optionsObj.answerSheetUrl === 'string') {
              setAnswerSheetUrl(optionsObj.answerSheetUrl);
            }
            
            if (optionsObj.textContent && typeof optionsObj.textContent === 'string') {
              setTextContent(optionsObj.textContent);
              setEditedContent(optionsObj.textContent);
            }
          }
        }
      } catch (error) {
        console.error("Error in fetchAnswerSheet:", error);
        toast.error("Failed to load answer sheet");
      } finally {
        setLoading(false);
      }
    };

    fetchAnswerSheet();
  }, [studentId, subjectId, testId]);

  const handleSaveContent = async () => {
    try {
      setLoading(true);
      
      // First check if existing data in test_answers
      const testAnswer = await selectFromTestAnswers(studentId, testId);
      
      if (testAnswer) {
        // Update existing record
        const success = await updateTestAnswers(studentId, testId, editedContent);
        
        if (!success) {
          throw new Error("Failed to update test answer");
        }
      } else {
        // Insert new record
        const success = await insertTestAnswers(studentId, testId, subjectId, editedContent);
        
        if (!success) {
          // Fallback to assessments_master
          const { data, error } = await supabase
            .from("assessments_master")
            .select("id, options")
            .eq("created_by", studentId)
            .eq("subject_id", subjectId)
            .maybeSingle();
          
          if (error && error.code !== 'PGRST116') throw error;
          
          if (data) {
            // Update existing record
            const optionsData = data.options as Record<string, any>;
            const updatedOptions = {
              ...optionsData,
              textContent: editedContent
            };
            
            const { error: updateError } = await supabase
              .from("assessments_master")
              .update({ options: updatedOptions })
              .eq("id", data.id);
            
            if (updateError) throw updateError;
          } else {
            throw new Error("No assessment record found to update");
          }
        }
      }
      
      // Update local state
      setTextContent(editedContent);
      setIsEditing(false);
      toast.success("Answer content saved successfully");
      
    } catch (error) {
      console.error("Error saving content:", error);
      toast.error("Failed to save content");
    } finally {
      setLoading(false);
    }
  };

  if (loading || evaluationLoading) {
    return (
      <div className="flex justify-center items-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const openAnswerSheet = () => {
    if (answerSheetUrl) {
      window.open(answerSheetUrl, "_blank");
    } else {
      toast.error("No answer sheet available");
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex justify-between items-center">
          <span>Evaluation Details</span>
          {isEditing ? (
            <Button variant="outline" size="sm" onClick={handleSaveContent}>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          ) : (
            textContent && (
              <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit Answers
              </Button>
            )
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="answer-sheet">
          <TabsList className="mb-4">
            <TabsTrigger value="answer-sheet">Answer Sheet</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
          </TabsList>

          <TabsContent value="answer-sheet">
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-semibold">Student Answer Sheet</h3>
                {answerSheetUrl && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={openAnswerSheet}
                  >
                    <Eye className="mr-2 h-4 w-4" />
                    View PDF
                  </Button>
                )}
              </div>

              {answerSheetUrl || textContent ? (
                <>
                  <div className="bg-muted rounded-md p-4 max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-medium mb-2">
                      {isEditing ? "Edit Answer Content:" : "Answer Content:"}
                    </h4>
                    {isEditing ? (
                      <Textarea
                        value={editedContent}
                        onChange={(e) => setEditedContent(e.target.value)}
                        className="min-h-[200px]"
                        placeholder="Enter answer content here..."
                      />
                    ) : (
                      <p className="whitespace-pre-wrap text-sm">
                        {textContent || "No text content available"}
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="text-center py-8">
                  <FileText className="mx-auto h-12 w-12 text-muted-foreground opacity-50" />
                  <p className="mt-4 text-muted-foreground">
                    No answer sheet uploaded for this student
                  </p>
                </div>
              )}
            </div>
          </TabsContent>

          <TabsContent value="evaluation">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Evaluation Results</h3>

              {evaluation ? (
                <div className="bg-muted rounded-md p-4 max-h-96 overflow-y-auto">
                  <pre className="text-xs whitespace-pre-wrap break-all">
                    {JSON.stringify(evaluation.evaluation_data, null, 2)}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    No evaluation data available for this student
                  </p>
                </div>
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StudentEvaluationDetails;
