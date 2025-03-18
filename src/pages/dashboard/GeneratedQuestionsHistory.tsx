
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Trash2, ArrowLeft, Eye } from "lucide-react";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Question } from "@/types/papers";
import { useNavigate } from "react-router-dom";

interface GeneratedQuestion {
  id: string;
  topic: string;
  subject_id: string;
  subject_name?: string;
  questions: Question[] | any;
  created_at: string;
}

export default function GeneratedQuestionsHistory() {
  const [questions, setQuestions] = useState<GeneratedQuestion[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedQuestion, setSelectedQuestion] = useState<GeneratedQuestion | null>(null);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [questionToDelete, setQuestionToDelete] = useState<GeneratedQuestion | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchGeneratedQuestions();
  }, []);

  const fetchGeneratedQuestions = async () => {
    try {
      setIsLoading(true);
      const { data, error } = await supabase
        .from("generated_questions")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });

      if (error) throw error;

      if (data) {
        const mappedData = data.map((item: any) => ({
          ...item,
          subject_name: item.subjects?.name || "Unknown Subject",
        }));
        
        setQuestions(mappedData);
      }
    } catch (error: any) {
      console.error("Error fetching generated questions:", error);
      toast.error("Failed to load generated questions history");
    } finally {
      setIsLoading(false);
    }
  };

  const handleViewQuestionDetails = (question: GeneratedQuestion) => {
    setSelectedQuestion(question);
  };

  const confirmDeleteQuestion = (question: GeneratedQuestion, e: React.MouseEvent) => {
    e.stopPropagation();
    setQuestionToDelete(question);
    setIsDeleteDialogOpen(true);
  };

  const handleDeleteQuestion = async () => {
    if (!questionToDelete) return;
    
    try {
      const { error } = await supabase
        .from('generated_questions')
        .delete()
        .eq('id', questionToDelete.id);
        
      if (error) throw error;
      
      toast.success('Questions deleted successfully');
      fetchGeneratedQuestions();
      setIsDeleteDialogOpen(false);
      setQuestionToDelete(null);
      
      if (selectedQuestion && selectedQuestion.id === questionToDelete.id) {
        setSelectedQuestion(null);
      }
    } catch (error: any) {
      console.error('Error deleting questions:', error);
      toast.error('Failed to delete questions');
    }
  };

  const goBack = () => {
    navigate("/dashboard/paper-generation");
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={goBack}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-3xl font-bold">Generated Questions History</h1>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>History</CardTitle>
          <CardDescription>
            View your previously generated questions
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-10">
              <div className="animate-pulse text-muted-foreground">Loading history...</div>
            </div>
          ) : questions.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-muted-foreground">No generated questions found</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Topic</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {questions.map((question) => (
                  <TableRow 
                    key={question.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewQuestionDetails(question)}
                  >
                    <TableCell className="font-medium">{question.topic}</TableCell>
                    <TableCell>{question.subject_name}</TableCell>
                    <TableCell>{format(new Date(question.created_at), "dd MMM yyyy")}</TableCell>
                    <TableCell>
                      {Array.isArray(question.questions) ? question.questions.length : 'Unknown'} questions
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleViewQuestionDetails(question);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="ghost" 
                          size="icon"
                          onClick={(e) => confirmDeleteQuestion(question, e)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!selectedQuestion} onOpenChange={(open) => !open && setSelectedQuestion(null)}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          {selectedQuestion && (
            <>
              <DialogHeader>
                <DialogTitle>Questions: {selectedQuestion.topic}</DialogTitle>
                <DialogDescription>
                  {selectedQuestion.subject_name} - Created on {format(new Date(selectedQuestion.created_at), "dd MMM yyyy")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4 mt-4">
                {selectedQuestion && Array.isArray(selectedQuestion.questions) ? (
                  <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                    {(selectedQuestion.questions as Question[]).map((question, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 border rounded-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium">
                              Q{idx + 1}. {question.text}
                            </p>
                            
                            {/* Display multiple choice options if available */}
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
                            
                            {/* Display answer if available */}
                            {question.answer && (
                              <div className="mt-2 pl-4">
                                <p className="text-sm font-medium">Answer:</p>
                                <p className="text-sm">{question.answer}</p>
                              </div>
                            )}
                            
                            <div className="mt-1 flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {question.type}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {question.level}
                              </span>
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {question.marks} marks
                              </span>
                              {question.courseOutcome && (
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  CO{question.courseOutcome}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No questions available</p>
                )}
              </div>
              
              <DialogFooter className="flex justify-between items-center mt-4">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setSelectedQuestion(null);
                    setQuestionToDelete(selectedQuestion);
                    setIsDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Questions
                </Button>
                <Button variant="outline" onClick={() => setSelectedQuestion(null)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete these questions? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex space-x-2 pt-4">
            <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteQuestion}>
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
