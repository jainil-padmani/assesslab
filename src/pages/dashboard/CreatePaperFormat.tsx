
import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { 
  Form, 
  FormControl, 
  FormDescription, 
  FormField, 
  FormItem, 
  FormLabel, 
  FormMessage 
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, Plus, Trash, Save, Download } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { PaperFormat, PaperSection, PaperQuestion } from "@/types/papers";
import { PaperFormatBuilder } from "@/components/paper/PaperFormatBuilder";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useTestFormData } from "@/hooks/useTestFormData";
import { CourseOutcome } from "@/types/dashboard";

export default function CreatePaperFormat() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const { subjects } = useTestFormData();
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [paperFormat, setPaperFormat] = useState<PaperFormat>({
    id: id || uuidv4(),
    title: "",
    subject_id: "",
    totalMarks: 0,
    duration: 60,
    sections: [
      {
        id: uuidv4(),
        title: "Section A",
        instructions: "Answer all questions",
        questions: []
      }
    ]
  });
  const [loading, setLoading] = useState(false);
  const isEditMode = !!id;

  // Fetch existing paper format if in edit mode
  useEffect(() => {
    if (isEditMode) {
      fetchPaperFormat();
    }
  }, [id]);

  // Fetch course outcomes when subject changes
  useEffect(() => {
    if (paperFormat.subject_id) {
      fetchCourseOutcomes(paperFormat.subject_id);
    } else {
      setCourseOutcomes([]);
    }
  }, [paperFormat.subject_id]);

  const fetchPaperFormat = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('paper_formats')
        .select('*')
        .eq('id', id)
        .single();

      if (error) throw error;
      
      if (data) {
        // Parse sections data
        let sections: PaperSection[] = [];
        
        if (data.sections) {
          try {
            const sectionsData = Array.isArray(data.sections) 
              ? data.sections 
              : JSON.parse(typeof data.sections === 'string' ? data.sections : '[]');
            
            if (Array.isArray(sectionsData)) {
              sections = sectionsData;
            }
          } catch (e) {
            console.error("Error parsing sections:", e);
          }
        }
        
        setPaperFormat({
          id: data.id,
          title: data.title,
          subject_id: data.subject_id,
          totalMarks: data.total_marks,
          duration: data.duration,
          headerText: data.header_text,
          footerText: data.footer_text,
          sections: sections,
          created_at: data.created_at,
          user_id: data.user_id,
          pdfUrl: data.pdf_url
        });
      }
    } catch (error) {
      console.error("Error fetching paper format:", error);
      toast.error("Failed to load paper format");
    } finally {
      setLoading(false);
    }
  };

  const fetchCourseOutcomes = async (subjectId: string) => {
    try {
      const { data, error } = await supabase
        .from('course_outcomes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('co_number', { ascending: true });

      if (error) throw error;
      
      setCourseOutcomes(data || []);
    } catch (error) {
      console.error("Error fetching course outcomes:", error);
      toast.error("Failed to load course outcomes");
    }
  };

  // Handlers for paper format changes
  const updatePaperTitle = (title: string) => {
    setPaperFormat(prev => ({ ...prev, title }));
  };

  const updatePaperSubject = (subject_id: string) => {
    setPaperFormat(prev => ({ ...prev, subject_id }));
  };

  const updatePaperDuration = (duration: number) => {
    setPaperFormat(prev => ({ ...prev, duration }));
  };

  const updatePaperHeaderText = (headerText: string) => {
    setPaperFormat(prev => ({ ...prev, headerText }));
  };

  const updatePaperFooterText = (footerText: string) => {
    setPaperFormat(prev => ({ ...prev, footerText }));
  };

  const generatePdf = async () => {
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
        
        // Update local state
        setPaperFormat(prev => ({
          ...prev,
          pdfUrl: response.data.pdfUrl
        }));
        
        toast.success("PDF generated successfully");
        return response.data.pdfUrl;
      }
      
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Failed to generate PDF");
      return null;
    }
  };

  const handleDownload = (pdfUrl: string | undefined) => {
    if (pdfUrl) {
      const link = document.createElement('a');
      link.href = pdfUrl;
      link.download = `${paperFormat.title.replace(/\s+/g, '_')}.pdf`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } else {
      toast.error("No PDF available for download");
    }
  };

  const handleSavePaperFormat = async () => {
    if (!paperFormat.title || !paperFormat.subject_id) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You must be logged in to save a paper format");
        return;
      }

      // Convert paperFormat to the database schema format
      const dbPaperFormat = {
        id: paperFormat.id,
        title: paperFormat.title,
        subject_id: paperFormat.subject_id,
        total_marks: paperFormat.totalMarks,
        duration: paperFormat.duration,
        header_text: paperFormat.headerText,
        footer_text: paperFormat.footerText,
        sections: paperFormat.sections,
        user_id: user.id,
        pdf_url: paperFormat.pdfUrl
      };

      let response;
      
      if (isEditMode) {
        // Update existing record
        response = await supabase
          .from('paper_formats')
          .update(dbPaperFormat)
          .eq('id', paperFormat.id);
      } else {
        // Insert new record
        response = await supabase
          .from('paper_formats')
          .insert(dbPaperFormat);
      }

      if (response.error) throw response.error;
      
      toast.success(isEditMode ? "Paper updated successfully!" : "Paper saved successfully!");
      navigate("/dashboard/question-paper-builder/history");
    } catch (error) {
      toast.error(isEditMode ? "Failed to update paper" : "Failed to save paper");
      console.error(error);
    }
  };

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate("/dashboard/question-paper-builder/history")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? "Edit Question Paper" : "Create Question Paper"}
          </h1>
        </div>
        <div className="flex gap-2">
          {paperFormat.pdfUrl && (
            <Button variant="outline" onClick={() => handleDownload(paperFormat.pdfUrl)}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </Button>
          )}
          <Button variant="outline" onClick={generatePdf}>
            <Download className="mr-2 h-4 w-4" />
            Generate PDF
          </Button>
          <Button onClick={handleSavePaperFormat}>
            <Save className="mr-2 h-4 w-4" />
            Save Paper
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-pulse text-muted-foreground">Loading...</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Paper Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Paper Title</label>
                  <Input 
                    placeholder="Enter paper title" 
                    value={paperFormat.title}
                    onChange={(e) => updatePaperTitle(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Subject</label>
                  <Select 
                    value={paperFormat.subject_id} 
                    onValueChange={updatePaperSubject}
                    disabled={isEditMode} // Disable subject change in edit mode
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select subject" />
                    </SelectTrigger>
                    <SelectContent>
                      {subjects.map(subject => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Duration (minutes)</label>
                  <Input 
                    type="number" 
                    min={15} 
                    step={5} 
                    value={paperFormat.duration}
                    onChange={(e) => updatePaperDuration(parseInt(e.target.value))}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Header Text</label>
                  <Textarea 
                    placeholder="Enter header text" 
                    value={paperFormat.headerText || ""}
                    onChange={(e) => updatePaperHeaderText(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-sm font-medium">Footer Text</label>
                  <Textarea 
                    placeholder="Enter footer text" 
                    value={paperFormat.footerText || ""}
                    onChange={(e) => updatePaperFooterText(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="md:col-span-2">
            <PaperFormatBuilder 
              paperFormat={paperFormat} 
              setPaperFormat={setPaperFormat} 
              courseOutcomes={courseOutcomes}
            />
          </div>
        </div>
      )}
    </div>
  );
}
