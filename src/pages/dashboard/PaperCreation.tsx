
import { useState, useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { FileUp, Loader2, File, Download, Save } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { uploadStorageFile, getPublicUrl } from "@/utils/fileStorage/storageHelpers";
import type { BloomsTaxonomy } from "@/types/dashboard";

interface QuestionItem {
  id: string;
  text: string;
  type: string;
  level: string;
  selected: boolean;
}

export default function PaperCreation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjectId, subjectName, subjectCode, topicName } = location.state || {};
  
  const [activeTab, setActiveTab] = useState("upload");
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [footerFile, setFooterFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [contentText, setContentText] = useState("");
  const [headerUrl, setHeaderUrl] = useState("");
  const [footerUrl, setFooterUrl] = useState("");
  const [contentUrl, setContentUrl] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [questions, setQuestions] = useState<QuestionItem[]>([]);
  const [difficultyLevel, setDifficultyLevel] = useState(2);
  const [bloomsTaxonomy, setBloomsTaxonomy] = useState<BloomsTaxonomy | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);
  const [paperContent, setPaperContent] = useState("");
  const [paperUrl, setPaperUrl] = useState("");
  
  const headerInputRef = useRef<HTMLInputElement>(null);
  const footerInputRef = useRef<HTMLInputElement>(null);
  const contentInputRef = useRef<HTMLInputElement>(null);

  // Validate that we have all the required data
  useEffect(() => {
    if (!subjectId || !topicName) {
      toast.error("Missing required information");
      navigate("/dashboard/paper-generation");
      return;
    }
    
    // Fetch the Bloom's taxonomy for the subject
    fetchBloomsTaxonomy();
  }, [subjectId]);

  const fetchBloomsTaxonomy = async () => {
    try {
      const { data, error } = await supabase
        .from('answer_keys')
        .select('blooms_taxonomy')
        .eq('subject_id', subjectId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();

      if (error && error.code !== 'PGRST116') {
        throw error;
      }

      if (data?.blooms_taxonomy) {
        setBloomsTaxonomy(data.blooms_taxonomy);
      } else {
        // Default taxonomy if none exists
        setBloomsTaxonomy({
          remember: 20,
          understand: 20,
          apply: 20,
          analyze: 15,
          evaluate: 15,
          create: 10
        });
      }
    } catch (error) {
      console.error('Error fetching Bloom\'s taxonomy:', error);
    }
  };

  const handleHeaderFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setHeaderFile(e.target.files[0]);
    }
  };

  const handleFooterFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFooterFile(e.target.files[0]);
    }
  };

  const handleContentFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setContentFile(e.target.files[0]);
    }
  };

  const handleUploadFiles = async () => {
    if (!contentFile) {
      toast.error("Please upload content material");
      return;
    }

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const sanitizedTopic = topicName.replace(/\s+/g, '_').toLowerCase();
      
      // Upload the files and get their URLs
      let headerFileUrl = "";
      let footerFileUrl = "";
      let contentFileUrl = "";
      
      if (headerFile) {
        const headerFileName = `${subjectId}_${sanitizedTopic}_header_${timestamp}.${headerFile.name.split('.').pop()}`;
        await uploadStorageFile(headerFileName, headerFile);
        headerFileUrl = getPublicUrl(headerFileName).data.publicUrl;
        setHeaderUrl(headerFileUrl);
      }
      
      if (footerFile) {
        const footerFileName = `${subjectId}_${sanitizedTopic}_footer_${timestamp}.${footerFile.name.split('.').pop()}`;
        await uploadStorageFile(footerFileName, footerFile);
        footerFileUrl = getPublicUrl(footerFileName).data.publicUrl;
        setFooterUrl(footerFileUrl);
      }
      
      if (contentFile) {
        const contentFileName = `${subjectId}_${sanitizedTopic}_content_${timestamp}.${contentFile.name.split('.').pop()}`;
        await uploadStorageFile(contentFileName, contentFile);
        contentFileUrl = getPublicUrl(contentFileName).data.publicUrl;
        setContentUrl(contentFileUrl);
        
        // Extract text from the content file
        await extractContentText(contentFile);
      }
      
      toast.success("Files uploaded successfully");
      setActiveTab("generate");
    } catch (error) {
      console.error("Error uploading files:", error);
      toast.error("Failed to upload files");
    } finally {
      setIsUploading(false);
    }
  };

  const extractContentText = async (file: File) => {
    // For PDFs and DOCs, we'll need to extract text using the edge function
    // For txt files, we can read directly
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    if (fileExt === 'txt') {
      // Direct text extraction for .txt files
      const text = await file.text();
      setContentText(text);
    } else if (fileExt === 'pdf' || fileExt === 'docx' || fileExt === 'doc') {
      // For PDFs and DOCs, we'll call the extract-text edge function
      try {
        const formData = new FormData();
        formData.append('file', file);
        
        const response = await fetch(`${window.location.origin}/api/extract-text`, {
          method: 'POST',
          body: formData
        });
        
        if (!response.ok) {
          throw new Error(`Error extracting text: ${response.statusText}`);
        }
        
        const data = await response.json();
        setContentText(data.text);
      } catch (error) {
        console.error("Error extracting text:", error);
        toast.error("Failed to extract text from file");
        // Fallback: Use a placeholder text
        setContentText("Unable to extract text automatically. Questions will be generated based on the topic.");
      }
    } else {
      // For other formats, use a placeholder
      setContentText("File format not supported for text extraction. Questions will be generated based on the topic.");
    }
  };

  const generateQuestions = async () => {
    if (!contentText && !topicName) {
      toast.error("Missing content for question generation");
      return;
    }
    
    setIsGenerating(true);
    
    try {
      // Prepare the request data
      const requestData = {
        subject: subjectName,
        topic: topicName,
        content: contentText,
        bloomsTaxonomy: bloomsTaxonomy,
        difficulty: difficultyLevel
      };
      
      // Call the question generation edge function
      const { data, error } = await supabase.functions.invoke('generate-questions', {
        body: JSON.stringify(requestData)
      });
      
      if (error) throw error;
      
      // Add selected flag to each question and a unique ID
      const questionsWithSelection = data.questions.map((q: any, index: number) => ({
        ...q,
        id: `q-${index}`,
        selected: false
      }));
      
      setQuestions(questionsWithSelection);
      setActiveTab("select");
      toast.success("Questions generated successfully");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const toggleQuestionSelection = (id: string) => {
    setQuestions(questions.map(q => 
      q.id === id ? { ...q, selected: !q.selected } : q
    ));
  };

  const selectAllQuestions = () => {
    setQuestions(questions.map(q => ({ ...q, selected: true })));
  };

  const unselectAllQuestions = () => {
    setQuestions(questions.map(q => ({ ...q, selected: false })));
  };

  const createPaper = async () => {
    const selectedQuestions = questions.filter(q => q.selected);
    
    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    
    setIsDownloading(true);
    
    try {
      // Prepare the paper generation request
      const requestData = {
        subject: subjectName,
        subjectCode,
        topic: topicName,
        questions: selectedQuestions,
        headerUrl,
        footerUrl
      };
      
      // Call the paper generation edge function
      const { data, error } = await supabase.functions.invoke('generate-paper', {
        body: JSON.stringify(requestData)
      });
      
      if (error) throw error;
      
      // Set the paper content for preview
      setPaperContent(data.paperContent);
      setPaperUrl(data.paperUrl);
      
      // Save the paper to history
      await savePaperToHistory(data.paperUrl, selectedQuestions);
      
      setActiveTab("download");
      toast.success("Paper created successfully");
    } catch (error) {
      console.error("Error creating paper:", error);
      toast.error("Failed to create paper");
    } finally {
      setIsDownloading(false);
    }
  };

  const savePaperToHistory = async (paperUrl: string, selectedQuestions: QuestionItem[]) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error("User not authenticated");
        return;
      }
      
      // Save the generated paper record
      await supabase.from('generated_papers').insert({
        user_id: user.id,
        subject_id: subjectId,
        topic: topicName,
        paper_url: paperUrl,
        questions: selectedQuestions,
        header_url: headerUrl || null,
        footer_url: footerUrl || null,
        content_url: contentUrl || null
      });
    } catch (error) {
      console.error("Error saving paper to history:", error);
    }
  };

  return (
    <div className="container max-w-5xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Create Test Paper</h1>
        <Button variant="outline" onClick={() => navigate("/dashboard/paper-generation")}>
          Back
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>
            {subjectName}: {topicName}
          </CardTitle>
          <CardDescription>
            Follow the steps to create your test paper
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="upload">Upload Files</TabsTrigger>
              <TabsTrigger value="generate" disabled={!contentText && !contentUrl}>Generate Questions</TabsTrigger>
              <TabsTrigger value="select" disabled={questions.length === 0}>Select Questions</TabsTrigger>
              <TabsTrigger value="download" disabled={!paperContent}>Download Paper</TabsTrigger>
            </TabsList>
            
            <TabsContent value="upload" className="p-4 space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="header">Header Template (Optional)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      ref={headerInputRef}
                      id="header"
                      type="file"
                      className="hidden"
                      onChange={handleHeaderFileChange}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => headerInputRef.current?.click()}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Choose Header File
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {headerFile ? headerFile.name : "No file chosen"}
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="footer">Footer Template (Optional)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      ref={footerInputRef}
                      id="footer"
                      type="file"
                      className="hidden"
                      onChange={handleFooterFileChange}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => footerInputRef.current?.click()}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Choose Footer File
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {footerFile ? footerFile.name : "No file chosen"}
                    </span>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="content">Topic Material (Required)</Label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      ref={contentInputRef}
                      id="content"
                      type="file"
                      className="hidden"
                      onChange={handleContentFileChange}
                    />
                    <Button 
                      variant="outline" 
                      onClick={() => contentInputRef.current?.click()}
                    >
                      <FileUp className="h-4 w-4 mr-2" />
                      Choose Content File
                    </Button>
                    <span className="text-sm text-muted-foreground">
                      {contentFile ? contentFile.name : "No file chosen"}
                    </span>
                  </div>
                </div>
                
                <div className="pt-4">
                  <Button 
                    onClick={handleUploadFiles} 
                    disabled={!contentFile || isUploading}
                  >
                    {isUploading ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Uploading...
                      </>
                    ) : (
                      "Upload Files"
                    )}
                  </Button>
                </div>
              </div>
            </TabsContent>
            
            <TabsContent value="generate" className="p-4 space-y-6">
              <div>
                <h3 className="text-lg font-medium mb-4">Bloom's Taxonomy Levels</h3>
                {bloomsTaxonomy && (
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {Object.entries(bloomsTaxonomy).map(([level, percentage]) => (
                      <div key={level} className="space-y-1">
                        <div className="flex justify-between">
                          <Label htmlFor={`bloom-${level}`} className="capitalize">
                            {level}
                          </Label>
                          <span className="text-sm text-muted-foreground">{percentage}%</span>
                        </div>
                        <Slider
                          id={`bloom-${level}`}
                          defaultValue={[percentage]}
                          max={100}
                          step={5}
                          onValueChange={([value]) => {
                            setBloomsTaxonomy({
                              ...bloomsTaxonomy,
                              [level]: value
                            });
                          }}
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="space-y-2">
                <div className="flex justify-between">
                  <Label htmlFor="difficulty">Difficulty Level</Label>
                  <span className="text-sm text-muted-foreground">
                    {difficultyLevel === 1 ? 'Easy' : difficultyLevel === 2 ? 'Medium' : 'Hard'}
                  </span>
                </div>
                <Slider
                  id="difficulty"
                  defaultValue={[difficultyLevel]}
                  min={1}
                  max={3}
                  step={1}
                  onValueChange={([value]) => setDifficultyLevel(value)}
                />
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={generateQuestions} 
                  disabled={isGenerating}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Generating Questions...
                    </>
                  ) : (
                    "Generate Questions"
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="select" className="p-4 space-y-6">
              <div className="flex justify-between mb-4">
                <h3 className="text-lg font-medium">Select Questions for Paper</h3>
                <div className="space-x-2">
                  <Button variant="outline" size="sm" onClick={selectAllQuestions}>
                    Select All
                  </Button>
                  <Button variant="outline" size="sm" onClick={unselectAllQuestions}>
                    Unselect All
                  </Button>
                </div>
              </div>
              
              <div className="space-y-4">
                {questions.map((question) => (
                  <div key={question.id} className="flex items-start space-x-3 p-3 border rounded-md">
                    <Checkbox 
                      id={question.id}
                      checked={question.selected}
                      onCheckedChange={() => toggleQuestionSelection(question.id)}
                    />
                    <div className="flex-1">
                      <Label 
                        htmlFor={question.id}
                        className="text-sm font-medium cursor-pointer"
                      >
                        <span className="capitalize text-muted-foreground">
                          [{question.level}] {question.type}:
                        </span>
                        <div className="mt-1">{question.text}</div>
                      </Label>
                    </div>
                  </div>
                ))}
              </div>
              
              <div className="pt-4">
                <Button 
                  onClick={createPaper}
                  disabled={!questions.some(q => q.selected) || isDownloading}
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating Paper...
                    </>
                  ) : (
                    "Create Paper"
                  )}
                </Button>
              </div>
            </TabsContent>
            
            <TabsContent value="download" className="p-4 space-y-6">
              <div className="space-y-4">
                <div className="flex justify-between">
                  <h3 className="text-lg font-medium">Your paper is ready!</h3>
                  {paperUrl && (
                    <Button asChild>
                      <a href={paperUrl} target="_blank" rel="noopener noreferrer">
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </a>
                    </Button>
                  )}
                </div>
                
                <div className="border rounded-md p-4 bg-muted">
                  <div className="text-sm whitespace-pre-wrap max-h-96 overflow-y-auto">
                    {paperContent ? paperContent : (
                      <div className="flex items-center justify-center h-60 text-muted-foreground">
                        <span>Paper preview not available</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="pt-4 flex justify-between">
                  <Button 
                    variant="outline" 
                    onClick={() => navigate("/dashboard/paper-history")}
                  >
                    View History
                  </Button>
                  
                  <Button 
                    onClick={() => navigate("/dashboard/paper-generation")}
                  >
                    Create Another Paper
                  </Button>
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
