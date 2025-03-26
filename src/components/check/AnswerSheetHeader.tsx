
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileCheck, DownloadCloud } from "lucide-react";

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
  return (
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
  );
}
