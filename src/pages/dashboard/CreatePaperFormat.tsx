
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useForm } from "react-hook-form";
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
import { ChevronLeft, Plus, Trash, Save } from "lucide-react";
import { v4 as uuidv4 } from 'uuid';
import { PaperFormat, PaperSection, PaperQuestion } from "@/types/papers";
import { PaperFormatBuilder } from "@/components/paper/PaperFormatBuilder";
import { toast } from "sonner";

export default function CreatePaperFormat() {
  const navigate = useNavigate();
  const [paperFormat, setPaperFormat] = useState<PaperFormat>({
    id: uuidv4(),
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

  const handleSavePaperFormat = async () => {
    if (!paperFormat.title || !paperFormat.subject_id) {
      toast.error("Please fill all required fields");
      return;
    }

    try {
      toast.success("Paper format saved successfully!");
      // Here we would normally save the format to the database
      // For now, we'll just navigate back
      navigate("/dashboard/question-paper-builder/formats");
    } catch (error) {
      toast.error("Failed to save paper format");
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
            onClick={() => navigate("/dashboard/question-paper-builder")}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">Create Paper Format</h1>
        </div>
        <Button onClick={handleSavePaperFormat}>
          <Save className="mr-2 h-4 w-4" />
          Save Format
        </Button>
      </div>

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
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="subject-1">Mathematics</SelectItem>
                    <SelectItem value="subject-2">Physics</SelectItem>
                    <SelectItem value="subject-3">Chemistry</SelectItem>
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
          />
        </div>
      </div>
    </div>
  );
}
