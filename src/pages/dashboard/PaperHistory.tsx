
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Eye, FileText } from "lucide-react";
import { useSubjects } from "@/hooks/test-selection/useSubjects";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PaperHistory() {
  const [papers, setPapers] = useState<any[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<any[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<any | null>(null);
  const [isPaperDialogOpen, setIsPaperDialogOpen] = useState(false);
  const { subjects } = useSubjects();
  const navigate = useNavigate();
  
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        const { data, error } = await supabase
          .from("generated_questions")
          .select("*, subjects(name)")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          // Map the data to include subject_name from the subjects join
          const mappedData = data.map((paper: any) => ({
            ...paper,
            subject_name: paper.subjects?.name || "Unknown Subject",
            questionCount: Array.isArray(paper.questions) ? paper.questions.length : 0
          }));
          
          setPapers(mappedData);
          setFilteredPapers(mappedData);
          
          // Extract unique topics
          const topics = Array.from(new Set(mappedData.map(paper => paper.topic)));
          setTopicOptions(topics);
        }
      } catch (error: any) {
        console.error("Error fetching papers:", error);
        toast.error("Failed to load question history");
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
  
  const viewPaperDetails = (paper: any) => {
    setSelectedPaper(paper);
    setIsPaperDialogOpen(true);
  };
  
  const handleDeleteTopic = async (id: string) => {
    try {
      const { error } = await supabase
        .from("generated_questions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Topic questions deleted successfully");
      
      // Refresh the papers list
      setPapers(prevPapers => prevPapers.filter(p => p.id !== id));
      setFilteredPapers(prevPapers => prevPapers.filter(p => p.id !== id));
      
      if (selectedPaper?.id === id) {
        setSelectedPaper(null);
        setIsPaperDialogOpen(false);
      }
    } catch (error: any) {
      console.error("Error deleting topic:", error);
      toast.error("Failed to delete topic questions");
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
          <h1 className="text-3xl font-bold">Questions History</h1>
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
          <CardTitle>Generated Questions</CardTitle>
          <CardDescription>
            View your previously generated questions by topic
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading question history...</div>
          ) : filteredPapers.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No questions found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/dashboard/paper-generation")}
              >
                Generate New Questions
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
                      {paper.questionCount}
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
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteTopic(paper.id)}
                        >
                          <FileText className="h-4 w-4" />
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
      
      {/* Topic Questions Dialog */}
      <Dialog open={isPaperDialogOpen} onOpenChange={setIsPaperDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedPaper && (
            <>
              <DialogHeader>
                <DialogTitle>Topic Questions: {selectedPaper.topic}</DialogTitle>
                <DialogDescription>
                  {selectedPaper.subject_name} - Created on {format(new Date(selectedPaper.created_at), "dd MMM yyyy")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-4">Questions ({Array.isArray(selectedPaper.questions) ? selectedPaper.questions.length : 0})</h3>
                
                {selectedPaper && Array.isArray(selectedPaper.questions) ? (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {selectedPaper.questions.map((question: any, idx: number) => (
                      <div 
                        key={question.id || idx} 
                        className="p-3 border rounded-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium mb-2">
                              Q{idx + 1}. {question.text}
                            </p>
                            <div className="flex flex-wrap gap-2">
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
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No questions available</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
