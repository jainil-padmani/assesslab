
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Edit, Trash, Copy } from "lucide-react";
import { PaperFormat, PaperSection } from "@/types/papers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { Json } from "@/integrations/supabase/types";

export default function PaperFormats() {
  const navigate = useNavigate();
  const [paperFormats, setPaperFormats] = useState<PaperFormat[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaperFormats();
  }, []);

  const fetchPaperFormats = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('paper_formats')
        .select('*');

      if (error) throw error;
      
      // Convert database fields to PaperFormat type
      const formattedData: PaperFormat[] = (data || []).map(item => {
        // Handle sections conversion safely
        let sections: PaperSection[] = [];
        
        if (item.sections) {
          // Try to parse sections data
          try {
            const sectionsData = Array.isArray(item.sections) ? item.sections : JSON.parse(typeof item.sections === 'string' ? item.sections : '[]');
            
            if (Array.isArray(sectionsData)) {
              // Validate and convert each section
              sections = sectionsData.map(section => {
                // Ensure questions array exists and is properly typed
                const questions = Array.isArray(section.questions) 
                  ? section.questions.map(q => ({
                      id: String(q.id || ''),
                      number: String(q.number || ''),
                      text: String(q.text || ''),
                      marks: Number(q.marks || 0),
                      level: String(q.level || ''),
                      courseOutcome: q.courseOutcome !== undefined ? Number(q.courseOutcome) : undefined,
                      subQuestions: Array.isArray(q.subQuestions) ? q.subQuestions : [],
                      selectedQuestion: q.selectedQuestion
                    }))
                  : [];
                
                return {
                  id: String(section.id || ''),
                  title: String(section.title || ''),
                  instructions: section.instructions ? String(section.instructions) : undefined,
                  questions: questions
                };
              });
            }
          } catch (e) {
            console.error("Error parsing sections:", e);
          }
        }
        
        return {
          id: item.id,
          title: item.title,
          subject_id: item.subject_id,
          totalMarks: item.total_marks,
          duration: item.duration,
          headerText: item.header_text,
          footerText: item.footer_text,
          sections: sections,
          created_at: item.created_at,
          user_id: item.user_id
        };
      });
      
      setPaperFormats(formattedData);
    } catch (error) {
      console.error("Error fetching paper formats:", error);
      toast.error("Failed to load paper formats");
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (id: string) => {
    // Not implemented yet - will be added in future
    toast.info("Edit functionality coming soon");
  };

  const handleDuplicate = (format: PaperFormat) => {
    // Not implemented yet - will be added in future
    toast.info("Duplicate functionality coming soon");
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('paper_formats')
        .delete()
        .eq('id', id);

      if (error) throw error;

      setPaperFormats(paperFormats.filter(format => format.id !== id));
      toast.success("Paper format deleted successfully");
    } catch (error) {
      console.error("Error deleting paper format:", error);
      toast.error("Failed to delete paper format");
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Paper Formats</h1>
        <p className="text-muted-foreground">
          Manage your paper formats that define the structure of question papers
        </p>
      </div>

      <div className="flex justify-end">
        <Button onClick={() => navigate("/dashboard/question-paper-builder/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Format
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      ) : paperFormats.length === 0 ? (
        <div className="bg-card rounded-lg border p-6 flex flex-col items-center justify-center h-48 text-center">
          <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No paper formats created yet</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => navigate("/dashboard/question-paper-builder/create")}
          >
            Create your first paper format
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {paperFormats.map(format => (
            <Card key={format.id}>
              <CardHeader className="pb-3">
                <CardTitle className="truncate">{format.title}</CardTitle>
                <CardDescription>
                  {format.totalMarks} marks • {format.duration} min
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Sections:</span>
                    <span>{format.sections.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Questions:</span>
                    <span>
                      {format.sections.reduce((total, section) => total + section.questions.length, 0)}
                    </span>
                  </div>
                  {format.created_at && (
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{formatDistanceToNow(new Date(format.created_at), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(format.id)}>
                  <Edit className="h-3.5 w-3.5 mr-1" />
                  Edit
                </Button>
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleDuplicate(format)}>
                  <Copy className="h-3.5 w-3.5 mr-1" />
                  Duplicate
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-none aspect-square p-0" 
                  onClick={() => handleDelete(format.id)}
                >
                  <Trash className="h-3.5 w-3.5 text-destructive" />
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
