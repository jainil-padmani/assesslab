
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useSubjects } from "@/hooks/test-selection/useSubjects";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, FileX } from "lucide-react";
import { format } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export default function PaperGeneration() {
  const [selectedTab, setSelectedTab] = useState<string>("generate");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [questions, setQuestions] = useState<any[]>([]);
  const [filteredQuestions, setFilteredQuestions] = useState<any[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<any | null>(null);
  const { subjects, isLoading: isSubjectsLoading } = useSubjects();
  const navigate = useNavigate();

  useEffect(() => {
    if (selectedTab === "history") {
      fetchGeneratedQuestions();
    }
  }, [selectedTab]);

  useEffect(() => {
    if (selectedSubject && questions.length > 0) {
      setFilteredQuestions(questions.filter(item => item.subject_id === selectedSubject));
    } else {
      setFilteredQuestions(questions);
    }
  }, [selectedSubject, questions]);

  const fetchGeneratedQuestions = async () => {
    try {
      setIsHistoryLoading(true);
      console.log("Fetching generated questions...");
      const { data, error } = await supabase
        .from("generated_questions")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching questions:", error);
        throw error;
      }
      
      console.log("Questions data:", data);
      
      if (data) {
        const mappedData = data.map((item: any) => ({
          ...item,
          subject_name: item.subjects?.name || "Unknown Subject",
          questionCount: Array.isArray(item.questions) ? item.questions.length : 0
        }));
        
        setQuestions(mappedData);
        setFilteredQuestions(mappedData);
      } else {
        setQuestions([]);
        setFilteredQuestions([]);
      }
    } catch (error: any) {
      console.error("Error fetching generated questions:", error);
      toast.error("Failed to load questions history");
      setQuestions([]);
      setFilteredQuestions([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };

  const handleContinue = () => {
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }
    
    if (!topicName.trim()) {
      toast.error("Please enter a topic or chapter name");
      return;
    }

    setIsLoading(true);
    
    const subject = subjects.find(s => s.id === selectedSubject);
    
    navigate("/dashboard/paper-generation/create", { 
      state: { 
        subjectId: selectedSubject,
        subjectName: subject?.name || "",
        subjectCode: subject?.subject_code || "",
        topicName: topicName.trim() 
      } 
    });
  };

  const handleViewTopicQuestions = (topic: any) => {
    setSelectedTopic(topic);
  };

  const handleDeleteTopic = async (id: string) => {
    try {
      const { error } = await supabase
        .from("generated_questions")
        .delete()
        .eq("id", id);
      
      if (error) throw error;
      
      toast.success("Topic questions deleted successfully");
      fetchGeneratedQuestions();
      if (selectedTopic?.id === id) {
        setSelectedTopic(null);
      }
    } catch (error: any) {
      console.error("Error deleting topic:", error);
      toast.error("Failed to delete topic questions");
    }
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Questions Generation</h1>
      
      <Tabs defaultValue="generate" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-2 w-[400px] mb-6">
          <TabsTrigger value="generate">Generate Questions</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>
        
        <TabsContent value="generate">
          <Card>
            <CardHeader>
              <CardTitle>Topic Details</CardTitle>
              <CardDescription>
                Select a subject and enter a topic or chapter name to generate questions
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger id="subject">
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {isSubjectsLoading ? (
                      <SelectItem value="loading" disabled>Loading subjects...</SelectItem>
                    ) : subjects.length === 0 ? (
                      <SelectItem value="none" disabled>No subjects available</SelectItem>
                    ) : (
                      subjects.map((subject) => (
                        <SelectItem key={subject.id} value={subject.id}>
                          {subject.name} ({subject.subject_code})
                        </SelectItem>
                      ))
                    )}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="topic">Topic or Chapter Name</Label>
                <Input
                  id="topic"
                  placeholder="Enter topic or chapter name"
                  value={topicName}
                  onChange={(e) => setTopicName(e.target.value)}
                />
              </div>
            </CardContent>
            <CardFooter className="flex justify-end">
              <Button 
                onClick={handleContinue} 
                disabled={isLoading || isSubjectsLoading}
              >
                {isLoading ? "Loading..." : "Continue"}
              </Button>
            </CardFooter>
          </Card>
        </TabsContent>
        
        <TabsContent value="history">
          <Card>
            <CardHeader>
              <CardTitle>Generated Questions</CardTitle>
              <CardDescription>
                View your previously generated questions by topic
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="mb-4">
                <Label htmlFor="filter-subject">Filter by subject</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger id="filter-subject">
                    <SelectValue placeholder="All subjects" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">All Subjects</SelectItem>
                    {subjects && subjects.length > 0 && subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {isHistoryLoading ? (
                <div className="text-center py-8">Loading question history...</div>
              ) : filteredQuestions.length === 0 ? (
                <div className="text-center py-8 flex flex-col items-center">
                  <FileX className="h-16 w-16 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">No questions found</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setSelectedTab("generate")}
                  >
                    Generate New Questions
                  </Button>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Subject</TableHead>
                      <TableHead>Topic</TableHead>
                      <TableHead>Questions</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredQuestions.map((item) => (
                      <TableRow 
                        key={item.id} 
                        className="cursor-pointer" 
                        onClick={() => handleViewTopicQuestions(item)}
                      >
                        <TableCell>
                          {format(new Date(item.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell>{item.subject_name}</TableCell>
                        <TableCell>{item.topic}</TableCell>
                        <TableCell>
                          {item.questionCount}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2" onClick={e => e.stopPropagation()}>
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteTopic(item.id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedTopic} onOpenChange={(open) => !open && setSelectedTopic(null)}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          {selectedTopic && (
            <>
              <DialogHeader>
                <DialogTitle>Topic Questions: {selectedTopic.topic}</DialogTitle>
                <DialogDescription>
                  {selectedTopic.subject_name} - Created on {format(new Date(selectedTopic.created_at), "dd MMM yyyy")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-4">Questions ({Array.isArray(selectedTopic.questions) ? selectedTopic.questions.length : 0})</h3>
                
                {selectedTopic && Array.isArray(selectedTopic.questions) ? (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto">
                    {selectedTopic.questions.map((question: any, idx: number) => (
                      <div 
                        key={question.id || idx} 
                        className="p-3 border rounded-md"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium mb-2">
                              Q{idx + 1}. {question.text}
                            </p>
                            <div className="flex flex-wrap gap-2">
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                                {question.type}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                                {question.level}
                              </span>
                              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                                {question.marks} marks
                              </span>
                              {question.courseOutcome && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                                  CO{question.courseOutcome}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-gray-500">No questions available</p>
                )}
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
