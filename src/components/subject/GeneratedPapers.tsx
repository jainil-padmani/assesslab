
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Download, Eye, FileX } from "lucide-react";
import { GeneratedPaper, Question } from "@/types/papers";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface GeneratedPapersProps {
  subjectId: string;
}

export function GeneratedPapers({ subjectId }: GeneratedPapersProps) {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(null);
  const [openDialog, setOpenDialog] = useState(false);
  
  useEffect(() => {
    const fetchPapers = async () => {
      if (!subjectId) return;
      
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("generated_papers")
          .select("*")
          .eq("subject_id", subjectId)
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          // Transform the data to match the GeneratedPaper type
          const typedPapers: GeneratedPaper[] = data.map((paper: any) => ({
            ...paper,
            questions: paper.questions as Question[] | any // Cast to the union type
          }));
          setPapers(typedPapers);
        }
      } catch (error: any) {
        console.error("Error fetching papers:", error);
        toast.error("Failed to load generated papers");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPapers();
  }, [subjectId]);
  
  const handleView = (paper: GeneratedPaper) => {
    setSelectedPaper(paper);
    setOpenDialog(true);
  };
  
  const handleDownload = (paperUrl: string) => {
    window.open(paperUrl, '_blank');
  };
  
  return (
    <Card className="mb-6">
      <CardHeader>
        <CardTitle>Generated Papers</CardTitle>
        <CardDescription>
          View and download papers generated for this subject
        </CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading...</div>
        ) : papers.length === 0 ? (
          <div className="text-center py-8 flex flex-col items-center">
            <FileX className="h-16 w-16 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No papers have been generated for this subject yet</p>
            <p className="text-sm text-muted-foreground mt-2">
              Go to Paper Generation to create your first paper
            </p>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Questions</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {papers.map((paper) => (
                <TableRow key={paper.id}>
                  <TableCell>
                    {format(new Date(paper.created_at), "dd MMM yyyy")}
                  </TableCell>
                  <TableCell>{paper.topic}</TableCell>
                  <TableCell>
                    {Array.isArray(paper.questions) ? paper.questions.length : 'N/A'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleView(paper)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(paper.paper_url)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>

      {/* Paper Details Dialog */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          {selectedPaper && (
            <>
              <DialogHeader>
                <DialogTitle>Paper: {selectedPaper.topic}</DialogTitle>
                <DialogDescription>
                  Created on {format(new Date(selectedPaper.created_at), "dd MMMM yyyy")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6 py-4">
                {/* Paper Preview */}
                <div className="border rounded-md overflow-hidden h-[400px]">
                  <iframe 
                    src={selectedPaper.paper_url} 
                    title={`Paper: ${selectedPaper.topic}`}
                    className="w-full h-full"
                  />
                </div>
                
                {/* Questions List */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Questions ({Array.isArray(selectedPaper.questions) ? selectedPaper.questions.length : 0})</h3>
                  <div className="space-y-2">
                    {Array.isArray(selectedPaper.questions) ? (
                      selectedPaper.questions.map((question: Question, index) => (
                        <div key={index} className="p-3 border rounded-md">
                          <div className="flex justify-between">
                            <div className="font-medium">Q{index + 1}: {question.text}</div>
                            <div className="text-muted-foreground">{question.marks} marks</div>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-2">
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300">
                              {question.type}
                            </span>
                            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300">
                              {question.level}
                            </span>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-muted-foreground text-center py-2">
                        No questions available
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex justify-end gap-4">
                  <Button variant="outline" onClick={() => setOpenDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => handleDownload(selectedPaper.paper_url)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Paper
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
