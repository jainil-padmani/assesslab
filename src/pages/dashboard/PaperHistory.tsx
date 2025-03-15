
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, Eye, ArrowLeft, FileText, File } from "lucide-react";
import { useSubjects } from "@/hooks/test-selection/useSubjects";
import { GeneratedPaper, Question } from "@/types/papers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";

export default function PaperHistory() {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<GeneratedPaper[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});
  const [isPaperDialogOpen, setIsPaperDialogOpen] = useState(false);
  const [isGeneratingCustomPaper, setIsGeneratingCustomPaper] = useState(false);
  const { subjects } = useSubjects();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const { data, error } = await supabase
          .from("generated_papers")
          .select("*, subjects(name)")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          // Map the data to include subject_name from the subjects join
          const mappedData = data.map((paper: any) => ({
            ...paper,
            subject_name: paper.subjects?.name || "Unknown Subject",
            questions: paper.questions as Question[] | any // Cast to the union type
          }));
          
          setPapers(mappedData);
          setFilteredPapers(mappedData);
          
          // Extract unique topics
          const topics = Array.from(new Set(mappedData.map(paper => paper.topic)));
          setTopicOptions(topics);
        }
      } catch (error: any) {
        console.error("Error fetching papers:", error);
        toast.error("Failed to load paper history");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPapers();
  }, []);
  
  useEffect(() => {
    // Filter papers based on selected subject and topic
    let filtered = [...papers];
    
    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject_id === selectedSubject);
      
      // Update topic options based on selected subject
      const subjectTopics = Array.from(new Set(
        papers
          .filter(paper => paper.subject_id === selectedSubject)
          .map(paper => paper.topic)
      ));
      setTopicOptions(subjectTopics);
      
      // Clear topic selection if the current selection is not in the new options
      if (selectedTopic && !subjectTopics.includes(selectedTopic)) {
        setSelectedTopic("");
      }
    } else {
      // Reset topic options if no subject is selected
      const allTopics = Array.from(new Set(papers.map(paper => paper.topic)));
      setTopicOptions(allTopics);
    }
    
    if (selectedTopic) {
      filtered = filtered.filter(paper => paper.topic === selectedTopic);
    }
    
    setFilteredPapers(filtered);
  }, [selectedSubject, selectedTopic, papers]);
  
  const viewPaperDetails = (paper: GeneratedPaper) => {
    setSelectedPaper(paper);
    
    // Initialize selected questions (all selected by default)
    if (Array.isArray(paper.questions)) {
      const initialSelected = {};
      (paper.questions as Question[]).forEach(q => {
        initialSelected[q.id] = true;
      });
      setSelectedQuestions(initialSelected);
    }
    
    setIsPaperDialogOpen(true);
  };
  
  const handleDownload = (paper: GeneratedPaper) => {
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
      const subject = subjects.find(s => s.id === selectedPaper.subject_id);
      
      const response = await supabase.functions.invoke('generate-paper', {
        body: {
          subjectName: subject?.name || selectedPaper.subject_name || "Subject",
          subjectCode: subject?.subject_code || "",
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
      setIsPaperDialogOpen(false);
    } catch (error: any) {
      console.error("Error generating custom paper:", error);
      toast.error("Failed to generate custom paper");
    } finally {
      setIsGeneratingCustomPaper(false);
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard/paper-generation")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold">Paper Generation History</h1>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-64">
            <Select 
              value={selectedSubject} 
              onValueChange={setSelectedSubject}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Subjects</SelectItem>
                {subjects && subjects.length > 0 && subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          <div className="w-full md:w-64">
            <Select 
              value={selectedTopic} 
              onValueChange={setSelectedTopic}
              disabled={topicOptions.length === 0}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by topic" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">All Topics</SelectItem>
                {topicOptions.map((topic) => (
                  <SelectItem key={topic} value={topic}>
                    {topic}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Generated Papers</CardTitle>
          <CardDescription>
            View and download your previously generated test papers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading paper history...</div>
          ) : filteredPapers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No papers found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/dashboard/paper-generation")}
              >
                Generate New Paper
              </Button>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Subject</TableHead>
                  <TableHead>Topic</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPapers.map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell>
                      {format(new Date(paper.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{paper.subject_name}</TableCell>
                    <TableCell>{paper.topic}</TableCell>
                    <TableCell>
                      {Array.isArray(paper.questions) ? paper.questions.length : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => viewPaperDetails(paper)}
                        >
                          <Eye className="h-4 w-4" />
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
      </Card>
      
      {/* Paper Details Dialog */}
      <Dialog open={isPaperDialogOpen} onOpenChange={setIsPaperDialogOpen}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {selectedPaper && (
            <>
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
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
