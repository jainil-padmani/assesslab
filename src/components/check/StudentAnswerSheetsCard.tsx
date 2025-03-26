
import { useMemo, useState, useEffect, useCallback } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { AnswerSheetHeader } from "./AnswerSheetHeader";
import { AnswerSheetWarnings } from "./AnswerSheetWarnings";
import { AnswerSheetSearch } from "./AnswerSheetSearch";
import { StudentsTable } from "./StudentsTable";
import { forceRefreshStorage } from "@/utils/fileStorage/storageHelpers";
import type { Student, Subject } from "@/types/dashboard";
import type { TestFile } from "@/hooks/useTestSelection";
import type { PaperEvaluation } from "@/hooks/useEvaluations";
import { toast } from "sonner";

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
  const [lastRefreshTime, setLastRefreshTime] = useState<Date>(new Date());
  
  // Create a memoized callback for refreshing files
  const refreshFiles = useCallback(async () => {
    try {
      const now = new Date();
      // Limit refreshes to at most once every 2 seconds
      if (now.getTime() - lastRefreshTime.getTime() < 2000) {
        return;
      }
      
      console.log("Refreshing files in StudentAnswerSheetsCard");
      setLastRefreshTime(now);
      
      // Force refresh storage
      await forceRefreshStorage();
      
      // Update the refresh trigger with a slight delay
      setTimeout(() => {
        setRefreshTrigger(prev => prev + 1);
      }, 500);
      
      // Dispatch a global event to notify other components
      const event = new CustomEvent('filesRefreshed', {
        detail: { source: 'StudentAnswerSheetsCard', timestamp: now.toISOString() }
      });
      document.dispatchEvent(event);
    } catch (error) {
      console.error("Error refreshing files:", error);
    }
  }, [lastRefreshTime]);
  
  // Listen for any kind of refresh events
  useEffect(() => {
    const handleRefreshEvent = () => {
      console.log('Refresh event received in StudentAnswerSheetsCard');
      refreshFiles();
    };
    
    const events = [
      'answerSheetUploaded',
      'testFileUploaded',
      'testFileAssigned',
      'filesRefreshed'
    ];
    
    events.forEach(event => {
      document.addEventListener(event, handleRefreshEvent);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleRefreshEvent);
      });
    };
  }, [refreshFiles]);

  // Periodic storage refresh
  useEffect(() => {
    const interval = setInterval(refreshFiles, 30000); // Every 30 seconds
    return () => clearInterval(interval);
  }, [refreshFiles]);

  // Initial refresh when component mounts or test changes
  useEffect(() => {
    refreshFiles();
    
    // Set up more frequent initial refreshes to catch any missed updates
    const initialRefreshTimes = [2000, 5000, 10000]; // 2, 5, and 10 seconds after mount
    
    const timeouts = initialRefreshTimes.map(time => 
      setTimeout(refreshFiles, time)
    );
    
    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [selectedTest, refreshFiles]);

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
    
    console.log(`Checking test files availability: ${JSON.stringify(testFiles.map(f => f.topic))}`);
    console.log(`Test files ready: ${questionPapers.length > 0 && answerKeys.length > 0} (${questionPapers.length} question papers, ${answerKeys.length} answer keys)`);
    
    return { questionPapers, answerKeys };
  }, [testFiles]);

  const areTestFilesReady = questionPapers.length > 0 && answerKeys.length > 0;

  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  const handleClearSearch = () => {
    setSearchQuery("");
  };

  const handleTestFilesUploaded = async () => {
    try {
      // Trigger a refresh of the component
      console.log("Test files uploaded, triggering refresh in StudentAnswerSheetsCard");
      
      // Force refresh storage
      await forceRefreshStorage();
      
      // Update the refresh trigger
      setRefreshTrigger(prev => prev + 1);
      
      // Dispatch a global event
      const event = new CustomEvent('filesRefreshed', {
        detail: { source: 'StudentAnswerSheetsCard', timestamp: new Date().toISOString() }
      });
      document.dispatchEvent(event);
      
      toast.success("Test files refreshed successfully");
    } catch (error) {
      console.error("Error refreshing test files:", error);
      toast.error("Failed to refresh test files");
    }
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
