
import { useMemo, useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnswerSheetHeader } from "./AnswerSheetHeader";
import { AnswerSheetWarnings } from "./AnswerSheetWarnings";
import { AnswerSheetSearch } from "./AnswerSheetSearch";
import { StudentsTable } from "./StudentsTable";
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
  
  // Listen for any kind of refresh events
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('Refresh event received in StudentAnswerSheetsCard');
      setRefreshTrigger(prev => prev + 1);
    };
    
    const events = [
      'answerSheetUploaded',
      'testFileUploaded',
      'testFileAssigned'
    ];
    
    events.forEach(event => {
      document.addEventListener(event, handleRefreshEvent);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleRefreshEvent);
      });
    };
  }, []);

  // Filter students based on search query
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

  // Extract test files info
  const { questionPapers, answerKeys } = useMemo(() => {
    const questionPapers = testFiles.filter(file => file.question_paper_url);
    const answerKeys = testFiles.filter(file => file.answer_key_url);
    return { questionPapers, answerKeys };
  }, [testFiles]);

  const areTestFilesReady = questionPapers.length > 0 && answerKeys.length > 0;

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleTestFilesUploaded = () => {
    // Trigger a refresh of the component
    console.log("Test files uploaded, triggering refresh in StudentAnswerSheetsCard");
    setRefreshTrigger(prev => prev + 1);
    
    // Dispatch an event that other components can listen for
    const event = new CustomEvent('testFileUploaded');
    document.dispatchEvent(event);
  };

  return (
    <Card className="shadow-sm border-slate-200 dark:border-slate-800 overflow-hidden">
      <AnswerSheetHeader 
        onEvaluateAll={onEvaluateAll}
        areTestFilesReady={areTestFilesReady}
        evaluatingStudents={evaluatingStudents}
      />
      
      <CardContent className="p-0">
        <AnswerSheetWarnings 
          areTestFilesReady={areTestFilesReady}
          evaluatingStudents={evaluatingStudents}
          evaluationProgress={evaluationProgress}
          testId={selectedTest}
          onTestFilesUploaded={handleTestFilesUploaded}
        />
        
        <AnswerSheetSearch onSearchChange={handleSearchChange} />
          
        <StudentsTable 
          filteredStudents={filteredStudents}
          selectedTest={selectedTest}
          selectedSubject={selectedSubject}
          testFiles={testFiles}
          evaluations={evaluations}
          evaluatingStudents={evaluatingStudents}
          onEvaluateSingle={onEvaluateSingle}
          refreshTrigger={refreshTrigger}
          onClearSearch={handleClearSearch}
        />
      </CardContent>
    </Card>
  );
}
