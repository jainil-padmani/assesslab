
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Subject } from "@/types/dashboard";

interface HistoryHeaderProps {
  selectedSubject: string;
  setSelectedSubject: (value: string) => void;
  selectedTopic: string;
  setSelectedTopic: (value: string) => void;
  subjects: Subject[];
  topicOptions: string[];
}

export function HistoryHeader({
  selectedSubject,
  setSelectedSubject,
  selectedTopic,
  setSelectedTopic,
  subjects,
  topicOptions
}: HistoryHeaderProps) {
  const navigate = useNavigate();

  return (
    <div className="mb-6 flex flex-col md:flex-row md:items-center md:justify-between">
      <div className="flex items-center">
        <Button 
          variant="outline" 
          onClick={() => navigate("/dashboard/paper-generation")}
          className="mr-4"
        >
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h1 className="text-3xl font-bold">Paper Generation History</h1>
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
              <SelectItem value="">All Subjects</SelectItem>
              {subjects && subjects.length > 0 && subjects.map((subject) => (
                <SelectItem key={subject.id} value={subject.id}>
                  {subject.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        
        <div className="w-full md:w-64">
          <Select 
            value={selectedTopic} 
            onValueChange={setSelectedTopic}
            disabled={topicOptions.length === 0}
          >
            <SelectTrigger>
              <SelectValue placeholder="Filter by topic" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Topics</SelectItem>
              {topicOptions.map((topic) => (
                <SelectItem key={topic} value={topic}>
                  {topic}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
