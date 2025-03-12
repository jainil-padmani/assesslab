
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { Download, Eye, ArrowLeft } from "lucide-react";
import { useSubjects } from "@/hooks/test-selection/useSubjects";
import { GeneratedPaper, Question } from "@/types/papers";

export default function PaperHistory() {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<GeneratedPaper[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { subjects } = useSubjects(); // No argument needed
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
    if (selectedSubject) {
      setFilteredPapers(papers.filter(paper => paper.subject_id === selectedSubject));
    } else {
      setFilteredPapers(papers);
    }
  }, [selectedSubject, papers]);
  
  const handleView = (paperUrl: string) => {
    window.open(paperUrl, '_blank');
  };
  
  const handleDownload = (paperUrl: string) => {
    window.open(paperUrl, '_blank');
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
        
        <div className="mt-4 md:mt-0 w-full md:w-64">
          <Select 
            value={selectedSubject} 
            onValueChange={setSelectedSubject}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by subject" />
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
    </div>
  );
}
