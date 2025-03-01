import { useState, useEffect } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectGroup, SelectItem, SelectLabel, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { Subject, SubjectDocument } from "@/types/dashboard";
import { supabase } from "@/integrations/supabase/client";
import { FileText, FileImage, Download, Eye } from "lucide-react";

export default function Generate() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [subjectDocuments, setSubjectDocuments] = useState<SubjectDocument[]>([]);
  const [selectedQuestionPaper, setSelectedQuestionPaper] = useState<string>("");
  const [selectedAnswerKey, setSelectedAnswerKey] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .order("name");
        
        if (error) throw error;
        
        setSubjects(data as Subject[]);
        setLoading(false);
      } catch (error: any) {
        toast.error(`Error fetching subjects: ${error.message}`);
        setLoading(false);
      }
    }
    
    fetchSubjects();
  }, []);

  useEffect(() => {
    if (selectedSubject) {
      async function fetchDocuments() {
        try {
          const { data, error } = await supabase
            .from("subject_documents")
            .select("*")
            .eq("subject_id", selectedSubject);
          
          if (error) throw error;
          
          setSubjectDocuments(data as SubjectDocument[]);
        } catch (error: any) {
          toast.error(`Error fetching documents: ${error.message}`);
        }
      }
      
      fetchDocuments();
    } else {
      setSubjectDocuments([]);
    }
  }, [selectedSubject]);

  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
    setSelectedQuestionPaper("");
    setSelectedAnswerKey("");
  };

  const getQuestionPapers = () => {
    return subjectDocuments.filter(doc => doc.document_type === "questionPaper");
  };

  const getAnswerKeys = () => {
    return subjectDocuments.filter(doc => doc.document_type === "answerKey");
  };

  const handleGenerateClick = () => {
    if (!selectedQuestionPaper || !selectedAnswerKey) {
      toast.error("Please select both a question paper and an answer key");
      return;
    }

    // Implementation for generating content based on selected documents
    toast.success("Generation process started! This may take a few minutes...");
    // Further implementation will go here
  };

  const handleViewDocument = (url: string) => {
    window.open(url, "_blank");
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle>Generate Content</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="from-documents" className="w-full">
              <TabsList className="grid w-full md:w-[400px] grid-cols-2">
                <TabsTrigger value="from-documents">From Documents</TabsTrigger>
                <TabsTrigger value="from-text">From Text</TabsTrigger>
              </TabsList>
              
              <TabsContent value="from-documents" className="space-y-6 mt-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="subject">Select Subject</Label>
                    <Select value={selectedSubject} onValueChange={handleSubjectChange}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectGroup>
                          <SelectLabel>Subjects</SelectLabel>
                          {subjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name}
                            </SelectItem>
                          ))}
                        </SelectGroup>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {selectedSubject && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label>Question Paper</Label>
                      {getQuestionPapers().length === 0 ? (
                        <div className="p-4 bg-muted rounded-md text-muted-foreground text-sm">
                          No question papers available. Please upload one in the File Management section.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getQuestionPapers().map((doc) => (
                            <div 
                              key={doc.id}
                              className={`p-3 border rounded-md flex justify-between items-center cursor-pointer ${
                                selectedQuestionPaper === doc.id ? 'border-primary bg-primary/5' : 'border-input'
                              }`}
                              onClick={() => setSelectedQuestionPaper(doc.id)}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-blue-600" />
                                <div className="text-sm truncate max-w-[180px]">{doc.file_name}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDocument(doc.document_url);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label>Answer Key</Label>
                      {getAnswerKeys().length === 0 ? (
                        <div className="p-4 bg-muted rounded-md text-muted-foreground text-sm">
                          No answer keys available. Please upload one in the File Management section.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {getAnswerKeys().map((doc) => (
                            <div 
                              key={doc.id}
                              className={`p-3 border rounded-md flex justify-between items-center cursor-pointer ${
                                selectedAnswerKey === doc.id ? 'border-primary bg-primary/5' : 'border-input'
                              }`}
                              onClick={() => setSelectedAnswerKey(doc.id)}
                            >
                              <div className="flex items-center gap-2">
                                <FileText className="h-5 w-5 text-red-600" />
                                <div className="text-sm truncate max-w-[180px]">{doc.file_name}</div>
                              </div>
                              <div className="flex items-center gap-1">
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleViewDocument(doc.document_url);
                                  }}
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {selectedSubject && (
                  <div className="flex justify-end mt-6">
                    <Button 
                      onClick={handleGenerateClick}
                      disabled={!selectedQuestionPaper || !selectedAnswerKey}
                    >
                      Generate Content
                    </Button>
                  </div>
                )}
              </TabsContent>
              
              <TabsContent value="from-text" className="space-y-4 mt-6">
                <div className="text-center py-8">
                  <p className="text-muted-foreground">Text-based content generation coming soon.</p>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
