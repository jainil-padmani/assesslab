import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { History } from "lucide-react";
import { useSubjects } from "@/hooks/useSubjects";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { GeneratedPaper, Question, Json } from "@/types/papers";
import { SubjectSelect } from "@/components/paper-generation/SubjectSelect";
import { ContentUpload } from "@/components/paper-generation/ContentUpload";
import { QuestionTypes } from "@/components/paper-generation/QuestionTypes";
import { QuestionParameters } from "@/components/paper-generation/QuestionParameters";
import { GeneratedQuestions } from "@/components/paper-generation/GeneratedQuestions";
import { QuestionHistory } from "@/components/paper-generation/QuestionHistory";

interface CourseOutcome {
  id: string;
  co_number: number;
  description: string;
  questionCount: number;
  selected: boolean;
  open: boolean; // Track if this course outcome's collapsible is open
  questionDistribution: {
    "1 mark": number;
    "2 marks": number;
    "4 marks": number;
    "8 marks": number;
  }
}

type QuestionMode = "multiple-choice" | "theory";

interface TheoryQuestionConfig {
  "1 mark": number;
  "2 marks": number;
  "4 marks": number;
  "8 marks": number;
}

export default function PaperGeneration() {
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [topicName, setTopicName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [papers, setPapers] = useState<GeneratedPaper[]>([]);
  const [filteredPapers, setFilteredPapers] = useState<GeneratedPaper[]>([]);
  const [isHistoryLoading, setIsHistoryLoading] = useState(true);
  const { subjects, isLoading: isSubjectsLoading } = useSubjects();
  const navigate = useNavigate();
  
  const [contentUrl, setContentUrl] = useState<string>("");
  const [extractedContent, setExtractedContent] = useState<string>("");
  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generatedQuestions, setGeneratedQuestions] = useState<Question[]>([]);
  const [difficulty, setDifficulty] = useState<number>(50);
  const [bloomsTaxonomy, setBloomsTaxonomy] = useState<any>({
    remember: 20,
    understand: 20,
    apply: 15,
    analyze: 15,
    evaluate: 15,
    create: 15
  });
  
  const [questionMode, setQuestionMode] = useState<QuestionMode>("multiple-choice");
  const [multipleChoiceCount, setMultipleChoiceCount] = useState<number>(10);
  const [theoryQuestionConfig, setTheoryQuestionConfig] = useState<TheoryQuestionConfig>({
    "1 mark": 5,
    "2 marks": 3,
    "4 marks": 2,
    "8 marks": 1
  });
  
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [isLoadingCourseOutcomes, setIsLoadingCourseOutcomes] = useState(false);

  useEffect(() => {
    if (selectedSubject && papers.length > 0) {
      setFilteredPapers(papers.filter(paper => paper.subject_id === selectedSubject));
    } else {
      setFilteredPapers(papers);
    }
  }, [selectedSubject, papers]);

  useEffect(() => {
    fetchPapers();
  }, []);
  
  useEffect(() => {
    if (selectedSubject) {
      fetchCourseOutcomes(selectedSubject);
    } else {
      setCourseOutcomes([]);
    }
  }, [selectedSubject]);

  const fetchPapers = async () => {
    try {
      setIsHistoryLoading(true);
      console.log("Fetching papers...");
      const { data, error } = await supabase
        .from("generated_papers")
        .select("*, subjects(name)")
        .order("created_at", { ascending: false })
        .limit(100);
      
      if (error) {
        console.error("Error fetching papers:", error);
        throw error;
      }
      
      console.log("Papers data:", data);
      
      if (data) {
        const mappedData = data.map((paper: any) => ({
          ...paper,
          subject_name: paper.subjects?.name || "Unknown Subject",
          questions: paper.questions as Question[] | any
        }));
        
        setPapers(mappedData as GeneratedPaper[]);
        setFilteredPapers(mappedData as GeneratedPaper[]);
      } else {
        setPapers([]);
        setFilteredPapers([]);
      }
    } catch (error: any) {
      console.error("Error fetching papers:", error);
      toast.error("Failed to load paper history");
      setPapers([]);
      setFilteredPapers([]);
    } finally {
      setIsHistoryLoading(false);
    }
  };
  
  const fetchCourseOutcomes = async (subjectId: string) => {
    try {
      setIsLoadingCourseOutcomes(true);
      
      const { data, error } = await supabase
        .from('course_outcomes')
        .select('*')
        .eq('subject_id', subjectId)
        .order('co_number', { ascending: true });
      
      if (error) throw error;
      
      if (data && data.length > 0) {
        const mappedOutcomes = data.map(co => ({
          id: co.id,
          co_number: co.co_number,
          description: co.description,
          questionCount: 2,
          selected: true,
          open: false, // Initially collapsed
          questionDistribution: {
            "1 mark": 1,
            "2 marks": 1,
            "4 marks": 0,
            "8 marks": 0
          }
        }));
        
        setCourseOutcomes(mappedOutcomes);
      } else {
        setCourseOutcomes([]);
      }
    } catch (error) {
      console.error("Error fetching course outcomes:", error);
      toast.error("Failed to load course outcomes");
      setCourseOutcomes([]);
    } finally {
      setIsLoadingCourseOutcomes(false);
    }
  };

  const handleBloomsTaxonomyChange = (level: string, value: number[]) => {
    setBloomsTaxonomy(prev => ({
      ...prev,
      [level]: value[0]
    }));
  };

  const calculateTotalMarks = () => {
    if (questionMode === "multiple-choice") {
      return multipleChoiceCount;
    } else {
      if (courseOutcomes.length > 0) {
        const selectedCourseOutcomes = courseOutcomes.filter(co => co.selected);
        let totalMarks = 0;
        
        selectedCourseOutcomes.forEach(co => {
          totalMarks += co.questionDistribution["1 mark"] * 1;
          totalMarks += co.questionDistribution["2 marks"] * 2;
          totalMarks += co.questionDistribution["4 marks"] * 4;
          totalMarks += co.questionDistribution["8 marks"] * 8;
        });
        
        return totalMarks;
      } else {
        return (
          theoryQuestionConfig["1 mark"] * 1 +
          theoryQuestionConfig["2 marks"] * 2 +
          theoryQuestionConfig["4 marks"] * 4 +
          theoryQuestionConfig["8 marks"] * 8
        );
      }
    }
  };

  const generateQuestions = async () => {
    if (!extractedContent && !contentUrl) {
      toast.error("Please upload content material first");
      return;
    }
    
    if (!selectedSubject) {
      toast.error("Please select a subject");
      return;
    }
    
    if (!topicName) {
      toast.error("Please enter a topic name");
      return;
    }
    
    if (questionMode === "theory" && courseOutcomes.length > 0) {
      const selectedCourseOutcomes = courseOutcomes.filter(co => co.selected);
      if (selectedCourseOutcomes.length === 0) {
        toast.error("Please select at least one course outcome for theory questions");
        return;
      }
    }
    
    setIsGenerating(true);
    toast.info("Generating questions, this may take a moment...");
    
    try {
      let questionTypesConfig = {};
      
      if (questionMode === "multiple-choice") {
        questionTypesConfig = {
          "Multiple Choice (1 mark)": multipleChoiceCount
        };
      } else {
        if (courseOutcomes.length > 0) {
          const selectedCourseOutcomes = courseOutcomes.filter(co => co.selected);
          const aggregatedDistribution = {
            "Short Answer (1 mark)": 0,
            "Short Answer (2 marks)": 0,
            "Medium Answer (4 marks)": 0,
            "Long Answer (8 marks)": 0
          };
          
          selectedCourseOutcomes.forEach(co => {
            aggregatedDistribution["Short Answer (1 mark)"] += co.questionDistribution["1 mark"];
            aggregatedDistribution["Short Answer (2 marks)"] += co.questionDistribution["2 marks"];
            aggregatedDistribution["Medium Answer (4 marks)"] += co.questionDistribution["4 marks"];
            aggregatedDistribution["Long Answer (8 marks)"] += co.questionDistribution["8 marks"];
          });
          
          questionTypesConfig = aggregatedDistribution;
        } else {
          questionTypesConfig = {
            "Short Answer (1 mark)": theoryQuestionConfig["1 mark"],
            "Short Answer (2 marks)": theoryQuestionConfig["2 marks"],
            "Medium Answer (4 marks)": theoryQuestionConfig["4 marks"],
            "Long Answer (8 marks)": theoryQuestionConfig["8 marks"]
          };
        }
      }
      
      const response = await supabase.functions.invoke('generate-questions', {
        body: {
          topic: topicName,
          content: extractedContent || "No content provided",
          bloomsTaxonomy,
          difficulty,
          courseOutcomes: courseOutcomes.length > 0 && questionMode === "theory" 
            ? courseOutcomes.filter(co => co.selected) 
            : undefined,
          questionTypes: questionTypesConfig,
          questionMode: questionMode
        }
      });
      
      if (response.error) {
        console.error("Error generating questions:", response.error);
        toast.error(`Error generating questions: ${response.error}`);
        setIsGenerating(false);
        return;
      }
      
      setGeneratedQuestions(response.data.questions);
      
      if (response.data.warning) {
        toast.warning(response.data.warning);
      }
      
      try {
        const { error: saveQuestionsError } = await supabase.from('generated_questions').insert({
          subject_id: selectedSubject,
          topic: topicName,
          questions: response.data.questions as Json,
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          question_mode: questionMode
        });
        
        if (saveQuestionsError) throw saveQuestionsError;
        
        const questionsJson = response.data.questions as Json;
        
        const { error: savePaperError } = await supabase.from('generated_papers').insert({
          subject_id: selectedSubject,
          topic: topicName,
          paper_url: "",
          questions: questionsJson,
          content_url: contentUrl || null,
          user_id: (await supabase.auth.getUser()).data.user?.id || '',
          question_mode: questionMode
        });
        
        if (savePaperError) throw savePaperError;
        
        toast.success("Questions generated and saved successfully");
        fetchPapers();
      } catch (saveError) {
        console.error("Error saving questions:", saveError);
        toast.error("Questions generated but failed to save to history");
      }
    } catch (error) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setIsGenerating(false);
    }
  };

  const viewQuestionsHistory = () => {
    navigate("/dashboard/paper-generation/questions-history");
  };

  const isGenerateDisabled = () => {
    return (
      isGenerating || 
      (!extractedContent && !contentUrl) || 
      !selectedSubject || 
      !topicName || 
      (questionMode === "theory" && courseOutcomes.length > 0 && courseOutcomes.filter(co => co.selected).length === 0)
    );
  };

  const clearQuestions = () => {
    setGeneratedQuestions([]);
  };

  const updateQuestions = (updatedQuestions: Question[]) => {
    setGeneratedQuestions(updatedQuestions);
  };

  return (
    <div className="container max-w-4xl mx-auto py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Questions Generation</h1>
        <Button
          variant="outline"
          onClick={viewQuestionsHistory}
          className="flex items-center gap-2"
        >
          <History className="h-4 w-4" />
          View Questions History
        </Button>
      </div>
      
      {generatedQuestions.length === 0 ? (
        <div className="space-y-6">
          <SubjectSelect
            selectedSubject={selectedSubject}
            setSelectedSubject={setSelectedSubject}
            topicName={topicName}
            setTopicName={setTopicName}
            subjects={subjects}
            isSubjectsLoading={isSubjectsLoading}
          />
          
          <ContentUpload
            selectedSubject={selectedSubject}
            contentUrl={contentUrl}
            setContentUrl={setContentUrl}
            extractedContent={extractedContent}
            setExtractedContent={setExtractedContent}
          />
          
          <QuestionTypes
            questionMode={questionMode}
            setQuestionMode={setQuestionMode}
            multipleChoiceCount={multipleChoiceCount}
            setMultipleChoiceCount={setMultipleChoiceCount}
            theoryQuestionConfig={theoryQuestionConfig}
            setTheoryQuestionConfig={setTheoryQuestionConfig}
            courseOutcomes={courseOutcomes}
            setCourseOutcomes={setCourseOutcomes}
            isLoadingCourseOutcomes={isLoadingCourseOutcomes}
            calculateTotalMarks={calculateTotalMarks}
          />
          
          <QuestionParameters
            difficulty={difficulty}
            setDifficulty={setDifficulty}
            bloomsTaxonomy={bloomsTaxonomy}
            handleBloomsTaxonomyChange={handleBloomsTaxonomyChange}
            generateQuestions={generateQuestions}
            isGenerating={isGenerating}
            isDisabled={isGenerateDisabled()}
          />
        </div>
      ) : (
        <GeneratedQuestions
          questions={generatedQuestions}
          topicName={topicName}
          clearQuestions={clearQuestions}
          updateQuestions={updateQuestions}
        />
      )}
      
      {filteredPapers.length > 0 && generatedQuestions.length === 0 && (
        <QuestionHistory
          papers={filteredPapers}
          fetchPapers={fetchPapers}
        />
      )}
    </div>
  );
}
