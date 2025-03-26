
import { Button } from "@/components/ui/button";
import { Brain } from "lucide-react";

interface AnswerSheetHeaderProps {
  onEvaluateAll: () => void;
  areTestFilesReady: boolean;
  evaluatingStudents: string[];
}

export function AnswerSheetHeader({ 
  onEvaluateAll, 
  areTestFilesReady,
  evaluatingStudents
}: AnswerSheetHeaderProps) {
  const isEvaluating = evaluatingStudents.length > 0;
  
  return (
    <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-800">
      <div>
        <h3 className="text-lg font-semibold">Student Answer Sheets</h3>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Upload, manage and evaluate answer sheets
        </p>
      </div>
      <Button 
        variant="default" 
        size="sm" 
        onClick={onEvaluateAll}
        disabled={isEvaluating || !areTestFilesReady}
        className="flex items-center"
      >
        <Brain className="mr-2 h-4 w-4" />
        {isEvaluating ? 'Evaluating...' : 'Evaluate All'}
      </Button>
    </div>
  );
}
