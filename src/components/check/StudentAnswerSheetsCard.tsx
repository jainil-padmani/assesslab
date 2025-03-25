
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import type { Student, Subject } from "@/types/dashboard";
import type { TestFile } from "@/hooks/useTestSelection";
import type { PaperEvaluation } from "@/hooks/useEvaluations";
import { AnswerSheetHeader } from "./student-sheets/AnswerSheetHeader";
import { AnswerSheetAlerts } from "./student-sheets/AnswerSheetAlerts";
import { AnswerSheetSearchBar } from "./student-sheets/AnswerSheetSearchBar";
import { AnswerSheetTable } from "./student-sheets/AnswerSheetTable";

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

  const { questionPapers, answerKeys } = useMemo(() => {
    const questionPapers = testFiles.filter(file => file.question_paper_url);
    const answerKeys = testFiles.filter(file => file.answer_key_url);
    return { questionPapers, answerKeys };
  }, [testFiles]);

  const areTestFilesReady = questionPapers.length > 0 && answerKeys.length > 0;

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
      <AnswerSheetHeader 
        onEvaluateAll={onEvaluateAll}
        evaluatingStudents={evaluatingStudents}
        areTestFilesReady={areTestFilesReady}
      />
      
      <CardContent className="p-0">
        <AnswerSheetAlerts 
          areTestFilesReady={areTestFilesReady}
          evaluatingStudents={evaluatingStudents}
          evaluationProgress={evaluationProgress}
        />
        
        <AnswerSheetSearchBar
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
          
        <AnswerSheetTable
          filteredStudents={filteredStudents}
          selectedSubject={selectedSubject}
          selectedTest={selectedTest}
          areTestFilesReady={areTestFilesReady}
          evaluations={evaluations}
          evaluatingStudents={evaluatingStudents}
          onEvaluateSingle={onEvaluateSingle}
          refreshTrigger={refreshTrigger}
          searchQuery={searchQuery}
          setSearchQuery={setSearchQuery}
        />
      </CardContent>
    </Card>
  );
}
