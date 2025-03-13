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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, FilePlus, FileX, Upload, ArrowLeft, Download, RefreshCw, Edit2, Plus, Minus } from "lucide-react";
import { BloomsTaxonomy, Question, CourseOutcomeConfig } from "@/types/papers";
import { CourseOutcome } from "@/types/dashboard";
import { Json } from "@/integrations/supabase/types";

export default function PaperCreation() {
  const location = useLocation();
  const navigate = useNavigate();
  const { subjectId, subjectName, subjectCode, topicName } = location.state || {};
  
  const [bloomsTaxonomy, setBloomsTaxonomy] = useState<BloomsTaxonomy>({
    remember: 20,
    understand: 20,
    apply: 15,
    analyze: 15,
    evaluate: 15,
    create: 15
  });
  
  const [isEditingBloomsTaxonomy, setIsEditingBloomsTaxonomy] = useState(false);
  const [difficulty, setDifficulty] = useState<number>(50);
  const [headerFile, setHeaderFile] = useState<File | null>(null);
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [headerUrl, setHeaderUrl] = useState<string>("");
  const [contentUrl, setContentUrl] = useState<string>("");
  const [extractedContent, setExtractedContent] = useState<string>("");
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [isCreatingPaper, setIsCreatingPaper] = useState<boolean>(false);
  const [paperUrl, setPaperUrl] = useState<string>("");
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcomeConfig[]>([]);
  const [isLoadingCourseOutcomes, setIsLoadingCourseOutcomes] = useState(false);
  
  useEffect(() => {
    if (!subjectId || !topicName) {
      toast.error("Missing required information");
      navigate("/dashboard/paper-generation");
    } else {
      fetchCourseOutcomes();
    }
  }, [subjectId, topicName, navigate]);
  
  const fetchCourseOutcomes = async () => {
    if (!subjectId) return;

    setIsLoadingCourseOutcomes(true);
    try {
      const { data, error } = await supabase
        .from('course_outcomes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('co_number', { ascending: true });

      if (error) throw error;

      if (data && data.length > 0) {
        const configuredCOs = data.map((co: CourseOutcome) => ({
          id: co.id,
          co_number: co.co_number,
          description: co.description,
          questionCount: 2, // Default number of questions
          selected: false
        }));
        setCourseOutcomes(configuredCOs);
      }
    } catch (error: any) {
      console.error("Error fetching course outcomes:", error);
      toast.error("Failed to load course outcomes");
    } finally {
      setIsLoadingCourseOutcomes(false);
    }
  };
  
  const handleFileUpload = async (file: File, type: 'header' | 'content') => {
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
      } else if (type === 'content') {
        setContentUrl(fileUrl);
        
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
  
  const toggleCourseOutcome = (id: string) => {
    setCourseOutcomes(prev => 
      prev.map(co => 
        co.id === id ? { ...co, selected: !co.selected } : co
      )
    );
  };

  const updateQuestionCount = (id: string, count: number) => {
    if (count < 1) return; // Don't allow less than 1 question
    
    setCourseOutcomes(prev => 
      prev.map(co => 
        co.id === id ? { ...co, questionCount: count } : co
      )
    );
  };
  
  const generateQuestions = async () => {
    if (!extractedContent && !contentUrl) {
      toast.error("Please upload content material first");
      return;
    }
    
    const selectedCourseOutcomes = courseOutcomes.filter(co => co.selected);
    if (selectedCourseOutcomes.length === 0) {
      toast.error("Please select at least one course outcome");
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
          difficulty,
          courseOutcomes: selectedCourseOutcomes
        }
      });
      
      if (response.error) {
        toast.error(`Error generating questions: ${response.error.message}`);
        return;
      }
      
      const generatedQs = response.data.questions;
      setGeneratedQuestions(generatedQs);
      
      const { error: saveError } = await supabase
        .from('generated_questions')
        .insert({
          subject_id: subjectId,
          topic: topicName,
          questions: generatedQs,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        });
      
      if (saveError) {
        console.error("Error saving generated questions:", saveError);
      }
      
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
          questions: selectedQuestions
        }
      });
      
      if (response.error) {
        toast.error(`Error creating paper: ${response.error.message}`);
        return;
      }
      
      const paperUrl = response.data.paperUrl;
      const pdfUrl = response.data.pdfUrl;
      
      setPaperUrl(paperUrl);
      setPdfUrl(pdfUrl || "");
      
      const { data, error } = await supabase
        .from('generated_papers')
        .insert({
          subject_id: subjectId,
          topic: topicName,
          paper_url: paperUrl,
          pdf_url: pdfUrl || null,
          questions: selectedQuestions as any,
          header_url: headerUrl || null,
          content_url: contentUrl || null,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
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
  
  const downloadPaper = (isPdf = false) => {
    if (isPdf && pdfUrl) {
      window.open(pdfUrl, '_blank');
    } else if (paperUrl) {
      window.open(paperUrl, '_blank');
    }
  };
  
  const handleEditBloomsTaxonomy = (level: keyof BloomsTaxonomy, value: string) => {
    const numValue = Number(value);
    if (isNaN(numValue)) return;

    setBloomsTaxonomy({
      ...bloomsTaxonomy,
      [level]: numValue
    });
  };
  
  const handleBloomsTaxonomyChange = (level: keyof BloomsTaxonomy, value: number[]) => {
    setBloomsTaxonomy(prev => ({
      ...prev,
      [level]: value[0]
    }));
  };
  
  const saveBloomsTaxonomyToSubject = async () => {
    try {
      const bloomsDataJson = {
        ...bloomsTaxonomy
      } as unknown as Json;
      
      const { error } = await supabase
        .from('answer_keys')
        .insert({
          subject_id: subjectId,
          title: `${subjectName || 'Subject'} - Bloom's Taxonomy Update`,
          content: {},
          blooms_taxonomy: bloomsDataJson
        });
      
      if (error) throw error;
      
      setIsEditingBloomsTaxonomy(false);
      toast.success("Bloom's taxonomy saved to subject successfully");
    } catch (error: any) {
      console.error("Error saving Bloom's taxonomy:", error);
      toast.error("Failed to save Bloom's taxonomy");
    }
  };
  
  const totalPercentage = Object.values(bloomsTaxonomy).reduce((sum, value) => sum + value, 0);
  const isValidDistribution = Math.abs(totalPercentage - 100) <= 5;
  
  const totalQuestionsFromCOs = courseOutcomes
    .filter(co => co.selected)
    .reduce((sum, co) => sum + co.questionCount, 0);
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex items-center">
        <Button variant="outline" onClick={() => navigate("/dashboard/paper-generation")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-bold ml-4">Create Paper: {topicName}</h1>
      </div>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
              <CardDescription>Upload header for your paper</CardDescription>
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
              <div className="flex justify-between items-center">
                <CardTitle>Question Parameters</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsEditingBloomsTaxonomy(!isEditingBloomsTaxonomy)}
                >
                  <Edit2 className="h-4 w-4" />
                </Button>
              </div>
              <CardDescription>
                {isEditingBloomsTaxonomy 
                  ? "Edit Bloom's taxonomy weights for this paper" 
                  : "Configure question generation parameters"}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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
              
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <Label>Bloom's Taxonomy Weights</Label>
                  {!isValidDistribution && (
                    <span className="text-xs text-orange-500">
                      Total: {totalPercentage}% (Goal: 100%)
                    </span>
                  )}
                </div>
                
                {Object.entries(bloomsTaxonomy).map(([level, value]) => (
                  <div key={level} className="space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="capitalize font-medium">{level}</span>
                      <span className="text-sm">{value}%</span>
                    </div>
                    <Slider
                      value={[value]}
                      onValueChange={(val) => handleBloomsTaxonomyChange(level as keyof BloomsTaxonomy, val)}
                      min={0}
                      max={50}
                      step={5}
                      className="my-1"
                    />
                  </div>
                ))}
                
                {isEditingBloomsTaxonomy && (
                  <div className="flex justify-end space-x-2 mt-4">
                    <Button variant="outline" onClick={() => setIsEditingBloomsTaxonomy(false)}>
                      Cancel
                    </Button>
                    <Button onClick={saveBloomsTaxonomyToSubject}>
                      Save to Subject
                    </Button>
                  </div>
                )}
              </div>
              
              <div className="space-y-4 border rounded-md p-4">
                <div className="flex justify-between items-center">
                  <Label className="text-base font-medium">Course Outcomes</Label>
                  {totalQuestionsFromCOs > 0 && (
                    <span className="text-xs text-blue-600">
                      Total questions: {totalQuestionsFromCOs}
                    </span>
                  )}
                </div>
                
                {isLoadingCourseOutcomes ? (
                  <div className="text-center py-2 text-sm text-gray-500">
                    Loading course outcomes...
                  </div>
                ) : courseOutcomes.length === 0 ? (
                  <div className="text-center py-2 text-sm text-gray-500">
                    No course outcomes available. Add them in the subject details page.
                  </div>
                ) : (
                  <div className="space-y-3">
                    {courseOutcomes.map((co) => (
                      <div key={co.id} className="flex items-start space-x-2">
                        <Checkbox 
                          id={`co-${co.id}`}
                          checked={co.selected}
                          onCheckedChange={() => toggleCourseOutcome(co.id)}
                          className="mt-1"
                        />
                        <div className="flex-1">
                          <Label 
                            htmlFor={`co-${co.id}`}
                            className="text-sm font-medium cursor-pointer"
                          >
                            CO{co.co_number}: {co.description}
                          </Label>
                          
                          {co.selected && (
                            <div className="flex items-center space-x-2 mt-2">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => updateQuestionCount(co.id, co.questionCount - 1)}
                              >
                                <Minus className="h-3 w-3" />
                              </Button>
                              <span className="text-sm font-medium w-8 text-center">
                                {co.questionCount}
                              </span>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-8 w-8 p-0"
                                onClick={() => updateQuestionCount(co.id, co.questionCount + 1)}
                              >
                                <Plus className="h-3 w-3" />
                              </Button>
                              <span className="text-xs text-gray-500">questions</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <Button 
                className="w-full" 
                onClick={generateQuestions}
                disabled={isGenerating || !extractedContent || courseOutcomes.filter(co => co.selected).length === 0}
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
                                {question.courseOutcome && (
                                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                    CO{question.courseOutcome}
                                  </span>
                                )}
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
                        {pdfUrl ? (
                          <iframe 
                            src={pdfUrl} 
                            className="w-full h-full"
                            title="Generated Paper PDF"
                          />
                        ) : (
                          <iframe 
                            src={paperUrl} 
                            className="w-full h-full"
                            title="Generated Paper HTML"
                          />
                        )}
                      </div>
                      <div className="flex justify-center gap-4">
                        {pdfUrl && (
                          <Button onClick={() => downloadPaper(true)}>
                            <Download className="mr-2 h-4 w-4" />
                            Download PDF
                          </Button>
                        )}
                        <Button onClick={() => downloadPaper(false)}>
                          <Download className="mr-2 h-4 w-4" />
                          Download HTML
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
