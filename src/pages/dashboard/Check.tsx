
import { useState, useMemo, useCallback, useEffect } from "react";
import { toast } from "sonner";
import { useTestSelection } from "@/hooks/useTestSelection";
import { useEvaluations } from "@/hooks/useEvaluations";
import { TestSelectionCard } from "@/components/check/TestSelectionCard";
import { StudentAnswerSheetsCard } from "@/components/check/StudentAnswerSheetsCard";
import { EvaluationResultsCard } from "@/components/check/EvaluationResultsCard";
import { AutoCheckGuide } from "@/components/check/AutoCheckGuide";
import { Button } from "@/components/ui/button";
import { Info, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

export default function Check() {
  // State for showing the guide
  const [showGuide, setShowGuide] = useState(false);
  
  // Use custom hooks for test selection and evaluations
  const { 
    selectedClass, setSelectedClass,
    selectedSubject, setSelectedSubject,
    selectedTest, setSelectedTest,
    classes, subjects, tests, testFiles, classStudents
  } = useTestSelection();

  const {
    evaluationData,
    evaluations,
    evaluatingStudents,
    setEvaluatingStudents,
    evaluationProgress,
    setEvaluationProgress,
    showResults,
    setShowResults,
    refetchEvaluations,
    evaluatePaperMutation,
    getStudentAnswerSheetUrl
  } = useEvaluations(selectedTest, selectedSubject);

  // Set up event listener for answer sheet uploads
  useEffect(() => {
    const handleAnswerSheetUploaded = () => {
      console.log('Answer sheet uploaded event received - refreshing evaluations');
      refetchEvaluations();
    };

    document.addEventListener('answerSheetUploaded', handleAnswerSheetUploaded);
    
    return () => {
      document.removeEventListener('answerSheetUploaded', handleAnswerSheetUploaded);
    };
  }, [refetchEvaluations]);

  // Extract question papers and answer keys from test files
  const { questionPapers, answerKeys } = useMemo(() => {
    const questionPapers = testFiles.filter(file => file.question_paper_url);
    const answerKeys = testFiles.filter(file => file.answer_key_url);
    return { questionPapers, answerKeys };
  }, [testFiles]);

  const handleEvaluateSingle = async (studentId: string) => {
    try {
      // Check if we have a question paper and answer key
      if (questionPapers.length === 0 || answerKeys.length === 0) {
        toast.error('Missing question paper or answer key');
        return;
      }
      
      // Get the student's answer sheet URL
      const answerSheetUrl = await getStudentAnswerSheetUrl(studentId);
      if (!answerSheetUrl) {
        toast.error('No answer sheet found for this student');
        return;
      }
      
      // Find the student
      const student = classStudents.find(s => s.id === studentId);
      if (!student) {
        toast.error('Student not found');
        return;
      }
      
      // Find the selected class
      const selectedClassData = classes.find(c => c.id === selectedClass);
      if (!selectedClassData) {
        toast.error('Class not found');
        return;
      }
      
      // Find the selected subject
      const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
      if (!selectedSubjectData) {
        toast.error('Subject not found');
        return;
      }
      
      // Prepare student info
      const studentInfo = {
        id: student.id,
        name: student.name,
        roll_number: student.roll_number || '',
        class: selectedClassData.name,
        subject: selectedSubjectData.name
      };
      
      // Set the student as evaluating
      setEvaluatingStudents(prev => [...prev, studentId]);
      
      // Show toast
      toast.info(`Evaluating ${student.name}'s answer sheet...`);
      
      // Evaluate the paper
      await evaluatePaperMutation.mutateAsync({
        studentId,
        testId: selectedTest,
        subjectId: selectedSubject,
        answerSheetUrl,
        questionPaperUrl: questionPapers[0].question_paper_url,
        questionPaperTopic: questionPapers[0].topic,
        answerKeyUrl: answerKeys[0].answer_key_url,
        answerKeyTopic: answerKeys[0].topic,
        studentInfo
      });
      
      // Refetch evaluations to update the UI
      refetchEvaluations();
      
    } catch (error) {
      console.error('Error in handleEvaluateSingle:', error);
      toast.error('Failed to evaluate paper: ' + ((error instanceof Error) ? error.message : 'Unknown error'));
    } finally {
      // Remove the student from evaluating list
      setEvaluatingStudents(prev => prev.filter(id => id !== studentId));
    }
  };

  const handleEvaluateAll = async () => {
    try {
      // Check if we have a question paper and answer key
      if (questionPapers.length === 0 || answerKeys.length === 0) {
        toast.error('Missing question paper or answer key');
        return;
      }
      
      // Get students with answer sheets
      const studentsWithSheets = await Promise.all(
        classStudents.map(async student => {
          const answerSheetUrl = await getStudentAnswerSheetUrl(student.id);
          return { student, answerSheetUrl };
        })
      );
      
      const validStudents = studentsWithSheets.filter(({ answerSheetUrl }) => !!answerSheetUrl);
      
      if (validStudents.length === 0) {
        toast.error('No students have uploaded answer sheets');
        return;
      }
      
      // Reset progress
      setEvaluationProgress(0);
      setShowResults(false);
      
      // Start the evaluation process
      toast.info(`Starting evaluation for ${validStudents.length} students`);
      
      // Set all students as evaluating
      setEvaluatingStudents(validStudents.map(({ student }) => student.id));
      
      // Find class and subject data
      const selectedClassData = classes.find(c => c.id === selectedClass);
      const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
      
      if (!selectedClassData || !selectedSubjectData) {
        toast.error('Class or subject data not found');
        return;
      }
      
      // Evaluate papers one by one
      for (let i = 0; i < validStudents.length; i++) {
        const { student, answerSheetUrl } = validStudents[i];
        
        try {
          // Prepare student info
          const studentInfo = {
            id: student.id,
            name: student.name,
            roll_number: student.roll_number || '',
            class: selectedClassData.name,
            subject: selectedSubjectData.name
          };
          
          await evaluatePaperMutation.mutateAsync({
            studentId: student.id,
            testId: selectedTest,
            subjectId: selectedSubject,
            answerSheetUrl: answerSheetUrl!,
            questionPaperUrl: questionPapers[0].question_paper_url,
            questionPaperTopic: questionPapers[0].topic,
            answerKeyUrl: answerKeys[0].answer_key_url,
            answerKeyTopic: answerKeys[0].topic,
            studentInfo
          });
          
          // Update progress
          setEvaluationProgress(Math.round(((i + 1) / validStudents.length) * 100));
        } catch (error) {
          console.error(`Error evaluating paper for student ${student.name}:`, error);
        }
      }
      
      // Complete and refetch evaluations
      setEvaluationProgress(100);
      setShowResults(true);
      refetchEvaluations();
      toast.success('All evaluations completed');
    } catch (error) {
      console.error('Error in handleEvaluateAll:', error);
      toast.error('Failed to evaluate papers: ' + ((error instanceof Error) ? error.message : 'Unknown error'));
    } finally {
      // Clear evaluating students
      setEvaluatingStudents([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Auto Check</h1>
        <Button
          variant="outline"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-2"
        >
          <Info className="h-4 w-4" />
          How to Use Auto Check
        </Button>
      </div>
      
      {showGuide ? (
        <AutoCheckGuide onClose={() => setShowGuide(false)} />
      ) : (
        <div className="grid gap-6 md:grid-cols-1">
          <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              Auto Check uses AI to evaluate student answer sheets. Select a test, ensure it has question papers and answer keys, then evaluate student submissions.
            </AlertDescription>
          </Alert>
          
          <TestSelectionCard
            classes={classes}
            subjects={subjects}
            tests={tests}
            testFiles={testFiles}
            selectedClass={selectedClass}
            selectedSubject={selectedSubject}
            selectedTest={selectedTest}
            setSelectedClass={setSelectedClass}
            setSelectedSubject={setSelectedSubject}
            setSelectedTest={setSelectedTest}
          />

          {selectedTest && classStudents.length > 0 && (
            <StudentAnswerSheetsCard
              selectedTest={selectedTest}
              selectedSubject={selectedSubject}
              testFiles={testFiles}
              classStudents={classStudents}
              subjects={subjects}
              evaluations={evaluations}
              evaluatingStudents={evaluatingStudents}
              evaluationProgress={evaluationProgress}
              onEvaluateSingle={handleEvaluateSingle}
              onEvaluateAll={handleEvaluateAll}
            />
          )}
          
          {(showResults || evaluations.some(e => e.status === 'evaluated')) && (
            <EvaluationResultsCard
              evaluations={evaluations}
              classStudents={classStudents}
              selectedTest={selectedTest}
              refetchEvaluations={refetchEvaluations}
            />
          )}
        </div>
      )}
    </div>
  );
}
