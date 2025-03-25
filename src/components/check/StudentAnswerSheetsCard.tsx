
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { FileCheck, AlertCircle, Search, ListFilter, DownloadCloud } from "lucide-react";
import { StudentEvaluationRow } from "./StudentEvaluationRow";
import { Input } from "@/components/ui/input";
import type { Student, Subject } from "@/types/dashboard";
import type { TestFile } from "@/hooks/useTestSelection";
import type { PaperEvaluation } from "@/hooks/useEvaluations";

interface StudentAnswerSheetsCardProps {
  selectedTest: string;
  selectedSubject: string;
  testFiles: TestFile[];
  classStudents: Student[];
  subjects: Subject[];
  evaluations: PaperEvaluation[];
  evaluatingStudents: string[];
  evaluationProgress: number;
  onEvaluateSingle: (studentId: string) => void;
  onEvaluateAll: () => void;
  onDeleteEvaluation?: (studentId: string) => void;
}

export function StudentAnswerSheetsCard({ 
  selectedTest,
  selectedSubject,
  testFiles,
  classStudents,
  subjects,
  evaluations,
  evaluatingStudents,
  evaluationProgress,
  onEvaluateSingle,
  onEvaluateAll,
  onDeleteEvaluation
}: StudentAnswerSheetsCardProps) {
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [filteredStudents, setFilteredStudents] = useState<Student[]>(classStudents);
  
  // Listen for answer sheet upload events
  useEffect(() => {
    const handleAnswerSheetUploaded = () => {
      console.log('Answer sheet uploaded event received in StudentAnswerSheetsCard');
      setRefreshTrigger(prev => prev + 1);
    };
    
    document.addEventListener('answerSheetUploaded', handleAnswerSheetUploaded);
    return () => {
      document.removeEventListener('answerSheetUploaded', handleAnswerSheetUploaded);
    };
  }, []);

  // Filter students when search query or class students change
  useEffect(() => {
    if (!searchQuery.trim()) {
      setFilteredStudents(classStudents);
      return;
    }
    
    const lowerQuery = searchQuery.toLowerCase();
    const filtered = classStudents.filter(student => 
      student.name.toLowerCase().includes(lowerQuery) ||
      (student.roll_number && student.roll_number.toLowerCase().includes(lowerQuery))
    );
    
    setFilteredStudents(filtered);
  }, [searchQuery, classStudents]);

  // Extract question papers and answer keys from test files
  const { questionPapers, answerKeys } = useMemo(() => {
    const questionPapers = testFiles.filter(file => file.question_paper_url);
    const answerKeys = testFiles.filter(file => file.answer_key_url);
    return { questionPapers, answerKeys };
  }, [testFiles]);

  // Find evaluation data for a specific student
  const getEvaluationData = (studentId: string) => {
    const evaluation = evaluations.find(e => e.student_id === studentId && e.status === 'completed');
    return evaluation?.evaluation_data;
  };

  // Check if a student is being evaluated
  const isStudentEvaluating = (studentId: string) => {
    return evaluatingStudents.includes(studentId);
  };

  // Get the status of a student's evaluation
  const getStudentStatus = (studentId: string) => {
    const evaluation = evaluations.find(e => e.student_id === studentId);
    return evaluation?.status || 'pending';
  };

  // Check if test files are available for evaluation
  const areTestFilesReady = questionPapers.length > 0 && answerKeys.length > 0;

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
      <CardHeader className="pb-3 bg-muted/30">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <CardTitle className="text-xl font-semibold">Student Answer Sheets</CardTitle>
            <CardDescription className="text-muted-foreground">
              Upload and evaluate handwritten answer sheets
            </CardDescription>
          </div>
          
          <div className="flex flex-col gap-2 sm:flex-row items-center">
            <Button 
              onClick={onEvaluateAll}
              disabled={evaluatingStudents.length > 0 || !areTestFilesReady}
              className="w-full sm:w-auto gap-2 font-medium shadow-sm"
            >
              <FileCheck className="h-4 w-4" />
              Evaluate All Sheets
            </Button>
            
            <Button 
              variant="outline" 
              size="icon"
              className="border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <DownloadCloud className="h-4 w-4" />
              <span className="sr-only">Export Results</span>
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-0">
        {!areTestFilesReady && (
          <div className="mx-6 my-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                Missing test files
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1">
                Both question paper and answer key are required to evaluate student answers.
              </p>
            </div>
          </div>
        )}
        
        {evaluatingStudents.length > 0 && (
          <div className="mx-6 my-4 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg shadow-sm space-y-3">
            <div className="flex justify-between items-center">
              <div>
                <h4 className="text-sm font-medium text-blue-800 dark:text-blue-400">Evaluation in progress</h4>
                <p className="text-xs text-blue-700 dark:text-blue-500 mt-1">
                  {evaluatingStudents.length} papers remaining to be evaluated
                </p>
              </div>
              <span className="text-sm font-medium text-blue-800 dark:text-blue-400">{evaluationProgress}%</span>
            </div>
            <Progress value={evaluationProgress} className="h-2" />
          </div>
        )}
        
        <div className="px-6 pt-4 pb-2">
          <div className="flex flex-col sm:flex-row gap-2 justify-between">
            <div className="relative w-full sm:max-w-xs">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 bg-background border-slate-200 dark:border-slate-700"
              />
            </div>
            
            <Button variant="outline" size="sm" className="border-slate-200 dark:border-slate-700 flex gap-2">
              <ListFilter className="h-4 w-4" />
              <span>Filter</span>
            </Button>
          </div>
        </div>
          
        <div className="overflow-auto">
          <Table>
            <TableHeader className="bg-muted/50">
              <TableRow className="hover:bg-transparent">
                <TableHead>Student</TableHead>
                <TableHead>ID Number</TableHead>
                <TableHead>Answer Sheet</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.length > 0 ? (
                filteredStudents.map((student) => (
                  <StudentEvaluationRow
                    key={student.id}
                    student={student}
                    status={getStudentStatus(student.id)}
                    evaluationData={getEvaluationData(student.id)}
                    isEvaluating={isStudentEvaluating(student.id)}
                    selectedSubject={selectedSubject}
                    selectedTest={selectedTest} 
                    testFilesAvailable={areTestFilesReady}
                    onEvaluate={onEvaluateSingle}
                    refreshTrigger={refreshTrigger}
                  />
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="h-24 text-center">
                    <div className="flex flex-col items-center justify-center text-muted-foreground">
                      <Search className="h-8 w-8 mb-2 opacity-40" />
                      <p>No students match your search criteria</p>
                      <Button
                        variant="link"
                        onClick={() => setSearchQuery("")}
                        className="mt-2"
                      >
                        Clear search
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
