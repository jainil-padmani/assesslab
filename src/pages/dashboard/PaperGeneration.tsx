
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
    // When the component mounts, check if we have selected subject data
    if (subjects && subjects.length > 0 && selectedSubject === "") {
      console.log("Setting initial subject selection");
    }
  }, [subjects]);

  useEffect(() => {
    if (questions.length > 0) {
      if (selectedSubject) {
        setFilteredQuestions(questions.filter(item => item.subject_id === selectedSubject));
      } else {
        setFilteredQuestions(questions);
      }
    } else {
      setFilteredQuestions([]);
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

  const handleViewHistory = () => {
    navigate("/dashboard/paper-history");
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <h1 className="text-3xl font-bold mb-6">Questions Generation</h1>
      
      <Tabs defaultValue="generate" value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList className="grid grid-cols-2 w-[400px] mb-6">
          <TabsTrigger value="generate">Generate Questions</TabsTrigger>
          <TabsTrigger value="history" onClick={handleViewHistory}>History</TabsTrigger>
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
      </Tabs>
    </div>
  );
}
