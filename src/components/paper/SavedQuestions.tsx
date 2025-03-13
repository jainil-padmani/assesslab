
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";
import { File } from "lucide-react";
import { format } from "date-fns";
import { Question, GeneratedQuestions } from "@/types/papers";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";

export default function SavedQuestions() {
  const [questions, setQuestions] = useState<GeneratedQuestions[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSubject, setSelectedSubject] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [subjects, setSubjects] = useState<{ id: string; name: string }[]>([]);
  const [selectedItems, setSelectedItems] = useState<Record<string, boolean>>({});
  const navigate = useNavigate();

  useEffect(() => {
    fetchQuestions();
    fetchSubjects();
  }, []);

  const fetchQuestions = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error("You need to be logged in to view saved questions");
        return;
      }

      // Use a custom query since generated_questions is a new table
      const { data, error } = await supabase
        .from('generated_questions')
        .select(`
          id,
          user_id,
          subject_id,
          topic,
          questions,
          created_at,
          subjects (
            name
          )
        `)
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      
      if (error) throw error;

      // Process the data to match the GeneratedQuestions type
      const processedData = data?.map(item => ({
        id: item.id,
        user_id: item.user_id,
        subject_id: item.subject_id,
        topic: item.topic,
        questions: item.questions as Question[],
        created_at: item.created_at,
        subject_name: item.subjects?.name
      })) || [];

      setQuestions(processedData);
    } catch (error) {
      console.error("Error fetching saved questions:", error);
      toast.error("Failed to fetch saved questions");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubjects = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('id, name')
        .order('name');
      
      if (error) throw error;
      setSubjects(data || []);
    } catch (error) {
      console.error("Error fetching subjects:", error);
    }
  };

  const filteredQuestions = questions.filter(q => {
    const matchesSubject = selectedSubject === "all" || q.subject_id === selectedSubject;
    const matchesSearch = q.topic.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSubject && matchesSearch;
  });

  const handleSelectItem = (id: string, checked: boolean) => {
    setSelectedItems(prev => ({
      ...prev,
      [id]: checked
    }));
  };

  const handleCreatePaper = () => {
    const selectedQuestions = questions
      .filter(q => selectedItems[q.id])
      .flatMap(q => {
        // Map each question in the selected items and add selected: true
        // Use type assertion to handle the Json type
        const questionsArray = Array.isArray(q.questions) 
          ? q.questions as Question[]
          : [];
          
        return questionsArray.map(question => ({
          ...question,
          selected: true
        }));
      });

    if (selectedQuestions.length === 0) {
      toast.error("Please select at least one saved question set");
      return;
    }

    // Navigate to paper creation with the selected questions
    navigate("/dashboard/paper-generation/create", {
      state: {
        prefillQuestions: selectedQuestions
      }
    });
  };

  const getQuestionCount = (item: GeneratedQuestions) => {
    const questionsArray = Array.isArray(item.questions)
      ? item.questions
      : [];
    
    return questionsArray.length;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between gap-4 items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Saved Questions</h1>
          <p className="text-muted-foreground">
            View and manage your previously generated questions
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={handleCreatePaper} disabled={Object.values(selectedItems).filter(Boolean).length === 0}>
            Create Paper from Selected
          </Button>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-4">
        <div className="w-full sm:w-64">
          <Select value={selectedSubject} onValueChange={setSelectedSubject}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by subject" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Subjects</SelectItem>
              {subjects.map(subject => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex-1">
          <input
            type="text"
            placeholder="Search by topic"
            className="w-full px-3 py-2 border rounded-md"
            value={searchTerm}
            onChange={e => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading saved questions...</div>
      ) : filteredQuestions.length === 0 ? (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No saved questions found.</p>
          <p className="mt-2">
            Generate questions in Paper Creation to save them for later use.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredQuestions.map(item => (
            <Card key={item.id} className={selectedItems[item.id] ? "border-primary" : ""}>
              <CardHeader className="pb-2 flex flex-row justify-between items-start">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Checkbox
                      checked={selectedItems[item.id] || false}
                      onCheckedChange={(checked) => 
                        handleSelectItem(item.id, checked as boolean)
                      }
                    />
                    <span className="truncate">{item.topic}</span>
                  </CardTitle>
                  <CardDescription>
                    {item.subject_name || "Unknown Subject"}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="ml-2">
                  {getQuestionCount(item)} questions
                </Badge>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <div className="text-sm text-muted-foreground">
                    {item.created_at ? format(new Date(item.created_at), 'MMM d, yyyy') : 'Unknown date'}
                  </div>
                  <Button variant="outline" size="sm" className="gap-1" 
                    onClick={() => navigate("/dashboard/paper-generation/create", {
                      state: {
                        prefillQuestions: (item.questions as Question[]).map(q => ({...q, selected: true}))
                      }
                    })}
                  >
                    <File className="h-4 w-4" />
                    <span>Use</span>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
