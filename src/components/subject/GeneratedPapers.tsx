
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Download, Eye, FileQuestion } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Subject } from "@/types/dashboard";

interface GeneratedPapersProps {
  subject: Subject;
}

interface GeneratedPaper {
  id: string;
  created_at: string;
  topic: string;
  paper_url: string;
  questions: any[];
}

export function GeneratedPapers({ subject }: GeneratedPapersProps) {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(null);
  const [questionsDialogOpen, setQuestionsDialogOpen] = useState(false);
  const [uniqueTopics, setUniqueTopics] = useState<string[]>([]);
  const [selectedTopic, setSelectedTopic] = useState<string | null>(null);

  useEffect(() => {
    if (subject?.id) {
      fetchGeneratedPapers();
    }
  }, [subject]);

  useEffect(() => {
    // Extract unique topics from papers
    if (papers.length > 0) {
      const topics = [...new Set(papers.map(paper => paper.topic))];
      setUniqueTopics(topics);
      setSelectedTopic(topics[0]); // Select the first topic by default
    } else {
      setUniqueTopics([]);
      setSelectedTopic(null);
    }
  }, [papers]);

  const fetchGeneratedPapers = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        return;
      }
      
      const { data, error } = await supabase
        .from('generated_papers')
        .select('*')
        .eq('subject_id', subject.id)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      setPapers(data || []);
    } catch (error) {
      console.error("Error fetching generated papers:", error);
      toast.error("Failed to load generated papers");
    } finally {
      setLoading(false);
    }
  };

  const handleViewQuestions = (paper: GeneratedPaper) => {
    setSelectedPaper(paper);
    setQuestionsDialogOpen(true);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Filter papers by selected topic
  const filteredPapers = selectedTopic 
    ? papers.filter(paper => paper.topic === selectedTopic)
    : papers;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Generated Papers</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-4">Loading papers...</div>
        ) : papers.length === 0 ? (
          <div className="text-center py-10">
            <FileQuestion className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
            <p className="text-muted-foreground">No papers generated for this subject yet</p>
          </div>
        ) : (
          <>
            <div className="flex gap-2 flex-wrap mb-4">
              {uniqueTopics.map(topic => (
                <Button
                  key={topic}
                  variant={selectedTopic === topic ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedTopic(topic)}
                >
                  {topic}
                </Button>
              ))}
            </div>
            
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Questions</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredPapers.map((paper) => (
                  <TableRow key={paper.id}>
                    <TableCell>{formatDate(paper.created_at)}</TableCell>
                    <TableCell>{paper.questions?.length || 0} questions</TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewQuestions(paper)}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Questions
                      </Button>
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
          </>
        )}
        
        <Dialog open={questionsDialogOpen} onOpenChange={setQuestionsDialogOpen}>
          <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Questions from {selectedPaper?.topic}</DialogTitle>
              <DialogDescription>
                Generated on {selectedPaper && formatDate(selectedPaper.created_at)}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 mt-4">
              {selectedPaper?.questions.map((question, index) => (
                <div key={index} className="border p-4 rounded-md">
                  <div className="flex justify-between">
                    <span className="text-sm text-muted-foreground capitalize">
                      {question.level} - {question.type}
                    </span>
                  </div>
                  <p className="mt-2">{question.text}</p>
                  {question.answer && (
                    <div className="mt-2 pt-2 border-t">
                      <p className="text-sm font-medium">Answer:</p>
                      <p className="text-sm">{question.answer}</p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  );
}
