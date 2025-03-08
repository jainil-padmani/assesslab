
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { TestFile } from "@/hooks/useTestSelection";
import type { Class } from "@/hooks/useClassData";
import type { Subject } from "@/types/dashboard";
import type { Test } from "@/types/tests";

interface TestSelectionCardProps {
  classes: Class[];
  subjects: Subject[];
  tests: Test[];
  testFiles: TestFile[];
  selectedClass: string;
  selectedSubject: string;
  selectedTest: string;
  setSelectedClass: (value: string) => void;
  setSelectedSubject: (value: string) => void;
  setSelectedTest: (value: string) => void;
}

export function TestSelectionCard({
  classes,
  subjects,
  tests,
  testFiles,
  selectedClass,
  selectedSubject,
  selectedTest,
  setSelectedClass,
  setSelectedSubject,
  setSelectedTest
}: TestSelectionCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CheckCircle className="h-5 w-5 text-accent" />
          Select Test Details
        </CardTitle>
        <CardDescription>
          Select the class, subject, and test to check student answer sheets
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="class">Class</Label>
            <Select value={selectedClass} onValueChange={setSelectedClass}>
              <SelectTrigger>
                <SelectValue placeholder="Select Class" />
              </SelectTrigger>
              <SelectContent>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.year ? `(Year ${cls.year})` : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Select 
              value={selectedSubject} 
              onValueChange={setSelectedSubject} 
              disabled={!selectedClass || subjects.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={!selectedClass ? "Select class first" : subjects.length === 0 ? "No subjects available" : "Select Subject"} />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="test">Test</Label>
            <Select 
              value={selectedTest} 
              onValueChange={setSelectedTest}
              disabled={!selectedSubject || tests.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder={!selectedSubject ? "Select subject first" : tests.length === 0 ? "No tests available" : "Select Test"} />
              </SelectTrigger>
              <SelectContent>
                {tests.map((test) => (
                  <SelectItem key={test.id} value={test.id}>
                    {test.name} ({new Date(test.test_date).toLocaleDateString()})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {testFiles.length > 0 && (
          <div className="mt-4 border rounded-md p-4">
            <h3 className="text-sm font-medium mb-2">Test Papers Available:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testFiles.map((file, index) => (
                <div key={index} className="flex flex-col space-y-2">
                  <p className="text-sm font-medium">{file.topic}</p>
                  <div className="flex space-x-2">
                    <a href={file.question_paper_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        View Question Paper
                      </Button>
                    </a>
                    <a href={file.answer_key_url} target="_blank" rel="noopener noreferrer">
                      <Button variant="outline" size="sm">
                        View Answer Key
                      </Button>
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
