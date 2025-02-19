
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Brain } from "lucide-react";

export default function Analysis() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Analysis</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Brain className="h-5 w-5 text-accent" />
              Question Analysis
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Get insights on question difficulty, cognitive levels, and topic coverage.
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Pattern Recognition</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              AI-powered analysis of question patterns and suggestions for improvement.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
