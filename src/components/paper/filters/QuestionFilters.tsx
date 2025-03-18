
import { Input } from "@/components/ui/input";
import { Search } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface QuestionFiltersProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  questionMode: "all" | "multiple-choice" | "theory";
  setQuestionMode: (mode: "all" | "multiple-choice" | "theory") => void;
  level: string;
  courseOutcome?: number;
  marks: number;
}

export function QuestionFilters({ 
  searchQuery, 
  setSearchQuery, 
  questionMode, 
  setQuestionMode,
  level,
  courseOutcome,
  marks
}: QuestionFiltersProps) {
  return (
    <>
      <div className="relative">
        <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search questions..."
          className="pl-8"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
        />
      </div>
      
      <Tabs defaultValue="all" onValueChange={(value) => setQuestionMode(value as "all" | "multiple-choice" | "theory")}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="all">All Questions</TabsTrigger>
          <TabsTrigger value="multiple-choice">Multiple Choice</TabsTrigger>
          <TabsTrigger value="theory">Theory Questions</TabsTrigger>
        </TabsList>
      </Tabs>
      
      <div className="bg-muted/30 rounded-md p-2 text-sm">
        <span className="font-medium">Filters:</span>
        <span className="ml-2">Level: {level.charAt(0).toUpperCase() + level.slice(1)}</span>
        {courseOutcome && <span className="ml-2">• CO{courseOutcome}</span>}
        <span className="ml-2">• {marks} marks</span>
        {questionMode !== "all" && (
          <span className="ml-2">• Type: {questionMode === "multiple-choice" ? "Multiple Choice" : "Theory"}</span>
        )}
      </div>
    </>
  );
}
