
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { format } from "date-fns";
import { ArrowLeft, Trash2, List } from "lucide-react";
import { useSubjects } from "@/hooks/test-selection/useSubjects";
import { Question } from "@/types/papers";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface Topic {
  id: string;
  topic: string;
  subject_id: string;
  subject_name: string;
  created_at: string;
  questions: Question[];
}

export default function PaperHistory() {
  const [topics, setTopics] = useState<Topic[]>([]);
  const [filteredTopics, setFilteredTopics] = useState<Topic[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [selectedTopic, setSelectedTopic] = useState<Topic | null>(null);
  const [isTopicDialogOpen, setIsTopicDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [topicToDelete, setTopicToDelete] = useState<Topic | null>(null);
  const { subjects } = useSubjects();
  const navigate = useNavigate();
  
  useEffect(() => {
    fetchTopics();
  }, []);
  
  useEffect(() => {
    // Filter topics based on selected subject
    if (selectedSubject && selectedSubject !== "all") {
      setFilteredTopics(topics.filter(topic => topic.subject_id === selectedSubject));
    } else {
      setFilteredTopics(topics);
    }
  }, [selectedSubject, topics]);
  
  const fetchTopics = async () => {
    try {
      setIsLoading(true);
      
      // Fetch the unique topics with their generated questions
      const { data, error } = await supabase
        .from("generated_papers")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false });
      
      if (error) throw error;
      
      if (data) {
        // Transform the data to match our Topic interface
        const mappedTopics: Topic[] = data.map((item: any) => ({
          id: item.id,
          topic: item.topic,
          subject_id: item.subject_id,
          subject_name: item.subjects?.name || "Unknown Subject",
          created_at: item.created_at,
          questions: Array.isArray(item.questions) ? item.questions : []
        }));
        
        setTopics(mappedTopics);
        setFilteredTopics(mappedTopics);
      }
    } catch (error: any) {
      console.error("Error fetching topics:", error);
      toast.error("Failed to load question history");
    } finally {
      setIsLoading(false);
    }
  };
  
  const handleViewTopicQuestions = (topic: Topic) => {
    setSelectedTopic(topic);
    setIsTopicDialogOpen(true);
  };
  
  const confirmDeleteTopic = (topic: Topic, e: React.MouseEvent) => {
    e.stopPropagation();
    setTopicToDelete(topic);
    setDeleteDialogOpen(true);
  };
  
  const handleDeleteTopic = async () => {
    if (!topicToDelete) return;
    
    try {
      const { error } = await supabase
        .from("generated_papers")
        .delete()
        .eq("id", topicToDelete.id);
      
      if (error) throw error;
      
      toast.success("Topic and questions deleted successfully");
      
      // Refresh the topics list
      await fetchTopics();
      setDeleteDialogOpen(false);
      setTopicToDelete(null);
    } catch (error: any) {
      console.error("Error deleting topic:", error);
      toast.error("Failed to delete topic");
    }
  };
  
  return (
    <div className="container mx-auto py-6">
      <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
        <div className="flex items-center">
          <Button 
            variant="outline" 
            onClick={() => navigate("/dashboard/paper-generation")}
            className="mr-4"
          >
            <ArrowLeft className="mr-2 h-4 w-4" /> Back
          </Button>
          <h1 className="text-3xl font-bold">Question Generation History</h1>
        </div>
        
        <div className="mt-4 md:mt-0 flex flex-col md:flex-row gap-4">
          <div className="w-full md:w-64">
            <Select 
              value={selectedSubject} 
              onValueChange={setSelectedSubject}
            >
              <SelectTrigger>
                <SelectValue placeholder="Filter by subject" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Subjects</SelectItem>
                {subjects && subjects.length > 0 && subjects.map((subject) => (
                  <SelectItem key={subject.id} value={subject.id}>
                    {subject.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Generated Questions by Topic</CardTitle>
          <CardDescription>
            View questions generated for each topic and subject
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8">Loading topic history...</div>
          ) : filteredTopics.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500">No generated questions found</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate("/dashboard/paper-generation")}
              >
                Generate Questions
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
                {filteredTopics.map((topic) => (
                  <TableRow 
                    key={topic.id} 
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleViewTopicQuestions(topic)}
                  >
                    <TableCell>
                      {format(new Date(topic.created_at), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{topic.subject_name}</TableCell>
                    <TableCell>{topic.topic}</TableCell>
                    <TableCell>
                      {Array.isArray(topic.questions) ? topic.questions.length : 'N/A'}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => confirmDeleteTopic(topic, e)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
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
      
      {/* Topic Questions Dialog */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
          {selectedTopic && (
            <>
              <DialogHeader>
                <DialogTitle>Topic: {selectedTopic.topic}</DialogTitle>
                <DialogDescription>
                  {selectedTopic.subject_name} - Created on {format(new Date(selectedTopic.created_at), "dd MMM yyyy")}
                </DialogDescription>
              </DialogHeader>
              
              <div className="mt-4">
                <h3 className="text-lg font-medium mb-4 flex items-center">
                  <List className="mr-2 h-5 w-5" />
                  Questions ({Array.isArray(selectedTopic.questions) ? selectedTopic.questions.length : 0})
                </h3>
                
                {Array.isArray(selectedTopic.questions) && selectedTopic.questions.length > 0 ? (
                  <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
                    {selectedTopic.questions.map((question, idx) => (
                      <div 
                        key={idx} 
                        className="p-3 border rounded-md"
                      >
                        <div className="font-medium">Q{idx + 1}. {question.text}</div>
                        <div className="mt-2 flex flex-wrap gap-2">
                          <span className="inline-flex items-center px-2 5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
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
                    ))}
                  </div>
                ) : (
                  <p className="text-muted-foreground text-center py-4">No questions available for this topic</p>
                )}
              </div>
              
              <DialogFooter className="flex justify-between items-center mt-4">
                <Button 
                  variant="destructive" 
                  onClick={() => {
                    setIsTopicDialogOpen(false);
                    setTopicToDelete(selectedTopic);
                    setDeleteDialogOpen(true);
                  }}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Topic
                </Button>
                <Button variant="outline" onClick={() => setIsTopicDialogOpen(false)}>
                  Close
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Topic Questions</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete all questions for the topic "{topicToDelete?.topic}"? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setTopicToDelete(null)}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteTopic} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
