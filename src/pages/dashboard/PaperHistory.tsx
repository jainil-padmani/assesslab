
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, FileText, Search, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useSubjects } from "@/hooks/test-selection/useSubjects";
import { toast } from "sonner";

type GeneratedPaper = {
  id: string;
  created_at: string;
  subject_id: string;
  topic: string;
  paper_url: string;
  questions: any[];
  subjects?: { name: string; subject_code: string; } | null;
};

export default function PaperHistory() {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<GeneratedPaper[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const { subjects } = useSubjects();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPaperHistory();
  }, []);

  useEffect(() => {
    filterPapers();
  }, [selectedSubject, searchTerm, papers]);

  const fetchPaperHistory = async () => {
    setIsLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to view your paper history");
        return;
      }
      
      const { data, error } = await supabase
        .from('generated_papers')
        .select(`
          *,
          subjects:subject_id (
            name,
            subject_code
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPapers(data || []);
      setFilteredPapers(data || []);
    } catch (error) {
      console.error("Error fetching paper history:", error);
      toast.error("Failed to load paper history");
    } finally {
      setIsLoading(false);
    }
  };

  const filterPapers = () => {
    let filtered = [...papers];
    
    // Filter by subject
    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject_id === selectedSubject);
    }
    
    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(paper => 
        paper.topic.toLowerCase().includes(term) ||
        paper.subjects?.name.toLowerCase().includes(term) ||
        paper.subjects?.subject_code.toLowerCase().includes(term)
      );
    }
    
    setFilteredPapers(filtered);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="container mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Generated Papers History</h1>
        <Button onClick={() => navigate("/dashboard/paper-generation")}>
          <Plus className="h-4 w-4 mr-2" />
          Generate New Paper
        </Button>
      </div>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>
            Filter your paper history by subject or search term
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Label htmlFor="subject-filter" className="mb-2 block">Subject</Label>
              <Select 
                value={selectedSubject} 
                onValueChange={setSelectedSubject}
              >
                <SelectTrigger id="subject-filter">
                  <SelectValue placeholder="All Subjects" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All Subjects</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.subject_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex-1">
              <Label htmlFor="search" className="mb-2 block">Search Topic</Label>
              <div className="relative">
                <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search by topic name"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardHeader>
          <CardTitle>Paper History</CardTitle>
          <CardDescription>
            Your previously generated test papers
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Loading paper history...</p>
            </div>
          ) : filteredPapers.length === 0 ? (
            <div className="text-center py-10">
              <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-muted-foreground">No papers found</p>
              <Button 
                variant="outline" 
                className="mt-4"
                onClick={() => navigate("/dashboard/paper-generation")}
              >
                Generate Your First Paper
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
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPapers.map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell>{formatDate(paper.created_at)}</TableCell>
                    <TableCell>
                      {paper.subjects?.name || "Unknown Subject"} 
                      <span className="text-muted-foreground text-xs block">
                        {paper.subjects?.subject_code || ""}
                      </span>
                    </TableCell>
                    <TableCell className="font-medium">{paper.topic}</TableCell>
                    <TableCell>{paper.questions?.length || 0}</TableCell>
                    <TableCell className="text-right">
                      <Button asChild variant="outline" size="sm">
                        <a 
                          href={paper.paper_url} 
                          target="_blank" 
                          rel="noopener noreferrer"
                        >
                          <Download className="h-4 w-4 mr-2" />
                          Paper
                        </a>
                      </Button>
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
