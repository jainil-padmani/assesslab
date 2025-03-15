
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { GeneratedPaper, Question } from "@/types/papers";
import { File, FileText } from "lucide-react";
import { format } from "date-fns";

interface PaperDetailsDialogProps {
  isPaperDialogOpen: boolean;
  setIsPaperDialogOpen: (open: boolean) => void;
  selectedPaper: GeneratedPaper | null;
  selectedQuestions: Record<string, boolean>;
  toggleQuestionSelection: (questionId: string) => void;
  handleSelectAllQuestions: (selectAll: boolean) => void;
  isGeneratingCustomPaper: boolean;
  generateCustomPaper: () => void;
}

export function PaperDetailsDialog({
  isPaperDialogOpen,
  setIsPaperDialogOpen,
  selectedPaper,
  selectedQuestions,
  toggleQuestionSelection,
  handleSelectAllQuestions,
  isGeneratingCustomPaper,
  generateCustomPaper
}: PaperDetailsDialogProps) {
  if (!selectedPaper) return null;

  return (
    <Dialog open={isPaperDialogOpen} onOpenChange={setIsPaperDialogOpen}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Paper: {selectedPaper.topic}</DialogTitle>
          <DialogDescription>
            {selectedPaper.subject_name} - Created on {format(new Date(selectedPaper.created_at), "dd MMM yyyy")}
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
          {/* Questions Selection */}
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-lg font-medium">Questions</h3>
              <div className="flex items-center gap-2 text-sm">
                <Button variant="outline" size="sm" onClick={() => handleSelectAllQuestions(true)}>
                  Select All
                </Button>
                <Button variant="outline" size="sm" onClick={() => handleSelectAllQuestions(false)}>
                  Deselect All
                </Button>
              </div>
            </div>
            
            {Array.isArray(selectedPaper.questions) ? (
              <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                {(selectedPaper.questions as Question[]).map((question, idx) => (
                  <div 
                    key={idx} 
                    className={`p-3 border rounded-md ${selectedQuestions[question.id] ? 'border-primary bg-primary/5' : ''}`}
                  >
                    <div className="flex items-start space-x-3">
                      <Checkbox 
                        id={`question-${question.id}`}
                        checked={selectedQuestions[question.id] || false}
                        onCheckedChange={() => toggleQuestionSelection(question.id)}
                        className="mt-1"
                      />
                      <div className="flex-1">
                        <Label htmlFor={`question-${question.id}`} className="cursor-pointer">
                          <div className="font-medium">Q{idx + 1}. {question.text}</div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                              {question.type}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                              {question.level}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                              {question.marks} marks
                            </span>
                            {question.courseOutcome && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                CO{question.courseOutcome}
                              </span>
                            )}
                          </div>
                        </Label>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-gray-500">No questions available</p>
            )}
          </div>
          
          {/* Paper Preview */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Paper Preview</h3>
            
            <div className="aspect-[3/4] border rounded-md overflow-hidden bg-white">
              {selectedPaper.pdf_url ? (
                <iframe 
                  src={selectedPaper.pdf_url} 
                  className="w-full h-full"
                  title="Generated Paper PDF"
                />
              ) : (
                <iframe 
                  src={selectedPaper.paper_url} 
                  className="w-full h-full"
                  title="Generated Paper"
                />
              )}
            </div>
            
            <div className="flex justify-center gap-2">
              {selectedPaper.pdf_url && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => window.open(selectedPaper.pdf_url!, '_blank')}
                  className="flex items-center gap-1"
                >
                  <File className="h-4 w-4" />
                  View PDF
                </Button>
              )}
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => window.open(selectedPaper.paper_url, '_blank')}
                className="flex items-center gap-1"
              >
                <FileText className="h-4 w-4" />
                View HTML
              </Button>
            </div>
          </div>
        </div>
        
        <DialogFooter className="flex justify-between items-center gap-2 mt-4">
          <div className="text-sm text-muted-foreground">
            {Array.isArray(selectedPaper.questions) && 
             Object.values(selectedQuestions).filter(Boolean).length} of {Array.isArray(selectedPaper.questions) ? (selectedPaper.questions as Question[]).length : 0} questions selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsPaperDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={generateCustomPaper}
              disabled={isGeneratingCustomPaper || Object.values(selectedQuestions).filter(Boolean).length === 0}
            >
              {isGeneratingCustomPaper ? 'Generating...' : 'Generate Custom Paper'}
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
