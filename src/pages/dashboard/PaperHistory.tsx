import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { FileText, Plus, Edit, Trash, Download, ExternalLink, ChevronLeft } from "lucide-react";
import { PaperFormat, PaperSection } from "@/types/papers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTestFormData } from "@/hooks/useTestFormData";

export default function PaperHistory() {
  const navigate = useNavigate();
  const [paperFormats, setPaperFormats] = useState<PaperFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const { subjects } = useTestFormData();

  useEffect(() => {
    fetchPaperFormats();
  }, [selectedSubject]);

  const fetchPaperFormats = async () => {
    try {
      setLoading(true);
      
      let query = supabase
        .from('paper_formats')
        .select('*');
        
      if (selectedSubject) {
        query = query.eq('subject_id', selectedSubject);
      }

      const { data, error } = await query;

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
          user_id: item.user_id,
          pdfUrl: item.pdf_url
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
    navigate(`/dashboard/question-paper-builder/edit/${id}`);
  };

  const handlePreview = (pdfUrl: string | undefined) => {
    if (pdfUrl) {
      setPreviewUrl(pdfUrl);
      setShowPreview(true);
    } else {
      toast.error("No PDF available for preview");
    }
  };

  const handleDownload = (pdfUrl: string | undefined, title: string) => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("No PDF available for download");
    }
  };

  const generatePdf = async (paperFormat: PaperFormat) => {
    try {
      toast.info("Generating PDF, please wait...");
      
      // Get subject name
      const { data: subjectData } = await supabase
        .from('subjects')
        .select('name, subject_code')
        .eq('id', paperFormat.subject_id)
        .single();
      
      if (!subjectData) throw new Error("Subject not found");
      
      // Prepare questions data from sections
      const questions = paperFormat.sections.flatMap(section => 
        section.questions.map(q => ({
          id: q.id,
          text: q.text,
          marks: q.marks,
          level: q.level,
          courseOutcome: q.courseOutcome,
          type: "text"
        }))
      );
      
      // Call the generate-paper edge function
      const response = await supabase.functions.invoke('generate-paper', {
        body: {
          subjectName: subjectData.name,
          subjectCode: subjectData.subject_code,
          topicName: paperFormat.title,
          headerUrl: null,
          questions: questions
        }
      });
      
      if (response.error) throw new Error(response.error);
      
      // Update the paper format with the PDF URL
      if (response.data?.pdfUrl) {
        const { error } = await supabase
          .from('paper_formats')
          .update({ pdf_url: response.data.pdfUrl })
          .eq('id', paperFormat.id);
        
        if (error) throw error;
        
        // Update the local state
        setPaperFormats(prev => 
          prev.map(p => 
            p.id === paperFormat.id 
              ? { ...p, pdfUrl: response.data.pdfUrl } 
              : p
          )
        );
        
        toast.success("PDF generated successfully");
        return response.data.pdfUrl;
      }
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
      return null;
    }
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
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard/question-paper-builder")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Paper History</h1>
        </div>
        <Button onClick={() => navigate("/dashboard/question-paper-builder/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create Paper
        </Button>
      </div>

      <div className="flex justify-end">
        <div className="w-72">
          <Select 
            value={selectedSubject} 
            onValueChange={setSelectedSubject}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      ) : paperFormats.length === 0 ? (
        <div className="bg-card rounded-lg border p-6 flex flex-col items-center justify-center h-48 text-center">
          <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No question papers found</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => navigate("/dashboard/question-paper-builder/create")}
          >
            Create your first question paper
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
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1" 
                  onClick={async () => {
                    const pdfUrl = format.pdfUrl || await generatePdf(format);
                    if (pdfUrl) handlePreview(pdfUrl);
                  }}
                >
                  <ExternalLink className="h-3.5 w-3.5 mr-1" />
                  Preview
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="flex-1" 
                  onClick={async () => {
                    const pdfUrl = format.pdfUrl || await generatePdf(format);
                    if (pdfUrl) handleDownload(pdfUrl, format.title);
                  }}
                >
                  <Download className="h-3.5 w-3.5 mr-1" />
                  Download
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

      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-5xl max-h-[90vh]">
          <DialogHeader>
            <DialogTitle>Paper Preview</DialogTitle>
          </DialogHeader>
          <div className="h-[70vh] w-full">
            {previewUrl && (
              <iframe 
                src={previewUrl} 
                className="w-full h-full border rounded"
                title="Paper Preview"
              />
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowPreview(false)}>Close</Button>
            {previewUrl && (
              <Button onClick={() => handleDownload(previewUrl, "Question Paper")}>
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
