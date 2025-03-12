
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Download, Eye } from "lucide-react";
import { GeneratedPaper } from "@/types/papers";
import { toast } from "sonner";

interface GeneratedPapersProps {
  subjectId: string;
}

export function GeneratedPapers({ subjectId }: GeneratedPapersProps) {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
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
          setPapers(data as GeneratedPaper[]);
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
  
  const handleView = (paperUrl: string) => {
    window.open(paperUrl, '_blank');
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
          <div className="text-center py-8">
            <p className="text-gray-500">No papers generated for this subject yet</p>
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
                  <TableCell>{paper.questions.length}</TableCell>
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
  );
}
