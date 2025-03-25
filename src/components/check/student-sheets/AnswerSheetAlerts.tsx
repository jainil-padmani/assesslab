
import { AlertCircle, Loader2 } from "lucide-react";
import { Progress } from "@/components/ui/progress";

interface AlertsProps {
  areTestFilesReady: boolean;
  evaluatingStudents: string[];
  evaluationProgress: number;
}

export function AnswerSheetAlerts({
  areTestFilesReady,
  evaluatingStudents,
  evaluationProgress
}: AlertsProps) {
  return (
    <>
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
    </>
  );
}
