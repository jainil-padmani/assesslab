
import React, { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { getAnswerSheet } from "@/utils/assessment/testAnswerService";
import { FileText, Download } from "lucide-react";

interface StudentEvaluationDetailsProps {
  studentId: string;
  testId: string;
  subjectId: string;
}

const StudentEvaluationDetails: React.FC<StudentEvaluationDetailsProps> = ({ 
  studentId, 
  testId,
  subjectId
}) => {
  const [answerSheet, setAnswerSheet] = useState<{ answerSheetUrl?: string; textContent?: string } | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchAnswerSheet = async () => {
      setLoading(true);
      try {
        const data = await getAnswerSheet(studentId, testId, subjectId);
        setAnswerSheet(data);
      } catch (error) {
        console.error("Error fetching answer sheet:", error);
      } finally {
        setLoading(false);
      }
    };

    if (studentId && testId && subjectId) {
      fetchAnswerSheet();
    }
  }, [studentId, testId, subjectId]);

  const handleDownloadPdf = () => {
    if (answerSheet?.answerSheetUrl) {
      window.open(answerSheet.answerSheetUrl, '_blank');
    }
  };

  const renderAnswerSheetContent = () => {
    if (loading) {
      return <div className="py-8 text-center">Loading answer sheet...</div>;
    }

    if (!answerSheet) {
      return <div className="py-8 text-center">No answer sheet found for this student.</div>;
    }

    return (
      <div className="space-y-4">
        {answerSheet.answerSheetUrl && (
          <div className="flex flex-col space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Answer Sheet PDF</h3>
              <Button size="sm" variant="outline" onClick={handleDownloadPdf}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            </div>
            <div className="border rounded-md overflow-hidden" style={{ height: '500px' }}>
              {typeof answerSheet.answerSheetUrl === 'string' && (
                <iframe 
                  src={answerSheet.answerSheetUrl} 
                  className="w-full h-full" 
                  title="Answer Sheet"
                />
              )}
            </div>
          </div>
        )}
        
        {typeof answerSheet.textContent === 'string' && answerSheet.textContent && (
          <div className="mt-4">
            <h3 className="text-sm font-medium mb-2">Extracted Text Content</h3>
            <div className="border rounded-md p-4 max-h-60 overflow-y-auto bg-muted/50">
              {answerSheet.textContent}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="mt-6">
      <CardHeader>
        <CardTitle className="flex items-center">
          <FileText className="h-5 w-5 mr-2" />
          Student Answer Sheet
        </CardTitle>
        <CardDescription>
          View the student's submitted answer sheet and extracted text content
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="answer-sheet">
          <TabsList className="mb-4">
            <TabsTrigger value="answer-sheet">Answer Sheet</TabsTrigger>
            <TabsTrigger value="evaluation">Evaluation</TabsTrigger>
          </TabsList>
          <TabsContent value="answer-sheet" className="space-y-4">
            {renderAnswerSheetContent()}
          </TabsContent>
          <TabsContent value="evaluation">
            <div className="py-8 text-center">
              Evaluation details will be shown here once the answer sheet is processed.
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default StudentEvaluationDetails;
