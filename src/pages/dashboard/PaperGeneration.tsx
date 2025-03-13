
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubjects } from "@/hooks/test-selection/useSubjects";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedPaper, Question } from "@/types/papers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, Eye, FileX, ExternalLink, History, FileText, File } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PaperGeneration() {
  const [selectedTab, setSelectedTab] = useState<string>("generate");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<GeneratedPaper[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(null);
  const { subjects, isLoading: isSubjectsLoading } = useSubjects();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedTab === "history") {
      fetchPapers();
    }
  }, [selectedTab]);

  useEffect(() => {
    if (selectedSubject && papers.length > 0) {
      setFilteredPapers(papers.filter(paper => paper.subject_id === selectedSubject));
    } else {
      setFilteredPapers(papers);
    }
  }, [selectedSubject, papers]);

  const fetchPapers = async () => {
    try {
      setIsHistoryLoading(true);
      console.log("Fetching papers...");
      const { data, error } = await supabase
        .from("generated_papers")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false })
        .limit(5); // Only get the most recent 5 papers for the quick view
      
      if (error) {
        console.error("Error fetching papers:", error);
        throw error;
      }
      
      console.log("Papers data:", data);
      
      if (data) {
        const mappedData = data.map((paper: any) => ({
          ...paper,
          subject_name: paper.subjects?.name || "Unknown Subject",
          questions: paper.questions as Question[] | any
        }));
        
        setPapers(mappedData as GeneratedPaper[]);
        setFilteredPapers(mappedData as GeneratedPaper[]);
      } else {
        setPapers([]);
        setFilteredPapers([]);
      }
    } catch (error: any) {
      console.error("Error fetching papers:", error);
      toast.error("Failed to load paper history");
      setPapers([]);
      setFilteredPapers([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }
    
    if (!topicName.trim()) {
      toast.error("Please enter a topic or chapter name");
      return;
    }

    setIsLoading(true);
    
    const subject = subjects.find(s => s.id === selectedSubject);
    
    navigate("/dashboard/paper-generation/create", { 
      state: { 
        subjectId: selectedSubject,
        subjectName: subject?.name || "",
        subjectCode: subject?.subject_code || "",
        topicName: topicName.trim() 
      } 
    });
  };

  const handleViewPaperDetails = (paper: GeneratedPaper) => {
    setSelectedPaper(paper);
  };

  const handleDownload = (paper: GeneratedPaper) => {
    // Prefer PDF if available, otherwise use HTML
    const downloadUrl = paper.pdf_url || paper.paper_url;
    window.open(downloadUrl, '_blank');
  };

  const generateDocx = async () => {
    if (!selectedPaper) return;
    
    try {
      toast.info("Downloading document...");
      
      // Prefer PDF if available, otherwise use HTML
      const downloadUrl = selectedPaper.pdf_url || selectedPaper.paper_url;
      window.open(downloadUrl, '_blank');
      
      toast.success("Document ready for download");
    } catch (error) {
      console.error("Error downloading document:", error);
      toast.error("Failed to download document");
    }
  };

  const viewFullHistory = () => {
    navigate("/dashboard/paper-generation/history");
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Test Paper Generation</h1>
      
      <Tabs defaultValue="generate" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-2 w-[400px] mb-6">
          <TabsTrigger value="generate">Generate New Paper</TabsTrigger>
          <TabsTrigger value="history">Paper History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Topic Details</CardTitle>
              <CardDescription>
                Select a subject and enter a topic or chapter name to generate a test paper
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSubjectsLoading ? (
                      <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                    ) : subjects.length === 0 ? (
                      <SelectItem value="none" disabled>No subjects available</SelectItem>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.subject_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topic">Topic or Chapter Name</Label>
                <Input
                  id="topic"
                  placeholder="Enter topic or chapter name"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleContinue} 
                disabled={isLoading || isSubjectsLoading}
              >
                {isLoading ? "Loading..." : "Continue"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Generated Papers</CardTitle>
                <CardDescription>
                  View and download your previously generated test papers
                </CardDescription>
              </div>
              <Button 
                variant="outline" 
                onClick={viewFullHistory}
                className="flex items-center gap-1"
              >
                <History className="h-4 w-4" />
                View Full History
              </Button>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="filter-subject">Filter by subject</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger id="filter-subject">
                    <SelectValue placeholder="All subjects" />
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
              
              {isHistoryLoading ? (
                <div className="text-center py-8">Loading paper history...</div>
              ) : filteredPapers.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center">
                  <FileX className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No papers found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSelectedTab("generate")}
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
                              onClick={() => handleViewPaperDetails(paper)}
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
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedPaper} onOpenChange={(open) => !open && setSelectedPaper(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedPaper && (
            <>
              <DialogHeader>
                <DialogTitle>Paper Details: {selectedPaper.topic}</DialogTitle>
                <DialogDescription>
                  {selectedPaper.subject_name} - Created on {selectedPaper && format(new Date(selectedPaper.created_at), "dd MMM yyyy")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Questions</h3>
                  
                  {selectedPaper && Array.isArray(selectedPaper.questions) ? (
                    <div className="space-y-3 max-h-[50vh] overflow-y-auto">
                      {(selectedPaper.questions as Question[]).map((question, idx) => (
                        <div 
                          key={idx} 
                          className="p-3 border rounded-md"
                        >
                          <div className="flex items-start">
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium">
                                Q{idx + 1}. {question.text}
                              </p>
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
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500">No questions available</p>
                  )}
                </div>
                
                <div className="space-y-4">
                  <h3 className="text-lg font-medium">Paper Preview</h3>
                  
                  <div className="aspect-[3/4] border rounded-md overflow-hidden bg-white">
                    {selectedPaper ? (
                      selectedPaper.pdf_url ? (
                        <iframe 
                          src={selectedPaper.pdf_url} 
                          className="w-full h-full"
                          title="Generated Paper PDF"
                        />
                      ) : (
                        <iframe 
                          src={selectedPaper.paper_url} 
                          className="w-full h-full"
                          title="Generated Paper HTML"
                        />
                      )
                    ) : (
                      <div className="flex items-center justify-center h-full">
                        <p className="text-gray-500">No preview available</p>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex flex-wrap gap-2 justify-center mt-4">
                    {selectedPaper && selectedPaper.pdf_url && (
                      <Button onClick={() => window.open(selectedPaper.pdf_url!, '_blank')}>
                        <File className="mr-2 h-4 w-4" />
                        View PDF
                      </Button>
                    )}
                    <Button onClick={() => window.open(selectedPaper.paper_url, '_blank')}>
                      <FileText className="mr-2 h-4 w-4" />
                      View {selectedPaper?.pdf_url ? 'HTML' : 'Paper'}
                    </Button>
                    <Button onClick={generateDocx}>
                      <Download className="mr-2 h-4 w-4" />
                      Download Document
                    </Button>
                    <Button variant="outline" onClick={() => setSelectedPaper(null)}>
                      Close
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
