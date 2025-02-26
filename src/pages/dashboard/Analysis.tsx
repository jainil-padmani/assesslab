
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Brain, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Subject } from "@/types/dashboard";

export default function Analysis() {
  const [file, setFile] = useState<File | null>(null);
  const [text, setText] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const navigate = useNavigate();

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('*')
        .order('name');

      if (error) throw error;
      if (data) setSubjects(data);
    } catch (error) {
      toast.error('Failed to fetch subjects');
    }
  };

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
    if (!selectedSubject) {
      toast.error('Please select a subject first');
      return;
    }

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

        console.log('File uploaded, URL:', publicUrl);
        content = { fileUrl: publicUrl };
      } else if (text.trim()) {
        content = { text: text.trim() };
      } else {
        throw new Error('Please upload a file or enter text to analyze');
      }

      // Fetch the subject's Bloom's Taxonomy data first
      const { data: subjectBloomsData, error: bloomsError } = await supabase
        .from('answer_keys')
        .select('blooms_taxonomy')
        .eq('subject_id', selectedSubject)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (bloomsError && bloomsError.code !== 'PGRST116') {
        throw bloomsError;
      }

      // Add the subject ID and Bloom's taxonomy data to the analysis request
      const { data, error } = await supabase.functions.invoke('process-document', {
        body: {
          action: 'analyze_paper',
          content,
          subjectId: selectedSubject,
          expectedBloomsTaxonomy: subjectBloomsData?.blooms_taxonomy || null
        }
      });

      console.log('Analysis response:', data);

      if (error) {
        console.error('Analysis error:', error);
        throw new Error(error.message || 'Failed to analyze paper');
      }

      if (!data) {
        throw new Error('No analysis data received');
      }

      // Navigate with the analysis data
      navigate('/dashboard/analysis-result', { 
        state: { 
          analysis: {
            ...data,
            subjectId: selectedSubject,
            expectedBloomsTaxonomy: subjectBloomsData?.blooms_taxonomy || null
          }
        } 
      });
    } catch (error: any) {
      console.error('Analysis error:', error);
      toast.error(error.message || 'Failed to analyze paper');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Question Paper Analysis</h1>
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Select Subject</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2">
            <Label htmlFor="subject">Subject</Label>
            <Select
              value={selectedSubject}
              onValueChange={(value) => setSelectedSubject(value)}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a subject" />
              </SelectTrigger>
              <SelectContent>
                {subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

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
                disabled={isLoading || !selectedSubject}
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
                disabled={isLoading || !selectedSubject}
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
