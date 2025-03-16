
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileText, Plus, Edit, Trash, Download, ExternalLink, ChevronLeft, Calendar, Clock, LayoutGrid, FileSpreadsheet, Filter } from "lucide-react";
import { PaperFormat, PaperSection } from "@/types/papers";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow, format as dateFormat } from "date-fns";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTestFormData } from "@/hooks/useTestFormData";
import { Badge } from "@/components/ui/badge";

export default function PaperHistory() {
  const navigate = useNavigate();
  const [paperFormats, setPaperFormats] = useState<PaperFormat[]>([]);
  const [loading, setLoading] = useState(true);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [showPreview, setShowPreview] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
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
        
      // Only apply filter if not "all" subjects
      if (selectedSubject && selectedSubject !== "all") {
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

  // Get subject name by ID
  const getSubjectName = (subjectId: string) => {
    const subject = subjects.find(s => s.id === subjectId);
    return subject?.name || "Unknown Subject";
  };

  // Format date helper function
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "—";
    try {
      return dateFormat(new Date(dateString), "MMM d, yyyy");
    } catch (error) {
      console.error("Error formatting date:", error);
      return "Invalid date";
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard/question-paper-builder")}
            className="hover:bg-muted"
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

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-muted/30 p-4 rounded-lg border">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="h-4 w-4 text-muted-foreground" />
          <Select 
            value={selectedSubject} 
            onValueChange={setSelectedSubject}
          >
            <SelectTrigger className="w-full sm:w-[250px]">
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects && subjects.length > 0 ? subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              )) : (
                <SelectItem value="no-subjects" disabled>No subjects available</SelectItem>
              )}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <span className="text-sm text-muted-foreground">View as:</span>
          <div className="border rounded-md flex">
            <Button 
              variant={viewMode === "table" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("table")}
              className="rounded-r-none"
            >
              <FileSpreadsheet className="h-4 w-4" />
            </Button>
            <Button 
              variant={viewMode === "grid" ? "secondary" : "ghost"} 
              size="sm" 
              onClick={() => setViewMode("grid")}
              className="rounded-l-none"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading papers...</div>
        </div>
      ) : paperFormats.length === 0 ? (
        <Card className="border-dashed border-2">
          <div className="p-6 flex flex-col items-center justify-center text-center py-16">
            <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
            <h3 className="text-lg font-medium mb-2">No question papers found</h3>
            <p className="text-muted-foreground mb-4">Create your first question paper to get started</p>
            <Button
              onClick={() => navigate("/dashboard/question-paper-builder/create")}
              className="gap-2"
            >
              <Plus className="h-4 w-4" />
              Create Question Paper
            </Button>
          </div>
        </Card>
      ) : viewMode === "table" ? (
        <Card>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Paper Title</TableHead>
                <TableHead>Subject</TableHead>
                <TableHead className="hidden md:table-cell">Date Created</TableHead>
                <TableHead className="hidden md:table-cell">Format</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {paperFormats.map((format) => (
                <TableRow key={format.id} className="hover:bg-muted/50">
                  <TableCell className="font-medium">{format.title}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{getSubjectName(format.subject_id)}</Badge>
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    {formatDate(format.created_at)}
                  </TableCell>
                  <TableCell className="hidden md:table-cell">
                    <div className="flex flex-col gap-1 text-sm">
                      <span>{format.totalMarks} marks</span>
                      <span className="text-muted-foreground">{format.duration} min</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleEdit(format.id)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          const pdfUrl = format.pdfUrl || await generatePdf(format);
                          if (pdfUrl) handlePreview(pdfUrl);
                        }}
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={async () => {
                          const pdfUrl = format.pdfUrl || await generatePdf(format);
                          if (pdfUrl) handleDownload(pdfUrl, format.title);
                        }}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleDelete(format.id)}
                      >
                        <Trash className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {paperFormats.map(format => (
            <Card key={format.id} className="overflow-hidden hover:shadow-md transition-all">
              <CardHeader className="bg-muted/20 border-b">
                <CardTitle className="text-xl truncate">{format.title}</CardTitle>
                <CardDescription className="flex justify-between items-center">
                  <Badge variant="outline">{getSubjectName(format.subject_id)}</Badge>
                  <span className="text-sm font-medium flex items-center gap-1">
                    {format.totalMarks} marks • {format.duration} min
                  </span>
                </CardDescription>
              </CardHeader>
              <CardContent className="py-4">
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
                    <div className="flex justify-between items-center">
                      <span className="text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3.5 w-3.5" />
                        Created:
                      </span>
                      <span>{formatDistanceToNow(new Date(format.created_at), { addSuffix: true })}</span>
                    </div>
                  )}
                </div>
              </CardContent>
              <CardFooter className="flex gap-2 pt-0 border-t bg-muted/10">
                <Button variant="outline" size="sm" className="flex-1" onClick={() => handleEdit(format.id)}>
                  <Edit className="h-4 w-4 mr-1" />
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
                  <ExternalLink className="h-4 w-4 mr-1" />
                  View
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
                  <Download className="h-4 w-4 mr-1" />
                  Save
                </Button>
                <Button 
                  variant="outline" 
                  size="icon"
                  onClick={() => handleDelete(format.id)}
                >
                  <Trash className="h-4 w-4 text-destructive" />
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
