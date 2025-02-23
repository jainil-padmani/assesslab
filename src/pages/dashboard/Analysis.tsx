
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Brain, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function Analysis() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const fileType = selectedFile.type;
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];
      
      if (!validTypes.includes(fileType)) {
        toast.error('Please upload PDF or DOCX files only');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      let content;

      if (file) {
        const fileExt = file.name.split('.').pop();
        const fileName = `${crypto.randomUUID()}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from('documents')
          .upload(fileName, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
          .from('documents')
          .getPublicUrl(fileName);

        content = { fileUrl: publicUrl };
      } else if (text.trim()) {
        content = { text: text.trim() };
      } else {
        throw new Error('Please upload a file or enter text to analyze');
      }

      const response = await supabase.functions.invoke('process-document', {
        body: {
          action: 'analyze_paper',
          content
        }
      });

      if (response.error) {
        throw new Error(response.error.message || 'Failed to analyze paper');
      }

      const analysis = response.data;
      navigate('/dashboard/analysis-result', { state: { analysis } });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Question Paper Analysis</h1>
      <Tabs defaultValue="file" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="file">Upload File</TabsTrigger>
          <TabsTrigger value="text">Enter Text</TabsTrigger>
        </TabsList>
        <TabsContent value="file">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Upload className="h-5 w-5 text-accent" />
                Upload Question Paper
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="file">Upload File (PDF or DOCX)</Label>
                <Input 
                  id="file" 
                  type="file" 
                  accept=".pdf,.docx"
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
        </TabsContent>
        <TabsContent value="text">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-accent" />
                Enter Question Paper Text
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="text">Question Paper Text</Label>
                <Textarea
                  id="text"
                  placeholder="Paste your question paper text here..."
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  className="min-h-[200px]"
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
                    Analyze Text
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
