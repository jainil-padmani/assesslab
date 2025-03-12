
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, FilePlus, FileX, Upload, ArrowLeft, Download, RefreshCw } from "lucide-react";
import { BloomsTaxonomy, Question } from "@/types/papers";

export default function PaperCreation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjectId, subjectName, subjectCode, topicName } = location.state || {};
  
  const [bloomsTaxonomy, setBloomsTaxonomy] = useState<BloomsTaxonomy>({
    remember: { delivery: 20, evaluation: 20 },
    understand: { delivery: 20, evaluation: 20 },
    apply: { delivery: 15, evaluation: 15 },
    analyze: { delivery: 15, evaluation: 15 },
    evaluate: { delivery: 15, evaluation: 15 },
    create: { delivery: 15, evaluation: 15 }
  });
  
  const [difficulty, setDifficulty] = useState<number>(50);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [footerFile, setFooterFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [headerUrl, setHeaderUrl] = useState<string>("");
  const [footerUrl, setFooterUrl] = useState<string>("");
  const [contentUrl, setContentUrl] = useState<string>("");
  const [extractedContent, setExtractedContent] = useState<string>("");
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCreatingPaper, setIsCreatingPaper] = useState<boolean>(false);
  const [paperUrl, setPaperUrl] = useState<string>("");
  
  // Validate if we have the required data
  useEffect(() => {
    if (!subjectId || !topicName) {
      toast.error("Missing required information");
      navigate("/dashboard/paper-generation");
    }
    
    // Try to fetch Bloom's taxonomy from subject if available
    const fetchSubjectDetails = async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId)
        .single();
      
      if (error) {
        console.error("Error fetching subject:", error);
        return;
      }
      
      // If subject has a document, try to fetch Bloom's taxonomy
      const { data: documents, error: documentsError } = await supabase
        .from("subject_documents")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("document_type", "bloom_taxonomy");
      
      if (documentsError) {
        console.error("Error fetching subject documents:", documentsError);
        return;
      }
      
      if (documents && documents.length > 0) {
        // Fetch the document content and parse Bloom's taxonomy if available
        try {
          const response = await fetch(documents[0].document_url);
          const bloomsData = await response.json();
          setBloomsTaxonomy(bloomsData);
        } catch (error) {
          console.error("Error parsing Bloom's taxonomy:", error);
        }
      }
    };
    
    fetchSubjectDetails();
  }, [subjectId, topicName, navigate]);
  
  const handleFileUpload = async (file: File, type: 'header' | 'footer' | 'content') => {
    if (!file) return;
    
    const fileExt = file.name.split('.').pop();
    const fileName = `${type}_${subjectId}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    try {
      const { error: uploadError, data } = await supabase.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) {
        toast.error(`Error uploading ${type} file: ${uploadError.message}`);
        return;
      }
      
      const { data: urlData } = await supabase.storage
        .from('files')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      
      if (type === 'header') {
        setHeaderUrl(fileUrl);
      } else if (type === 'footer') {
        setFooterUrl(fileUrl);
      } else if (type === 'content') {
        setContentUrl(fileUrl);
        
        // Extract content from the file
        const formData = new FormData();
        formData.append('file', file);
        
        setIsGenerating(true);
        toast.info("Extracting content from file...");
        
        try {
          const extractResponse = await supabase.functions.invoke('extract-text', {
            body: { fileUrl, fileName: file.name }
          });
          
          if (extractResponse.error) {
            toast.error(`Error extracting text: ${extractResponse.error.message}`);
            return;
          }
          
          setExtractedContent(extractResponse.data.text);
          toast.success("Content extracted successfully");
        } catch (error) {
          console.error("Error extracting content:", error);
          toast.error("Failed to extract content from file");
        } finally {
          setIsGenerating(false);
        }
      }
      
      toast.success(`${type.charAt(0).toUpperCase() + type.slice(1)} file uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading ${type} file:`, error);
      toast.error(`Failed to upload ${type} file`);
    }
  };
  
  const generateQuestions = async () => {
    if (!extractedContent && !contentUrl) {
      toast.error("Please upload content material first");
      return;
    }
    
    setIsGenerating(true);
    toast.info("Generating questions, this may take a moment...");
    
    try {
      const response = await supabase.functions.invoke('generate-questions', {
        body: {
          topic: topicName,
          content: extractedContent,
          bloomsTaxonomy,
          difficulty
        }
      });
      
      if (response.error) {
        toast.error(`Error generating questions: ${response.error.message}`);
        return;
      }
      
      setGeneratedQuestions(response.data.questions);
      toast.success("Questions generated successfully");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const toggleQuestionSelection = (id: string) => {
    setGeneratedQuestions(prev => 
      prev.map(q => 
        q.id === id ? { ...q, selected: !q.selected } : q
      )
    );
  };
  
  const createPaper = async () => {
    const selectedQuestions = generatedQuestions.filter(q => q.selected);
    
    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    
    setIsCreatingPaper(true);
    toast.info("Creating paper, please wait...");
    
    try {
      const response = await supabase.functions.invoke('generate-paper', {
        body: {
          subjectName,
          subjectCode,
          topicName,
          headerUrl,
          footerUrl,
          questions: selectedQuestions
        }
      });
      
      if (response.error) {
        toast.error(`Error creating paper: ${response.error.message}`);
        return;
      }
      
      const paperUrl = response.data.paperUrl;
      setPaperUrl(paperUrl);
      
      // Save to database
      const { data, error } = await supabase
        .from('generated_papers')
        .insert({
          subject_id: subjectId,
          topic: topicName,
          paper_url: paperUrl,
          questions: selectedQuestions,
          header_url: headerUrl,
          footer_url: footerUrl,
          content_url: contentUrl
        })
        .select();
      
      if (error) {
        console.error("Error saving paper:", error);
        toast.error("Paper created but failed to save to history");
        return;
      }
      
      toast.success("Paper created and saved successfully");
    } catch (error) {
      console.error("Error creating paper:", error);
      toast.error("Failed to create paper");
    } finally {
      setIsCreatingPaper(false);
    }
  };
  
  const downloadPaper = () => {
    if (paperUrl) {
      window.open(paperUrl, '_blank');
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center">
        <Button variant="outline" onClick={() => navigate("/dashboard/paper-generation")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-bold ml-4">Create Paper: {topicName}</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column - Upload and Configuration */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Subject Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <div>
                  <Label>Subject</Label>
                  <div className="font-medium">{subjectName} ({subjectCode})</div>
                </div>
                <div>
                  <Label>Topic/Chapter</Label>
                  <div className="font-medium">{topicName}</div>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Document Templates</CardTitle>
              <CardDescription>Upload header and footer for your paper</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="header-file">Header Template (optional)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="header-file"
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setHeaderFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => headerFile && handleFileUpload(headerFile, 'header')}
                    disabled={!headerFile}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
                {headerUrl && (
                  <div className="text-sm text-green-600 flex items-center mt-1">
                    <Check className="h-4 w-4 mr-1" /> Header uploaded
                  </div>
                )}
              </div>
              
              <div>
                <Label htmlFor="footer-file">Footer Template (optional)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="footer-file"
                    type="file"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setFooterFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => footerFile && handleFileUpload(footerFile, 'footer')}
                    disabled={!footerFile}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
                {footerUrl && (
                  <div className="text-sm text-green-600 flex items-center mt-1">
                    <Check className="h-4 w-4 mr-1" /> Footer uploaded
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Chapter Material</CardTitle>
              <CardDescription>Upload content to generate questions from</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="content-file">Content Material (PDF/DOCX/TXT)</Label>
                <div className="flex items-center gap-2 mt-1">
                  <Input
                    id="content-file"
                    type="file"
                    accept=".pdf,.docx,.doc,.txt"
                    onChange={(e) => {
                      if (e.target.files && e.target.files[0]) {
                        setContentFile(e.target.files[0]);
                      }
                    }}
                  />
                  <Button
                    size="sm"
                    onClick={() => contentFile && handleFileUpload(contentFile, 'content')}
                    disabled={!contentFile}
                  >
                    <Upload className="h-4 w-4 mr-1" />
                    Upload
                  </Button>
                </div>
                {contentUrl && (
                  <div className="text-sm text-green-600 flex items-center mt-1">
                    <Check className="h-4 w-4 mr-1" /> Content uploaded
                  </div>
                )}
              </div>
              
              {extractedContent && (
                <div>
                  <Label htmlFor="extracted-content">Extracted Content</Label>
                  <Textarea
                    id="extracted-content"
                    value={extractedContent}
                    onChange={(e) => setExtractedContent(e.target.value)}
                    className="h-48 mt-1"
                    placeholder="Content extracted from file..."
                  />
                </div>
              )}
            </CardContent>
          </Card>
          
          <Card>
            <CardHeader>
              <CardTitle>Question Parameters</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label>Difficulty Level: {difficulty}%</Label>
                <Slider
                  value={[difficulty]}
                  onValueChange={(value) => setDifficulty(value[0])}
                  min={0}
                  max={100}
                  step={5}
                  className="my-2"
                />
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Easy</span>
                  <span>Moderate</span>
                  <span>Hard</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label>Bloom's Taxonomy Weights</Label>
                {Object.entries(bloomsTaxonomy).map(([level, values]) => (
                  <div key={level} className="grid grid-cols-3 gap-2 items-center">
                    <div className="capitalize">{level}</div>
                    <div>
                      <Label className="text-xs">Delivery: {values.delivery}%</Label>
                      <Slider
                        value={[values.delivery]}
                        onValueChange={(value) => 
                          setBloomsTaxonomy(prev => ({
                            ...prev,
                            [level]: { ...prev[level as keyof BloomsTaxonomy], delivery: value[0] }
                          }))
                        }
                        min={0}
                        max={100}
                        step={5}
                        className="my-1"
                      />
                    </div>
                    <div>
                      <Label className="text-xs">Evaluation: {values.evaluation}%</Label>
                      <Slider
                        value={[values.evaluation]}
                        onValueChange={(value) => 
                          setBloomsTaxonomy(prev => ({
                            ...prev,
                            [level]: { ...prev[level as keyof BloomsTaxonomy], evaluation: value[0] }
                          }))
                        }
                        min={0}
                        max={100}
                        step={5}
                        className="my-1"
                      />
                    </div>
                  </div>
                ))}
              </div>
              
              <Button 
                className="w-full" 
                onClick={generateQuestions}
                disabled={isGenerating || !extractedContent}
              >
                {isGenerating ? (
                  <>
                    <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                    Generating...
                  </>
                ) : (
                  'Generate Questions'
                )}
              </Button>
            </CardContent>
          </Card>
        </div>
        
        {/* Right column - Generated Questions and Paper */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="questions">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="questions">Generated Questions</TabsTrigger>
              <TabsTrigger value="paper">Final Paper</TabsTrigger>
            </TabsList>
            
            <TabsContent value="questions">
              <Card>
                <CardHeader>
                  <CardTitle>Select Questions for Paper</CardTitle>
                  <CardDescription>
                    Choose the questions you want to include in your test paper
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {generatedQuestions.length === 0 ? (
                    <div className="text-center py-12">
                      <FilePlus className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium">No questions generated yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Upload content material and generate questions to see them here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {generatedQuestions.map((question, index) => (
                        <div 
                          key={question.id} 
                          className={`p-4 border rounded-md ${question.selected ? 'border-primary bg-primary/5' : 'border-gray-200'}`}
                        >
                          <div className="flex items-start space-x-3">
                            <div className="flex-shrink-0 pt-0.5">
                              <Checkbox 
                                id={`question-${question.id}`}
                                checked={question.selected}
                                onCheckedChange={() => toggleQuestionSelection(question.id)}
                              />
                            </div>
                            <div className="flex-1 min-w-0">
                              <Label 
                                htmlFor={`question-${question.id}`}
                                className="text-sm font-medium cursor-pointer"
                              >
                                Q{index + 1}. {question.text}
                              </Label>
                              <div className="mt-1 flex flex-wrap gap-2">
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                  {question.type}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                  {question.level}
                                </span>
                                <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                  {question.marks} marks
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
                <CardFooter>
                  <Button 
                    className="ml-auto" 
                    onClick={createPaper}
                    disabled={isCreatingPaper || generatedQuestions.filter(q => q.selected).length === 0}
                  >
                    {isCreatingPaper ? 'Creating Paper...' : 'Create Paper'}
                  </Button>
                </CardFooter>
              </Card>
            </TabsContent>
            
            <TabsContent value="paper">
              <Card>
                <CardHeader>
                  <CardTitle>Final Paper</CardTitle>
                  <CardDescription>
                    Review and download your generated test paper
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {!paperUrl ? (
                    <div className="text-center py-12">
                      <FileX className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-4 text-lg font-medium">No paper generated yet</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Select questions and create a paper to see it here
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="aspect-[3/4] border rounded-md overflow-hidden">
                        <iframe 
                          src={paperUrl} 
                          className="w-full h-full"
                          title="Generated Paper"
                        />
                      </div>
                      <div className="flex justify-center">
                        <Button onClick={downloadPaper}>
                          <Download className="mr-2 h-4 w-4" />
                          Download Paper
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
