
import { useState, useMemo, useEffect } from "react";
import { toast } from "sonner";
import { useTestSelection } from "@/hooks/useTestSelection";
import { useEvaluations } from "@/hooks/useEvaluations";
import { TestSelectionCard } from "@/components/check/TestSelectionCard";
import { StudentAnswerSheetsCard } from "@/components/check/StudentAnswerSheetsCard";
import { EvaluationResultsCard } from "@/components/check/EvaluationResultsCard";
import { AutoCheckGuide } from "@/components/check/AutoCheckGuide";
import { Button } from "@/components/ui/button";
import { Info, AlertCircle, CheckCircle2 } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";

export default function Check() {
  // State for showing the guide
  const [showGuide, setShowGuide] = useState(false);
  
  // Use custom hooks for test selection
  const { 
    selectedClass, setSelectedClass,
    selectedSubject, setSelectedSubject,
    selectedTest, setSelectedTest,
    classes, subjects, tests, testFiles, classStudents
  } = useTestSelection();

  // Use our optimized useEvaluations hook
  const {
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
  } = useEvaluations(selectedTest, selectedSubject, classStudents);

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

  // Stats for the evaluation progress
  const stats = useMemo(() => {
    const total = evaluations.length;
    const completed = evaluations.filter(e => e.status === 'completed').length;
    const pending = evaluations.filter(e => e.status === 'pending').length;
    const percent = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    return { total, completed, pending, percent };
  }, [evaluations]);

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
      toast.error('Failed to evaluate paper: ' + (error instanceof Error ? error.message : 'Unknown error'));
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
      toast.error('Failed to evaluate papers: ' + (error instanceof Error ? error.message : 'Unknown error'));
    } finally {
      // Clear evaluating students
      setEvaluatingStudents([]);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Auto Grade</h1>
          <p className="text-muted-foreground mt-1">AI-powered paper evaluation</p>
        </div>
        <Button
          variant="outline"
          onClick={() => setShowGuide(true)}
          className="flex items-center gap-2"
        >
          <Info className="h-4 w-4" />
          How to Use Auto Grade
        </Button>
      </div>
      
      {showGuide ? (
        <AutoCheckGuide onClose={() => setShowGuide(false)} />
      ) : (
        <div className="grid gap-6 md:grid-cols-1">
          <Alert variant="default" className="bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
            <AlertCircle className="h-4 w-4 text-blue-600 dark:text-blue-400" />
            <AlertDescription className="text-blue-800 dark:text-blue-300">
              Auto Grade uses AI to evaluate student answer sheets. Select a test, ensure it has question papers and answer keys, then evaluate student submissions.
            </AlertDescription>
          </Alert>
          
          {/* Overview Card */}
          {selectedTest && evaluations.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg">Evaluation Progress</CardTitle>
                <CardDescription>
                  {stats.completed} of {stats.total} papers evaluated
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Progress value={stats.percent} className="h-2"/>
                  
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="p-2 bg-green-50 dark:bg-green-900/20 rounded-lg">
                      <div className="flex justify-center mb-1">
                        <CheckCircle2 className="h-5 w-5 text-green-600 dark:text-green-400" />
                      </div>
                      <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                        {stats.completed}
                      </div>
                      <p className="text-xs text-green-800 dark:text-green-300">Completed</p>
                    </div>
                    
                    <div className="p-2 bg-amber-50 dark:bg-amber-900/20 rounded-lg">
                      <div className="flex justify-center mb-1">
                        <AlertCircle className="h-5 w-5 text-amber-600 dark:text-amber-400" />
                      </div>
                      <div className="text-2xl font-bold text-amber-600 dark:text-amber-400">
                        {stats.pending}
                      </div>
                      <p className="text-xs text-amber-800 dark:text-amber-300">Pending</p>
                    </div>
                    
                    <div className="p-2 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
                      <div className="flex justify-center mb-1">
                        <div className="h-5 w-5 text-blue-600 dark:text-blue-400 font-bold">%</div>
                      </div>
                      <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                        {stats.percent}
                      </div>
                      <p className="text-xs text-blue-800 dark:text-blue-300">Complete</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
          
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
          
          {(showResults || evaluations.some(e => e.status === 'completed')) && (
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
