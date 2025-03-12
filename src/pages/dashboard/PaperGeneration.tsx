
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
import { Download, Eye } from "lucide-react";
import { format } from "date-fns";

export default function PaperGeneration() {
  const [selectedTab, setSelectedTab] = useState<string>("generate");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<GeneratedPaper[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const { subjects } = useSubjects();
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
        
        setPapers(mappedData as GeneratedPaper[]);
        setFilteredPapers(mappedData as GeneratedPaper[]);
      }
    } catch (error: any) {
      console.error("Error fetching papers:", error);
      toast.error("Failed to load paper history");
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
    
    // Find the subject object from the selected ID
    const subject = subjects.find(s => s.id === selectedSubject);
    
    // Navigate to question generation page with the necessary data
    navigate("/dashboard/paper-generation/create", { 
      state: { 
        subjectId: selectedSubject,
        subjectName: subject?.name || "",
        subjectCode: subject?.subject_code || "",
        topicName: topicName.trim() 
      } 
    });
  };

  const handleView = (paperUrl: string) => {
    window.open(paperUrl, '_blank');
  };
  
  const handleDownload = (paperUrl: string) => {
    window.open(paperUrl, '_blank');
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
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name} ({subject.subject_code})
                      </SelectItem>
                    ))}
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
                disabled={isLoading}
              >
                {isLoading ? "Loading..." : "Continue"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Generated Papers</CardTitle>
              <CardDescription>
                View and download your previously generated test papers
              </CardDescription>
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
                    {subjects.map((subject) => (
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
                <div className="text-center py-8">
                  <p className="text-gray-500">No papers found</p>
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
                              onClick={() => handleView(paper.paper_url)}
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
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
