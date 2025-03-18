
import { useState, useEffect } from "react";
import { Question } from "@/types/papers";

export function useQuestionFiltering(questions: Question[]) {
  const [searchQuery, setSearchQuery] = useState("");
  const [questionMode, setQuestionMode] = useState<"all" | "multiple-choice" | "theory">("all");
  const [filteredQuestions, setFilteredQuestions] = useState<Question[]>([]);

  // Filter questions based on search query and mode
  useEffect(() => {
    if (questions.length === 0) {
      setFilteredQuestions([]);
      return;
    }
    
    let filtered = questions;
    
    // Apply question mode filter
    if (questionMode !== "all") {
      if (questionMode === "multiple-choice") {
        filtered = filtered.filter(q => 
          q.type.toLowerCase().includes("multiple choice") || (q.options && q.options.length > 0)
        );
      } else if (questionMode === "theory") {
        filtered = filtered.filter(q => 
          !q.type.toLowerCase().includes("multiple choice") && (!q.options || q.options.length === 0)
        );
      }
    }
    
    // Apply search filter
    if (searchQuery.trim() !== "") {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(q => q.text.toLowerCase().includes(query));
    }
    
    setFilteredQuestions(filtered);
  }, [questions, searchQuery, questionMode]);

  return {
    searchQuery,
    setSearchQuery,
    questionMode,
    setQuestionMode,
    filteredQuestions
  };
}
