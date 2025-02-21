
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

export default function Analysis() {
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validTypes.includes(fileType)) {
        toast.error('Please upload PDF, PPT, or DOCX files only');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    if (!file) {
      toast.error('Please upload a file first');
      return;
    }

    setIsLoading(true);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(fileName, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(fileName);

      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'analyze_paper',
          content: { fileUrl: publicUrl }
        })
      });

      if (!response.ok) throw new Error('Failed to analyze paper');

      const analysis = await response.json();
      navigate('/dashboard/analysis-result', { state: { analysis } });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Question Paper Analysis</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            Upload Question Paper
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="file">Upload File (PDF, PPT, DOCX)</Label>
            <Input 
              id="file" 
              type="file" 
              accept=".pdf,.pptx,.docx"
              onChange={handleFileChange}
            />
          </div>
          <Button
            className="w-full bg-accent hover:bg-accent/90"
            onClick={handleAnalyze}
            disabled={isLoading}
          >
            {isLoading ? (
              "Analyzing..."
            ) : (
              <>
                <Brain className="mr-2 h-4 w-4" />
                Analyze Paper
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
