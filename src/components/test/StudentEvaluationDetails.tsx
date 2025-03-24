
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
        // Check if test_answers table exists first
        const { error: testError } = await supabase.rpc(
          'check_table_exists',
          { table_name: 'test_answers' }
        );
        
        if (!testError) {
          // First try test_answers table if it exists
          const { data: testAnswers, error: answersError } = await supabase
            .rpc('select_from_test_answers', {
              student_id_param: studentId,
              test_id_param: testId
            });
            
          if (!answersError && testAnswers && testAnswers.length > 0) {
            const answerData = testAnswers[0];
            if (answerData.answer_sheet_url) setAnswerSheetUrl(answerData.answer_sheet_url);
            if (answerData.text_content) {
              setTextContent(answerData.text_content);
              setEditedContent(answerData.text_content);
            }
            setLoading(false);
            return;
          }
        }
        
        // Fallback to assessments_master
        const { data, error } = await supabase
          .from("assessments_master")
          .select("*")
          .eq("created_by", studentId) // Using created_by as student_id
          .eq("subject_id", subjectId)
          .maybeSingle();

        if (!error && data) {
          // Try to extract data from options JSON field
          const options = data.options as Json;
          if (typeof options === 'object' && options) {
            if ('answerSheetUrl' in options && typeof options.answerSheetUrl === 'string') {
              setAnswerSheetUrl(options.answerSheetUrl);
            }
            
            if ('textContent' in options && typeof options.textContent === 'string') {
              setTextContent(options.textContent);
              setEditedContent(options.textContent);
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
      
      // First check if test_answers table exists
      const { data: tableExists, error: tableError } = await supabase.rpc(
        'check_table_exists',
        { table_name: 'test_answers' }
      );
      
      if (tableError) {
        console.error("Error checking if test_answers table exists:", tableError);
        throw tableError;
      }
      
      if (tableExists) {
        // Check if record exists in test_answers
        const { data: existingData } = await supabase.rpc(
          'select_from_test_answers',
          {
            student_id_param: studentId,
            test_id_param: testId
          }
        );
          
        if (existingData && existingData.length > 0) {
          // Update existing record using RPC function
          const { error: updateError } = await supabase.rpc(
            'update_test_answers',
            {
              student_id_param: studentId,
              test_id_param: testId,
              text_content_param: editedContent
            }
          );
              
          if (updateError) throw updateError;
        } else {
          // Insert new record using RPC function
          const { error: insertError } = await supabase.rpc(
            'insert_test_answers',
            {
              student_id_param: studentId,
              test_id_param: testId,
              subject_id_param: subjectId,
              text_content_param: editedContent
            }
          );
              
          if (insertError) throw insertError;
        }
      } else {
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
          let options = data.options as Json;
          if (typeof options !== 'object' || !options) {
            options = {};
          }
          
          options = {
            ...options,
            textContent: editedContent
          };
          
          const { error: updateError } = await supabase
            .from("assessments_master")
            .update({ options })
            .eq("id", data.id);
          
          if (updateError) throw updateError;
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
