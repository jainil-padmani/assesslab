
import React, { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Eye, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

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

  const { data: evaluation, isLoading: evaluationLoading } = useQuery({
    queryKey: ["student-evaluation", studentId, testId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("paper_evaluations")
        .select("*")
        .eq("student_id", studentId)
        .eq("test_id", testId)
        .single();

      if (error) {
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
        // Fetch the assessment record that contains the answer sheet URL
        const { data, error } = await supabase
          .from("assessments_master")
          .select("*")
          .eq("student_id", studentId)
          .eq("subject_id", subjectId)
          .eq("test_id", testId)
          .maybeSingle();

        if (error) {
          console.error("Error fetching answer sheet:", error);
          toast.error("Failed to load answer sheet");
          return;
        }

        if (data && data.answer_sheet_url) {
          setAnswerSheetUrl(data.answer_sheet_url as string);
        }

        if (data && data.text_content) {
          setTextContent(data.text_content as string);
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
        <CardTitle>Evaluation Details</CardTitle>
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

              {answerSheetUrl ? (
                <>
                  <div className="bg-muted rounded-md p-4 max-h-96 overflow-y-auto">
                    <h4 className="text-sm font-medium mb-2">
                      Extracted Text Content:
                    </h4>
                    <p className="whitespace-pre-wrap text-sm">
                      {textContent || "No text content extracted"}
                    </p>
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
