
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Edit, Trash, Copy } from "lucide-react";
import { PaperFormat } from "@/types/papers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";

export default function PaperFormats() {
  const navigate = useNavigate();
  const [paperFormats, setPaperFormats] = useState<(PaperFormat & { created_at?: string })[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchPaperFormats();
  }, []);

  const fetchPaperFormats = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .rpc('get_paper_formats'); // Using RPC to avoid type issues

      if (error) throw error;

      // Fallback if RPC is not created yet, use direct query
      if (!data) {
        const { data: directData, error: directError } = await supabase
          .from('paper_formats')
          .select('*');
        
        if (directError) throw directError;
        setPaperFormats(directData || []);
      } else {
        setPaperFormats(data);
      }
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

  const handleDuplicate = (format: PaperFormat & { created_at?: string }) => {
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
