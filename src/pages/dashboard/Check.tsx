
import { useState, useMemo } from "react";
import { toast } from "sonner";
import { useTestSelection } from "@/hooks/useTestSelection";
import { useEvaluations } from "@/hooks/useEvaluations";
import { TestSelectionCard } from "@/components/check/TestSelectionCard";
import { StudentAnswerSheetsCard } from "@/components/check/StudentAnswerSheetsCard";
import { EvaluationResultsCard } from "@/components/check/EvaluationResultsCard";

export default function Check() {
  // Use custom hooks for test selection and evaluations
  const { 
    selectedClass, setSelectedClass,
    selectedSubject, setSelectedSubject,
    selectedTest, setSelectedTest,
    classes, subjects, tests, testFiles, classStudents
  } = useTestSelection();

  const {
    evaluations,
    evaluatingStudents,
    setEvaluatingStudents,
    evaluationProgress,
    setEvaluationProgress,
    showResults,
    setShowResults,
    evaluatePaperMutation,
    getStudentAnswerSheetUrl
  } = useEvaluations(selectedTest, selectedSubject, classStudents);

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
      
      toast.success('Evaluation completed successfully');
    } catch (error) {
      console.error('Error in handleEvaluateSingle:', error);
      toast.error('Failed to evaluate paper');
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
      
      // Complete
      setEvaluationProgress(100);
      setShowResults(true);
      toast.success('All evaluations completed');
    } catch (error) {
      console.error('Error in handleEvaluateAll:', error);
      toast.error('Failed to evaluate papers');
    } finally {
      // Clear evaluating students
      setEvaluatingStudents([]);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Auto Check</h1>
      
      <div className="grid gap-6 md:grid-cols-1">
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

        {selectedTest && testFiles.length > 0 && classStudents.length > 0 && (
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
        
        {showResults && evaluations.length > 0 && (
          <EvaluationResultsCard
            evaluations={evaluations}
            classStudents={classStudents}
            selectedTest={selectedTest}
          />
        )}
      </div>
    </div>
  );
}
