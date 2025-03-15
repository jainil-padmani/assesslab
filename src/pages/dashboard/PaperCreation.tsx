
import { useState, useEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Check, Upload, ArrowLeft, RefreshCw, Plus, Minus } from "lucide-react";
import { BloomsTaxonomy, Question, CourseOutcomeConfig } from "@/types/papers";
import { CourseOutcome } from "@/types/dashboard";

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
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [contentUrl, setContentUrl] = useState<string>("");
  const [extractedContent, setExtractedContent] = useState<string>("");
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
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
  
  const handleFileUpload = async (file: File, type: 'content') => {
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
    } catch (error) {
      console.error(`Error uploading file:`, error);
      toast.error(`Failed to upload file`);
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
      
      const questions = response.data.questions;
      setGeneratedQuestions(questions);
      
      // Store all generated questions in Supabase
      await storeQuestionsInSupabase(questions);
      
      toast.success("Questions generated and stored successfully");
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };
  
  const storeQuestionsInSupabase = async (questions: Question[]) => {
    if (questions.length === 0) return;
    
    try {
      const { error } = await supabase
        .from('generated_questions')
        .insert({
          subject_id: subjectId,
          topic: topicName,
          questions: questions as any,
          user_id: (await supabase.auth.getUser()).data.user?.id || ''
        });
      
      if (error) throw error;
      
    } catch (error) {
      console.error("Error storing questions:", error);
      toast.error("Failed to store questions");
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
        <h1 className="text-3xl font-bold ml-4">Generate Questions: {topicName}</h1>
      </div>
      
      <div className="space-y-6">
        {/* Row 1: Subject Information */}
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
        
        {/* Row 2: Material Upload */}
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
        
        {/* Row 3: Question Parameters */}
        <Card>
          <CardHeader>
            <CardTitle>Question Parameters</CardTitle>
            <CardDescription>Configure question generation parameters</CardDescription>
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
                    onValueChange={(val) => {
                      setBloomsTaxonomy(prev => ({
                        ...prev,
                        [level]: val[0]
                      }));
                    }}
                    min={0}
                    max={50}
                    step={5}
                    className="my-1"
                  />
                </div>
              ))}
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
                  Generating Questions...
                </>
              ) : (
                'Generate Questions'
              )}
            </Button>
          </CardContent>
        </Card>
        
        {/* Generated Questions Section */}
        {generatedQuestions.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Generated Questions</CardTitle>
              <CardDescription>
                All generated questions are stored in your question bank
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {generatedQuestions.map((question, index) => (
                  <div 
                    key={question.id || index} 
                    className="p-4 border rounded-md border-gray-200"
                  >
                    <div className="flex items-start space-x-3">
                      <div className="flex-1 min-w-0">
                        <Label 
                          className="text-sm font-medium"
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
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
