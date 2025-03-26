
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { CheckCircle, RefreshCw, AlertCircle } from "lucide-react";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { toast } from "sonner";
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
  onRefreshTestFiles?: () => void;
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
  setSelectedTest,
  onRefreshTestFiles
}: TestSelectionCardProps) {
  const handleRefreshClick = () => {
    if (onRefreshTestFiles) {
      toast.info("Refreshing test files...");
      onRefreshTestFiles();
    }
  };

  const hasQuestionPapers = testFiles.some(file => file.question_paper_url);
  const hasAnswerKeys = testFiles.some(file => file.answer_key_url);
  const hasCompleteFiles = hasQuestionPapers && hasAnswerKeys;

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
            <div className="flex gap-2">
              <Select 
                value={selectedTest} 
                onValueChange={setSelectedTest}
                disabled={!selectedSubject || tests.length === 0}
              >
                <SelectTrigger className="flex-1">
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
              
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="icon"
                      onClick={handleRefreshClick}
                      disabled={!selectedTest}
                    >
                      <RefreshCw className="h-4 w-4" />
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Refresh test files</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          </div>
        </div>

        {selectedTest && !hasCompleteFiles && (
          <div className="mt-2 p-3 border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/50 rounded-md flex items-center gap-2 text-amber-800 dark:text-amber-300">
            <AlertCircle className="h-4 w-4 flex-shrink-0" />
            <div className="text-sm">
              {testFiles.length === 0 ? (
                <span>No test files found. Please add question papers and answer keys from the Test Detail page.</span>
              ) : !hasQuestionPapers ? (
                <span>Question papers are missing. Both question papers and answer keys are required.</span>
              ) : !hasAnswerKeys ? (
                <span>Answer keys are missing. Both question papers and answer keys are required.</span>
              ) : (
                <span>Test files incomplete. Please check files in Test Detail page.</span>
              )}
            </div>
          </div>
        )}

        {testFiles.length > 0 && (
          <div className="mt-4 border rounded-md p-4">
            <h3 className="text-sm font-medium mb-2">Test Papers Available:</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {testFiles.map((file, index) => (
                <div key={index} className="flex flex-col space-y-2">
                  <p className="text-sm font-medium">{file.topic}</p>
                  <div className="flex space-x-2">
                    {file.question_paper_url ? (
                      <a href={file.question_paper_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          View Question Paper
                        </Button>
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        No Question Paper
                      </Button>
                    )}
                    {file.answer_key_url ? (
                      <a href={file.answer_key_url} target="_blank" rel="noopener noreferrer">
                        <Button variant="outline" size="sm">
                          View Answer Key
                        </Button>
                      </a>
                    ) : (
                      <Button variant="outline" size="sm" disabled>
                        No Answer Key
                      </Button>
                    )}
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
