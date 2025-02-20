
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Download } from "lucide-react";

export default function Questions() {
  const location = useLocation();
  const navigate = useNavigate();
  const { questions, documentUrl } = location.state || {};

  if (!questions) {
    return (
      <div className="space-y-4">
        <Button onClick={() => navigate("/dashboard/generate")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Generator
        </Button>
        <p>No questions generated. Please try again.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <Button onClick={() => navigate("/dashboard/generate")} variant="outline">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Generator
        </Button>
        <Button onClick={() => window.print()}>
          <Download className="mr-2 h-4 w-4" />
          Download Questions
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Generated Questions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {questions.map((question: any, index: number) => (
            <div key={index} className="space-y-2 border-b pb-4 last:border-0">
              <h3 className="font-medium">Question {index + 1}</h3>
              <p>{question.question}</p>
              {question.type === "mcq" && (
                <div className="ml-4 space-y-2">
                  {question.options.map((option: string, optIndex: number) => (
                    <div key={optIndex} className="flex items-center gap-2">
                      <span>{String.fromCharCode(65 + optIndex)}.</span>
                      <span>{option}</span>
                    </div>
                  ))}
                </div>
              )}
              {question.answer && (
                <div className="mt-2 text-sm text-gray-600">
                  <strong>Answer:</strong> {question.answer}
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
