
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Upload, CheckCircle } from "lucide-react";

export default function Check() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Auto Check</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              Automated Evaluation
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Upload answer sheets for AI-powered evaluation and grading.
            </p>
            <Button className="w-full">
              <Upload className="mr-2 h-4 w-4" />
              Upload Answer Sheets
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>Bulk Processing</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Process multiple answer sheets simultaneously with our advanced AI system.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
