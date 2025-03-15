
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { HistoryHeader } from "@/components/paper-history/HistoryHeader";
import { PaperHistoryTable } from "@/components/paper-history/PaperHistoryTable";
import { PaperDetailsDialog } from "@/components/paper-history/PaperDetailsDialog";
import { usePaperHistory } from "@/hooks/paper-history/usePaperHistory";

export default function PaperHistory() {
  const {
    filteredPapers,
    selectedSubject,
    setSelectedSubject,
    selectedTopic,
    setSelectedTopic,
    isLoading,
    topicOptions,
    selectedPaper,
    selectedQuestions,
    isPaperDialogOpen,
    setIsPaperDialogOpen,
    isGeneratingCustomPaper,
    subjects,
    viewPaperDetails,
    handleDownload,
    toggleQuestionSelection,
    handleSelectAllQuestions,
    generateCustomPaper
  } = usePaperHistory();
  
  return (
    <div className="container mx-auto py-6">
      <HistoryHeader 
        selectedSubject={selectedSubject}
        setSelectedSubject={setSelectedSubject}
        selectedTopic={selectedTopic}
        setSelectedTopic={setSelectedTopic}
        subjects={subjects}
        topicOptions={topicOptions}
      />
      
      <Card>
        <CardHeader>
          <CardTitle>Generated Papers</CardTitle>
          <CardDescription>
            View and download your previously generated test papers
          </CardDescription>
        </CardHeader>
        <CardContent>
          <PaperHistoryTable
            filteredPapers={filteredPapers}
            isLoading={isLoading}
            viewPaperDetails={viewPaperDetails}
            handleDownload={handleDownload}
          />
        </CardContent>
      </Card>
      
      <PaperDetailsDialog
        isPaperDialogOpen={isPaperDialogOpen}
        setIsPaperDialogOpen={setIsPaperDialogOpen}
        selectedPaper={selectedPaper}
        selectedQuestions={selectedQuestions}
        toggleQuestionSelection={toggleQuestionSelection}
        handleSelectAllQuestions={handleSelectAllQuestions}
        isGeneratingCustomPaper={isGeneratingCustomPaper}
        generateCustomPaper={generateCustomPaper}
      />
    </div>
  );
}
