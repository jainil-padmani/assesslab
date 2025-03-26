
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Check, Edit, Trash2 } from "lucide-react";
import { GeneratedPaper, Question } from "@/types/papers";
import { format } from "date-fns";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

export interface QuestionHistoryProps {
  papers?: GeneratedPaper[];
  fetchPapers?: () => Promise<void>;
  viewMode?: 'grid' | 'list';
  enableFiltering?: boolean;
  showViewAll?: boolean;
  onViewAllClick?: () => void;
}

export function QuestionHistory({ 
  papers = [], 
  fetchPapers = async () => {}, 
  viewMode = 'list',
  enableFiltering = false,
  showViewAll = false,
  onViewAllClick = () => {}
}: QuestionHistoryProps) {
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [paperToDelete, setPaperToDelete] = useState<GeneratedPaper | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [editedAnswer, setEditedAnswer] = useState<string>("");

  const confirmDeletePaper = (paper: GeneratedPaper, e: React.MouseEvent) => {
    e.stopPropagation();
    setPaperToDelete(paper);
    setIsDeleteDialogOpen(true);
  };

  const handleDeletePaper = async () => {
    if (!paperToDelete) return;
    
    try {
      const { error } = await supabase
        .from('generated_papers')
        .delete()
        .eq('id', paperToDelete.id);
        
      if (error) throw error;
      
      toast.success('Paper deleted successfully');
      fetchPapers();
      setIsDeleteDialogOpen(false);
      setPaperToDelete(null);
      
      if (selectedPaper && selectedPaper.id === paperToDelete.id) {
        setSelectedPaper(null);
      }
    } catch (error: any) {
      console.error('Error deleting paper:', error);
      toast.error('Failed to delete paper');
    }
  };

  const handleViewPaperDetails = (paper: GeneratedPaper) => {
    setSelectedPaper(paper);
  };

  const handleEditAnswer = (question: Question) => {
    setEditingQuestion(question);
    setEditedAnswer(question.answer || "");
  };

  const saveEditedAnswer = async () => {
    if (!editingQuestion || !selectedPaper) return;
    
    try {
      const updatedQuestions = selectedPaper.questions as Question[];
      const questionIndex = updatedQuestions.findIndex(q => q.id === editingQuestion.id);
      
      if (questionIndex >= 0) {
        updatedQuestions[questionIndex] = {
          ...updatedQuestions[questionIndex],
          answer: editedAnswer
        };
        
        const { error } = await supabase
          .from('generated_papers')
          .update({ questions: updatedQuestions })
          .eq('id', selectedPaper.id);
          
        if (error) throw error;
        
        setSelectedPaper({
          ...selectedPaper,
          questions: updatedQuestions
        });
        
        toast.success("Answer updated successfully");
      }
    } catch (error) {
      console.error("Error updating answer:", error);
      toast.error("Failed to update answer");
    } finally {
      setEditingQuestion(null);
      setEditedAnswer("");
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Generated Question History</CardTitle>
          <CardDescription>
            Previously generated questions for your subjects
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Topic</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead>Created</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {papers.map((paper) => (
                <TableRow key={paper.id} className="cursor-pointer hover:bg-muted/50" onClick={() => handleViewPaperDetails(paper)}>
                  <TableCell className="font-medium">{paper.topic}</TableCell>
                  <TableCell>{paper.subject_name}</TableCell>
                  <TableCell>{format(new Date(paper.created_at), "PPP")}</TableCell>
                  <TableCell>
                    {Array.isArray(paper.questions) ? paper.questions.length : "N/A"}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={(e) => confirmDeletePaper(paper, e)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* View Paper Dialog */}
      <Dialog open={!!selectedPaper} onOpenChange={(open) => !open && setSelectedPaper(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedPaper && (
            <>
              <DialogHeader>
                <DialogTitle>Questions for: {selectedPaper.topic}</DialogTitle>
                <DialogDescription>
                  Generated on {format(new Date(selectedPaper.created_at), "PPP")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 my-4">
                {Array.isArray(selectedPaper.questions) && selectedPaper.questions.map((question: Question, index: number) => (
                  <div key={question.id} className="p-4 border rounded-md">
                    <div className="flex items-start">
                      <div className="flex-1">
                        <p className="text-sm font-medium">
                          Q{index + 1}. {question.text}
                        </p>
                        
                        {question.options && (
                          <div className="mt-2 space-y-1 pl-4">
                            {question.options.map((option, idx) => (
                              <div key={idx} className={`text-sm ${option.isCorrect ? 'font-bold text-green-600' : ''}`}>
                                {String.fromCharCode(65 + idx)}. {option.text}
                                {option.isCorrect && " ✓"}
                              </div>
                            ))}
                          </div>
                        )}
                        
                        {question.answer && (
                          <div className="mt-2 pl-4">
                            {editingQuestion?.id === question.id ? (
                              <div className="space-y-2">
                                <Label htmlFor="edit-answer">Edit Answer</Label>
                                <Textarea
                                  id="edit-answer"
                                  value={editedAnswer}
                                  onChange={(e) => setEditedAnswer(e.target.value)}
                                  className="min-h-[100px]"
                                />
                                <div className="flex justify-end gap-2 mt-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => setEditingQuestion(null)}
                                  >
                                    Cancel
                                  </Button>
                                  <Button 
                                    size="sm"
                                    onClick={saveEditedAnswer}
                                    className="flex items-center"
                                  >
                                    <Check className="h-3 w-3 mr-1" />
                                    Save
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <>
                                <div className="flex items-center justify-between">
                                  <p className="text-sm font-medium">Answer:</p>
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    className="h-8 px-2"
                                    onClick={() => handleEditAnswer(question)}
                                  >
                                    <Edit className="h-3 w-3 mr-1" />
                                    Edit
                                  </Button>
                                </div>
                                <p className="text-sm mt-1">{question.answer}</p>
                              </>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this test paper? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePaper}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
