
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BookOpen, Upload, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import type { Subject, BloomsTaxonomy } from "@/types/dashboard";

export default function Generate() {
  const [file, setFile] = useState<File | null>(null);
  const [questionType, setQuestionType] = useState<string>("mcq");
  const [numQuestions, setNumQuestions] = useState<number>(10);
  const [isLoading, setIsLoading] = useState(false);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [bloomsLevels, setBloomsLevels] = useState<BloomsTaxonomy>({
    remember: 0,
    understand: 0,
    apply: 0,
    analyze: 0,
    evaluate: 0,
    create: 0
  });

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

  const handleBloomLevelChange = (level: keyof BloomsTaxonomy, value: string) => {
    const numValue = parseInt(value) || 0;
    setBloomsLevels(prev => ({
      ...prev,
      [level]: numValue
    }));
  };

  const handleGenerate = async () => {
    if (!file) {
      toast.error('Please upload a file first');
      return;
    }

    if (!selectedSubject) {
      toast.error('Please select a subject');
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

      // Process with OpenAI
      const response = await fetch('/api/process-document', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'generate_questions',
          content: {
            fileUrl: publicUrl,
            questionType,
            numQuestions,
            bloomsTaxonomy: bloomsLevels,
            subjectId: selectedSubject
          }
        })
      });

      if (!response.ok) throw new Error('Failed to generate questions');

      const responseData = await response.json();

      // Navigate to results page
      navigate('/dashboard/questions', { 
        state: { 
          questions: responseData,
          documentUrl: publicUrl,
          bloomsTaxonomy: bloomsLevels
        } 
      });
    } catch (error: any) {
      toast.error(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Generate Questions</h1>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Upload className="h-5 w-5 text-accent" />
            Upload Study Material
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="subject">Select Subject</Label>
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
          <div className="grid gap-2">
            <Label htmlFor="file">Upload File (PDF, PPT, DOCX)</Label>
            <Input 
              id="file" 
              type="file" 
              accept=".pdf,.pptx,.docx"
              onChange={handleFileChange}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-accent" />
            Question Parameters
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-2">
            <Label htmlFor="type">Question Type</Label>
            <select
              id="type"
              className="w-full rounded-md border border-input bg-background px-3 py-2"
              value={questionType}
              onChange={(e) => setQuestionType(e.target.value)}
            >
              <option value="mcq">Multiple Choice</option>
              <option value="short">Short Answer</option>
              <option value="long">Long Answer</option>
              <option value="mixed">Mixed</option>
            </select>
          </div>
          <div className="grid gap-2">
            <Label htmlFor="number">Number of Questions</Label>
            <Input
              id="number"
              type="number"
              min="1"
              max="50"
              value={numQuestions}
              onChange={(e) => setNumQuestions(parseInt(e.target.value))}
            />
          </div>
          <div className="space-y-4">
            <Label>Bloom's Taxonomy Distribution</Label>
            {Object.entries(bloomsLevels).map(([level, value]) => (
              <div key={level} className="grid gap-2">
                <Label htmlFor={level} className="capitalize">{level}</Label>
                <Input
                  id={level}
                  type="number"
                  min="0"
                  max="100"
                  value={value.toString()}
                  onChange={(e) => handleBloomLevelChange(level as keyof BloomsTaxonomy, e.target.value)}
                />
              </div>
            ))}
          </div>
          <Button 
            className="w-full bg-accent hover:bg-accent/90"
            onClick={handleGenerate}
            disabled={isLoading}
          >
            {isLoading ? (
              "Generating..."
            ) : (
              <>
                <FileText className="mr-2 h-4 w-4" />
                Generate Questions
              </>
            )}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
