
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BookOpen, Upload, FileText } from "lucide-react";

export default function Generate() {
  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Generate Questions</h1>
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Upload className="h-5 w-5 text-accent" />
              Upload Study Material
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Upload your study materials and let AI generate comprehensive question papers.
            </p>
            <div className="grid gap-2">
              <Label htmlFor="file">Upload File</Label>
              <Input id="file" type="file" />
            </div>
            <Button className="w-full">
              <FileText className="mr-2 h-4 w-4" />
              Process Material
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5 text-accent" />
              Question Parameters
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-2">
              <Label htmlFor="difficulty">Difficulty Level</Label>
              <select
                id="difficulty"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="questions">Number of Questions</Label>
              <Input
                id="questions"
                type="number"
                placeholder="Enter number of questions"
                min="1"
              />
            </div>
            <Button className="w-full bg-accent hover:bg-accent/90">
              Generate Questions
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
