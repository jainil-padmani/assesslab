
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { GeneratedPaper, Question } from "@/types/papers";
import { useSubjects } from "@/hooks/test-selection/useSubjects";

export function usePaperHistory() {
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<GeneratedPaper[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [selectedTopic, setSelectedTopic] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);
  const [topicOptions, setTopicOptions] = useState<string[]>([]);
  const [selectedPaper, setSelectedPaper] = useState<GeneratedPaper | null>(null);
  const [selectedQuestions, setSelectedQuestions] = useState<Record<string, boolean>>({});
  const [isPaperDialogOpen, setIsPaperDialogOpen] = useState(false);
  const [isGeneratingCustomPaper, setIsGeneratingCustomPaper] = useState(false);
  const { subjects } = useSubjects();
  
  useEffect(() => {
    const fetchPapers = async () => {
      try {
        setIsLoading(true);
        const { data, error } = await supabase
          .from("generated_papers")
          .select("*, subjects(name)")
          .order("created_at", { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          // Map the data to include subject_name from the subjects join
          const mappedData = data.map((paper: any) => ({
            ...paper,
            subject_name: paper.subjects?.name || "Unknown Subject",
            questions: paper.questions as Question[] | any
          }));
          
          setPapers(mappedData);
          setFilteredPapers(mappedData);
          
          // Extract unique topics
          const topics = Array.from(new Set(mappedData.map(paper => paper.topic)));
          setTopicOptions(topics);
        }
      } catch (error: any) {
        console.error("Error fetching papers:", error);
        toast.error("Failed to load paper history");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchPapers();
  }, []);
  
  useEffect(() => {
    // Filter papers based on selected subject and topic
    let filtered = [...papers];
    
    if (selectedSubject) {
      filtered = filtered.filter(paper => paper.subject_id === selectedSubject);
      
      // Update topic options based on selected subject
      const subjectTopics = Array.from(new Set(
        papers
          .filter(paper => paper.subject_id === selectedSubject)
          .map(paper => paper.topic)
      ));
      setTopicOptions(subjectTopics);
      
      // Clear topic selection if the current selection is not in the new options
      if (selectedTopic && !subjectTopics.includes(selectedTopic)) {
        setSelectedTopic("");
      }
    } else {
      // Reset topic options if no subject is selected
      const allTopics = Array.from(new Set(papers.map(paper => paper.topic)));
      setTopicOptions(allTopics);
    }
    
    if (selectedTopic) {
      filtered = filtered.filter(paper => paper.topic === selectedTopic);
    }
    
    setFilteredPapers(filtered);
  }, [selectedSubject, selectedTopic, papers]);
  
  const viewPaperDetails = (paper: GeneratedPaper) => {
    setSelectedPaper(paper);
    
    // Initialize selected questions (all selected by default)
    if (Array.isArray(paper.questions)) {
      const initialSelected = {};
      (paper.questions as Question[]).forEach(q => {
        initialSelected[q.id] = true;
      });
      setSelectedQuestions(initialSelected);
    }
    
    setIsPaperDialogOpen(true);
  };
  
  const handleDownload = (paper: GeneratedPaper) => {
    const downloadUrl = paper.pdf_url || paper.paper_url;
    window.open(downloadUrl, '_blank');
  };
  
  const toggleQuestionSelection = (questionId: string) => {
    setSelectedQuestions(prev => ({
      ...prev,
      [questionId]: !prev[questionId]
    }));
  };
  
  const handleSelectAllQuestions = (selectAll: boolean) => {
    if (!selectedPaper || !Array.isArray(selectedPaper.questions)) return;
    
    const newSelection = {};
    (selectedPaper.questions as Question[]).forEach(q => {
      newSelection[q.id] = selectAll;
    });
    setSelectedQuestions(newSelection);
  };
  
  const generateCustomPaper = async () => {
    if (!selectedPaper) return;
    
    // Get the selected questions
    const questions = Array.isArray(selectedPaper.questions) 
      ? (selectedPaper.questions as Question[]).filter(q => selectedQuestions[q.id])
      : [];
    
    if (questions.length === 0) {
      toast.error("Please select at least one question");
      return;
    }
    
    setIsGeneratingCustomPaper(true);
    toast.info("Generating custom paper...");
    
    try {
      const subject = subjects.find(s => s.id === selectedPaper.subject_id);
      
      const response = await supabase.functions.invoke('generate-paper', {
        body: {
          subjectName: subject?.name || selectedPaper.subject_name || "Subject",
          subjectCode: subject?.subject_code || "",
          topicName: selectedPaper.topic,
          headerUrl: selectedPaper.header_url,
          questions: questions
        }
      });
      
      if (response.error) {
        toast.error(`Error creating paper: ${response.error.message}`);
        return;
      }
      
      // Open the generated paper
      if (response.data.pdfUrl) {
        window.open(response.data.pdfUrl, '_blank');
      } else {
        window.open(response.data.paperUrl, '_blank');
      }
      
      toast.success("Custom paper generated successfully");
      setIsPaperDialogOpen(false);
    } catch (error: any) {
      console.error("Error generating custom paper:", error);
      toast.error("Failed to generate custom paper");
    } finally {
      setIsGeneratingCustomPaper(false);
    }
  };

  return {
    papers,
    filteredPapers,
    selectedSubject,
    setSelectedSubject,
    selectedTopic,
    setSelectedTopic,
    isLoading,
    topicOptions,
    selectedPaper,
    setSelectedPaper,
    selectedQuestions,
    isPaperDialogOpen,
    setIsPaperDialogOpen,
    isGeneratingCustomPaper,
    subjects,  // Make sure we're returning the subjects property
    viewPaperDetails,
    handleDownload,
    toggleQuestionSelection,
    handleSelectAllQuestions,
    generateCustomPaper
  };
}
