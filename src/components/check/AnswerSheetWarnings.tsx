
import { AlertCircle } from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";
import { TestPaperUploadDialog } from "@/components/test/TestPaperUploadDialog";
import { toast } from "sonner";
import { forceRefreshStorage } from "@/utils/fileStorage/storageHelpers";

interface AnswerSheetWarningsProps {
  areTestFilesReady: boolean;
  evaluatingStudents: string[];
  evaluationProgress: number;
  testId?: string;
  onTestFilesUploaded?: () => void;
}

export function AnswerSheetWarnings({ 
  areTestFilesReady, 
  evaluatingStudents, 
  evaluationProgress,
  testId,
  onTestFilesUploaded
}: AnswerSheetWarningsProps) {
  const [openUploadDialog, setOpenUploadDialog] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshTime, setLastRefreshTime] = useState<Date | null>(null);

  // Listen for test file upload events
  useEffect(() => {
    const handleTestFileEvent = (event: Event) => {
      console.log(`Test file event received: ${(event as CustomEvent).type}`);
      
      // Set a minimum time between refreshes to prevent too many refreshes
      const now = new Date();
      const shouldRefresh = !lastRefreshTime || 
                           (now.getTime() - lastRefreshTime.getTime() > 2000);
      
      if (shouldRefresh && onTestFilesUploaded) {
        console.log("Triggering test files refresh");
        setLastRefreshTime(now);
        refreshTestFiles();
      }
    };
    
    // Listen for multiple events that should trigger a refresh
    const events = [
      'testFileUploaded',
      'testFileAssigned',
      'filesRefreshed'
    ];
    
    events.forEach(event => {
      document.addEventListener(event, handleTestFileEvent);
    });
    
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleTestFileEvent);
      });
    };
  }, [onTestFilesUploaded, lastRefreshTime]);
  
  // Force refresh every 10 seconds when upload dialog is open
  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | null = null;
    
    if (openUploadDialog) {
      interval = setInterval(() => {
        refreshTestFiles();
      }, 10000);
    }
    
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [openUploadDialog]);

  // Initial refresh on component mount
  useEffect(() => {
    if (onTestFilesUploaded) {
      refreshTestFiles();
    }
  }, []);

  const refreshTestFiles = async () => {
    if (!onTestFilesUploaded) return;
    
    setIsRefreshing(true);
    
    try {
      console.log("Refreshing test files from AnswerSheetWarnings");
      
      // First force a storage refresh
      await forceRefreshStorage();
      
      // Then trigger the callback
      onTestFilesUploaded();
      
      // Schedule additional refreshes to ensure files are loaded
      setTimeout(() => {
        onTestFilesUploaded();
      }, 2000);
      
      setTimeout(() => {
        onTestFilesUploaded();
      }, 5000);
    } catch (error) {
      console.error("Error refreshing test files:", error);
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleUploadSuccess = () => {
    toast.success("Test papers uploaded successfully");
    refreshTestFiles();
  };

  return (
    <>
      {!areTestFilesReady && testId && (
        <div className="mx-6 my-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg shadow-sm">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-500 flex-shrink-0 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-amber-800 dark:text-amber-400">
                Missing test files
              </p>
              <p className="text-xs text-amber-700 dark:text-amber-500 mt-1 mb-3">
                Both question paper and answer key are required to evaluate student answers.
              </p>
              <Button 
                variant="outline" 
                size="sm" 
                className="border-amber-200 bg-amber-100 hover:bg-amber-200 dark:border-amber-800 dark:bg-amber-900/40 dark:hover:bg-amber-900/60 text-amber-900 dark:text-amber-400"
                onClick={() => setOpenUploadDialog(true)}
              >
                Upload Test Files
              </Button>
            </div>
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

      {/* Upload Dialog */}
      {testId && (
        <TestPaperUploadDialog
          testId={testId}
          isOpen={openUploadDialog}
          onOpenChange={setOpenUploadDialog}
          onSuccess={handleUploadSuccess}
        />
      )}
    </>
  );
}
