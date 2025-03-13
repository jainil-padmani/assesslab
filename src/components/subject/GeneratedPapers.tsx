
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Download, Eye, FileX, FileText, File, Pencil } from "lucide-react";
import { GeneratedPaper, Question } from "@/types/papers";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

interface GeneratedPapersProps {
  subjectId: string;
}

export function GeneratedPapers({ subjectId }: GeneratedPapersProps) {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(null);
  const [openViewDialog, setOpenViewDialog] = useState(false);
  const [openEditDialog, setOpenEditDialog] = useState(false);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});
  const [isGeneratingCustomPaper, setIsGeneratingCustomPaper] = useState(false);
  
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
    setOpenViewDialog(true);
  };
  
  const handleEdit = (paper: GeneratedPaper) => {
    setSelectedPaper(paper);
    
    // Initialize selected questions (all selected by default)
    if (Array.isArray(paper.questions)) {
      const initialSelected = {};
      paper.questions.forEach(q => {
        initialSelected[q.id] = true;
      });
      setSelectedQuestions(initialSelected);
    }
    
    setOpenEditDialog(true);
  };
  
  const handleDownload = (paper: GeneratedPaper) => {
    // Prefer PDF if available
    const downloadUrl = paper.pdf_url || paper.paper_url;
    window.open(downloadUrl, '_blank');
  };
  
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };
  
  const handleSelectAllQuestions = (selectAll: boolean) => {
    if (!selectedPaper || !Array.isArray(selectedPaper.questions)) return;
    
    const newSelection = {};
    (selectedPaper.questions as Question[]).forEach(q => {
      newSelection[q.id] = selectAll;
    });
    setSelectedQuestions(newSelection);
  };
  
  const generateCustomPaper = async () => {
    if (!selectedPaper) return;
    
    // Get the selected questions
    const questions = Array.isArray(selectedPaper.questions) 
      ? (selectedPaper.questions as Question[]).filter(q => selectedQuestions[q.id])
      : [];
    
    if (questions.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    
    setIsGeneratingCustomPaper(true);
    toast.info("Generating custom paper...");
    
    try {
      // Get the subject info to pass to the paper generation function
      const { data: subjectData, error: subjectError } = await supabase
        .from('subjects')
        .select('name, subject_code')
        .eq('id', subjectId)
        .single();
      
      if (subjectError) throw subjectError;
      
      const response = await supabase.functions.invoke('generate-paper', {
        body: {
          subjectName: subjectData?.name || "Subject",
          subjectCode: subjectData?.subject_code || "",
          topicName: selectedPaper.topic,
          headerUrl: selectedPaper.header_url,
          questions: questions
        }
      });
      
      if (response.error) {
        toast.error(`Error creating paper: ${response.error.message}`);
        return;
      }
      
      // Open the generated paper
      if (response.data.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank');
      } else {
        window.open(response.data.paperUrl, '_blank');
      }
      
      toast.success("Custom paper generated successfully");
      setOpenEditDialog(false);
    } catch (error: any) {
      console.error("Error generating custom paper:", error);
      toast.error("Failed to generate custom paper");
    } finally {
      setIsGeneratingCustomPaper(false);
    }
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
                        onClick={() => handleEdit(paper)}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownload(paper)}
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

      {/* View Paper Dialog */}
      <Dialog open={openViewDialog} onOpenChange={setOpenViewDialog}>
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
                  {selectedPaper.pdf_url ? (
                    <iframe 
                      src={selectedPaper.pdf_url} 
                      title={`Paper: ${selectedPaper.topic}`}
                      className="w-full h-full"
                    />
                  ) : (
                    <iframe 
                      src={selectedPaper.paper_url} 
                      title={`Paper: ${selectedPaper.topic}`}
                      className="w-full h-full"
                    />
                  )}
                </div>
                
                {/* Questions List */}
                <div>
                  <h3 className="text-lg font-medium mb-2">Questions ({Array.isArray(selectedPaper.questions) ? selectedPaper.questions.length : 0})</h3>
                  <div className="space-y-2">
                    {Array.isArray(selectedPaper.questions) ? (
                      (selectedPaper.questions as Question[]).map((question, index) => (
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
                            {question.courseOutcome && (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300">
                                CO{question.courseOutcome}
                              </span>
                            )}
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
                  <Button variant="outline" onClick={() => setOpenViewDialog(false)}>
                    Close
                  </Button>
                  <Button onClick={() => handleDownload(selectedPaper)}>
                    <Download className="h-4 w-4 mr-2" />
                    Download Paper
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Paper Dialog */}
      <Dialog open={openEditDialog} onOpenChange={setOpenEditDialog}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedPaper && (
            <>
              <DialogHeader>
                <DialogTitle>Edit Paper: {selectedPaper.topic}</DialogTitle>
                <DialogDescription>
                  Select questions to create a custom version of this paper
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
                  <Button variant="outline" onClick={() => setOpenEditDialog(false)}>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
