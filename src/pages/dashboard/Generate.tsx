
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function Generate() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Generate Questions</h1>
      <Card>
        <CardHeader>
          <CardTitle>AI-Powered Question Generation</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-600">
            Upload your study materials and let AI generate comprehensive question papers.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
