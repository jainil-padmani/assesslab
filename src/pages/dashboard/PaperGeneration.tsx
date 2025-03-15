
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

export default function PaperGeneration() {
  const [selectedTab, setSelectedTab] = useState<string>("generate");
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const { subjects, isLoading: isSubjectsLoading } = useSubjects();
  const navigate = useNavigate();

  useEffect(() => {
    // When the component mounts, check if we have selected subject data
    if (subjects && subjects.length > 0 && selectedSubject === "") {
      console.log("Setting initial subject selection");
    }
  }, [subjects]);

  useEffect(() => {
    if (selectedTab === "history") {
      // Navigate to the history page when history tab is selected
      navigate("/dashboard/paper-generation/history");
    }
  }, [selectedTab, navigate]);

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
      </Tabs>
    </div>
  );
}
