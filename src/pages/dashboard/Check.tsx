
import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Upload, CheckCircle, FileCheck, FilePlus, AlertCircle, FileX } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Student, Subject } from "@/types/dashboard";
import type { Test } from "@/types/tests";
import { fetchTestFiles } from "@/utils/subjectFilesUtils";

interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
}

interface TestFile {
  id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
}

type EvaluationStatus = 'pending' | 'in_progress' | 'completed' | 'failed';

interface PaperEvaluation {
  id: string;
  test_id: string;
  student_id: string;
  subject_id: string;
  evaluation_data: any;
  status: EvaluationStatus;
  created_at: string;
  updated_at: string;
}

export default function Check() {
  // Step selections
  const [selectedClass, setSelectedClass] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedTest, setSelectedTest] = useState("");
  
  // Data states
  const [classes, setClasses] = useState<Class[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [testFiles, setTestFiles] = useState<TestFile[]>([]);
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  
  // UI states
  const [isLoading, setIsLoading] = useState(false);
  const [uploadingFor, setUploadingFor] = useState<string | null>(null);
  const [studentUploads, setStudentUploads] = useState<Record<string, File | null>>({});
  const [evaluatingStudents, setEvaluatingStudents] = useState<string[]>([]);
  const [evaluationProgress, setEvaluationProgress] = useState(0);
  const [evaluationResults, setEvaluationResults] = useState<Record<string, any>>({});
  const [showResults, setShowResults] = useState(false);

  const queryClient = useQueryClient();

  useEffect(() => {
    fetchClasses();
  }, []);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
      fetchClassStudents();
    } else {
      setSubjects([]);
      setClassStudents([]);
    }
    setSelectedSubject("");
    setSelectedTest("");
    setTests([]);
    setTestFiles([]);
  }, [selectedClass]);

  useEffect(() => {
    if (selectedSubject) {
      fetchTests();
    } else {
      setTests([]);
    }
    setSelectedTest("");
    setTestFiles([]);
  }, [selectedSubject]);

  useEffect(() => {
    if (selectedTest) {
      fetchTestPapers();
      fetchExistingEvaluations();
    } else {
      setTestFiles([]);
    }
  }, [selectedTest]);

  // Use React Query for evaluations
  const { data: evaluations = [], refetch: refetchEvaluations } = useQuery({
    queryKey: ['evaluations', selectedTest],
    queryFn: async () => {
      if (!selectedTest) return [];
      
      const { data, error } = await supabase
        .from('paper_evaluations')
        .select('*')
        .eq('test_id', selectedTest);
      
      if (error) {
        console.error("Error fetching evaluations:", error);
        return [];
      }
      
      return data as PaperEvaluation[];
    },
    enabled: !!selectedTest
  });

  const fetchClasses = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('user_id', user.id)
        .order('name');
      
      if (error) throw error;
      if (data) setClasses(data);
    } catch (error: any) {
      toast.error('Failed to fetch classes');
      console.error('Error fetching classes:', error);
    }
  };

  const fetchSubjects = async () => {
    try {
      if (!selectedClass) return;
      
      // Get subjects enrolled for this class via subject_enrollments
      const { data: enrollments, error: enrollmentsError } = await supabase
        .from('subject_enrollments')
        .select('subject_id, subjects(*)')
        .eq('student_id.class_id', selectedClass)
        .order('created_at', { ascending: false });
      
      if (enrollmentsError) {
        console.error('Error fetching enrollments:', enrollmentsError);
        
        // Alternative approach: Get all subjects for the class directly
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .order('name');
        
        if (subjectsError) throw subjectsError;
        if (subjectsData) {
          setSubjects(subjectsData);
          return;
        }
      }
      
      if (enrollments && enrollments.length > 0) {
        // Extract unique subjects from enrollments
        const uniqueSubjects = enrollments
          .filter(enrollment => enrollment.subjects)
          .map(enrollment => enrollment.subjects as Subject)
          .filter((subject, index, self) => 
            index === self.findIndex((s) => s.id === subject.id)
          );
        
        setSubjects(uniqueSubjects);
      } else {
        // If no enrollments, try to get tests for the selected class to find which subjects are being tested
        const { data: testsData, error: testsError } = await supabase
          .from('tests')
          .select('subject_id')
          .eq('class_id', selectedClass)
          .order('created_at', { ascending: false });
        
        if (testsError) throw testsError;
        
        // Extract unique subject IDs
        const subjectIds = [...new Set(testsData?.map(test => test.subject_id) || [])];
        
        if (subjectIds.length === 0) {
          // If no tests, fetch all subjects
          const { data: allSubjects, error: allSubjectsError } = await supabase
            .from('subjects')
            .select('*')
            .order('name');
          
          if (allSubjectsError) throw allSubjectsError;
          setSubjects(allSubjects || []);
          return;
        }

        // Fetch those subjects
        const { data: subjectsData, error: subjectsError } = await supabase
          .from('subjects')
          .select('*')
          .in('id', subjectIds)
          .order('name');
        
        if (subjectsError) throw subjectsError;
        if (subjectsData) setSubjects(subjectsData);
      }
    } catch (error: any) {
      toast.error('Failed to fetch subjects');
      console.error('Error fetching subjects:', error);
    }
  };

  const fetchClassStudents = async () => {
    try {
      if (!selectedClass) return;

      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('class_id', selectedClass)
        .order('name');
      
      if (error) throw error;
      if (data) setClassStudents(data);
    } catch (error: any) {
      toast.error('Failed to fetch students');
      console.error('Error fetching students:', error);
    }
  };

  const fetchTests = async () => {
    try {
      if (!selectedClass || !selectedSubject) return;

      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('class_id', selectedClass)
        .eq('subject_id', selectedSubject)
        .order('test_date', { ascending: false });
      
      if (error) throw error;
      if (data) setTests(data);
    } catch (error: any) {
      toast.error('Failed to fetch tests');
      console.error('Error fetching tests:', error);
    }
  };

  const fetchTestPapers = async () => {
    try {
      if (!selectedTest) return;
      
      const files = await fetchTestFiles(selectedTest);
      setTestFiles(files);
    } catch (error: any) {
      toast.error('Failed to fetch test papers');
      console.error('Error fetching test papers:', error);
    }
  };

  const fetchExistingEvaluations = async () => {
    try {
      refetchEvaluations();
    } catch (error: any) {
      console.error('Error fetching evaluations:', error);
    }
  };

  // Extract PDFs from test files
  const { questionPapers, answerKeys } = useMemo(() => {
    const questionPapers = testFiles.filter(file => file.question_paper_url);
    const answerKeys = testFiles.filter(file => file.answer_key_url);
    return { questionPapers, answerKeys };
  }, [testFiles]);

  const handleFileChange = (studentId: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please upload PDF files only');
        return;
      }
      
      setStudentUploads(prev => ({
        ...prev,
        [studentId]: selectedFile
      }));
    }
  };

  const handleUploadSheet = async (studentId: string) => {
    const file = studentUploads[studentId];
    if (!file) {
      toast.error('Please select a file to upload');
      return;
    }

    if (!selectedTest || testFiles.length === 0) {
      toast.error('No test or test papers selected');
      return;
    }

    setUploadingFor(studentId);
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`answer-sheets/${fileName}`, file);

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(`answer-sheets/${fileName}`);

      const { error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          student_id: studentId,
          subject_id: selectedSubject,
          answer_sheet_url: publicUrl,
          status: 'pending'
        });

      if (assessmentError) throw assessmentError;

      toast.success('Answer sheet uploaded successfully');
      setStudentUploads(prev => {
        const updated = { ...prev };
        delete updated[studentId];
        return updated;
      });
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error uploading answer sheet:', error);
    } finally {
      setUploadingFor(null);
    }
  };

  // Mutation for evaluating one student's paper
  const evaluatePaperMutation = useMutation({
    mutationFn: async ({ 
      studentId, 
      testId, 
      subjectId, 
      answerSheetUrl 
    }: { 
      studentId: string; 
      testId: string; 
      subjectId: string; 
      answerSheetUrl: string 
    }) => {
      // Find the student
      const student = classStudents.find(s => s.id === studentId);
      if (!student) throw new Error('Student not found');
      
      // Find the selected class
      const selectedClassData = classes.find(c => c.id === selectedClass);
      if (!selectedClassData) throw new Error('Class not found');
      
      // Find the selected subject
      const selectedSubjectData = subjects.find(s => s.id === selectedSubject);
      if (!selectedSubjectData) throw new Error('Subject not found');
      
      // Prepare student info
      const studentInfo = {
        id: student.id,
        name: student.name,
        roll_number: student.roll_number || '',
        class: selectedClassData.name,
        subject: selectedSubjectData.name
      };
      
      // Call the edge function to evaluate the paper
      const { data, error } = await supabase.functions.invoke('evaluate-paper', {
        body: {
          questionPaper: {
            url: questionPapers[0]?.question_paper_url,
            topic: questionPapers[0]?.topic
          },
          answerKey: {
            url: answerKeys[0]?.answer_key_url,
            topic: answerKeys[0]?.topic
          },
          studentAnswer: {
            url: answerSheetUrl,
            studentId
          },
          studentInfo
        }
      });
      
      if (error) throw error;
      
      // Store the evaluation results
      const { error: dbError } = await supabase
        .from('paper_evaluations')
        .upsert({
          test_id: testId,
          student_id: studentId,
          subject_id: subjectId,
          evaluation_data: data,
          status: 'completed'
        });
      
      if (dbError) throw dbError;
      
      // Update test grades with the score
      if (data?.summary?.totalScore) {
        const [score, maxScore] = data.summary.totalScore;
        
        const { error: gradeError } = await supabase
          .from('test_grades')
          .upsert({
            test_id: testId,
            student_id: studentId,
            marks: score,
            remarks: `Auto-evaluated: ${score}/${maxScore}`
          });
        
        if (gradeError) console.error('Error updating test grade:', gradeError);
      }
      
      return data;
    },
    onSuccess: (data, variables) => {
      // Update the evaluation results
      setEvaluationResults(prev => ({
        ...prev,
        [variables.studentId]: data
      }));
      
      // Refetch evaluations
      refetchEvaluations();
    },
    onError: (error) => {
      console.error('Error evaluating paper:', error);
      toast.error(`Evaluation failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  });

  const getStudentEvaluationStatus = (studentId: string): EvaluationStatus => {
    const evaluation = evaluations.find(e => e.student_id === studentId);
    return evaluation?.status || 'pending';
  };

  const getStudentAnswerSheetUrl = async (studentId: string): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('assessments')
        .select('answer_sheet_url')
        .eq('student_id', studentId)
        .eq('subject_id', selectedSubject)
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
      
      if (error) {
        console.error('Error fetching answer sheet URL:', error);
        return null;
      }
      
      return data?.answer_sheet_url || null;
    } catch (error) {
      console.error('Error in getStudentAnswerSheetUrl:', error);
      return null;
    }
  };

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
      
      // Set the student as evaluating
      setEvaluatingStudents(prev => [...prev, studentId]);
      
      // Evaluate the paper
      await evaluatePaperMutation.mutateAsync({
        studentId,
        testId: selectedTest,
        subjectId: selectedSubject,
        answerSheetUrl
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
      
      // Evaluate papers one by one
      for (let i = 0; i < validStudents.length; i++) {
        const { student, answerSheetUrl } = validStudents[i];
        
        try {
          await evaluatePaperMutation.mutateAsync({
            studentId: student.id,
            testId: selectedTest,
            subjectId: selectedSubject,
            answerSheetUrl: answerSheetUrl!
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
      
      // Refetch evaluations
      refetchEvaluations();
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
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              Select Test Details
            </CardTitle>
            <CardDescription>
              Select the class, subject, and test to check student answer sheets
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="class">Class</Label>
                <Select value={selectedClass} onValueChange={setSelectedClass}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select Class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name} {cls.year ? `(Year ${cls.year})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select 
                  value={selectedSubject} 
                  onValueChange={setSelectedSubject} 
                  disabled={!selectedClass || subjects.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedClass ? "Select class first" : subjects.length === 0 ? "No subjects available" : "Select Subject"} />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="test">Test</Label>
                <Select 
                  value={selectedTest} 
                  onValueChange={setSelectedTest}
                  disabled={!selectedSubject || tests.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={!selectedSubject ? "Select subject first" : tests.length === 0 ? "No tests available" : "Select Test"} />
                  </SelectTrigger>
                  <SelectContent>
                    {tests.map((test) => (
                      <SelectItem key={test.id} value={test.id}>
                        {test.name} ({new Date(test.test_date).toLocaleDateString()})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {testFiles.length > 0 && (
              <div className="mt-4 border rounded-md p-4">
                <h3 className="text-sm font-medium mb-2">Test Papers Available:</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {testFiles.map((file, index) => (
                    <div key={index} className="flex flex-col space-y-2">
                      <p className="text-sm font-medium">{file.topic}</p>
                      <div className="flex space-x-2">
                        <a href={file.question_paper_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            View Question Paper
                          </Button>
                        </a>
                        <a href={file.answer_key_url} target="_blank" rel="noopener noreferrer">
                          <Button variant="outline" size="sm">
                            View Answer Key
                          </Button>
                        </a>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {selectedTest && testFiles.length > 0 && classStudents.length > 0 && (
          <Card>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>Student Answer Sheets</CardTitle>
                  <CardDescription>Upload handwritten answer sheets for each student</CardDescription>
                </div>
                <Button 
                  onClick={handleEvaluateAll}
                  disabled={evaluatingStudents.length > 0 || testFiles.length === 0}
                >
                  <FileCheck className="mr-2 h-4 w-4" />
                  Evaluate All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {evaluatingStudents.length > 0 && (
                <div className="mb-6 space-y-2">
                  <div className="flex justify-between">
                    <span className="text-sm">Evaluating papers...</span>
                    <span className="text-sm font-medium">{evaluationProgress}%</span>
                  </div>
                  <Progress value={evaluationProgress} className="h-2" />
                </div>
              )}
              
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>GR Number</TableHead>
                    <TableHead>Answer Sheet</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((student) => {
                    const status = getStudentEvaluationStatus(student.id);
                    const isEvaluating = evaluatingStudents.includes(student.id);
                    const hasEvaluation = evaluations.some(e => e.student_id === student.id);
                    const evaluationData = evaluations.find(e => e.student_id === student.id)?.evaluation_data;
                    
                    return (
                      <TableRow key={student.id}>
                        <TableCell className="font-medium">{student.name}</TableCell>
                        <TableCell>{student.gr_number}</TableCell>
                        <TableCell>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="file"
                              id={`file-${student.id}`}
                              accept=".pdf"
                              onChange={(e) => handleFileChange(student.id, e)}
                              className="max-w-sm"
                              disabled={isEvaluating}
                            />
                          </div>
                        </TableCell>
                        <TableCell>
                          {status === 'completed' ? (
                            <div className="flex items-center text-green-600">
                              <CheckCircle className="h-4 w-4 mr-2" />
                              <span>
                                {evaluationData?.summary?.percentage}% (
                                {evaluationData?.summary?.totalScore?.[0]}/
                                {evaluationData?.summary?.totalScore?.[1]})
                              </span>
                            </div>
                          ) : status === 'in_progress' || isEvaluating ? (
                            <div className="flex items-center text-amber-600">
                              <div className="h-4 w-4 mr-2 animate-spin rounded-full border-2 border-current border-t-transparent" />
                              <span>Evaluating...</span>
                            </div>
                          ) : status === 'failed' ? (
                            <div className="flex items-center text-red-600">
                              <FileX className="h-4 w-4 mr-2" />
                              <span>Failed</span>
                            </div>
                          ) : (
                            <div className="flex items-center text-gray-500">
                              <AlertCircle className="h-4 w-4 mr-2" />
                              <span>Not evaluated</span>
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button 
                              size="sm" 
                              onClick={() => handleUploadSheet(student.id)}
                              disabled={!studentUploads[student.id] || uploadingFor === student.id || isEvaluating}
                            >
                              {uploadingFor === student.id ? (
                                "Uploading..."
                              ) : (
                                <>
                                  <FilePlus className="mr-2 h-4 w-4" />
                                  Upload
                                </>
                              )}
                            </Button>
                            
                            {(!hasEvaluation || status === 'failed') && (
                              <Button 
                                size="sm"
                                variant="outline"
                                onClick={() => handleEvaluateSingle(student.id)}
                                disabled={isEvaluating || testFiles.length === 0}
                              >
                                {isEvaluating && evaluatingStudents.includes(student.id) ? (
                                  "Evaluating..."
                                ) : (
                                  <>
                                    <FileCheck className="mr-2 h-4 w-4" />
                                    Evaluate
                                  </>
                                )}
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
        
        {showResults && evaluations.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>Evaluation Results</CardTitle>
              <CardDescription>
                View evaluation results for all students
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Score</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {evaluations
                    .filter(e => e.status === 'completed' && e.evaluation_data?.answers)
                    .map((evaluation) => {
                      const student = classStudents.find(s => s.id === evaluation.student_id);
                      const data = evaluation.evaluation_data;
                      return (
                        <TableRow key={evaluation.id}>
                          <TableCell className="font-medium">{student?.name || 'Unknown'}</TableCell>
                          <TableCell>
                            {data?.summary?.totalScore ? (
                              <div>
                                <span className="font-medium">{data.summary.percentage}%</span>
                                <span className="text-muted-foreground ml-2">
                                  ({data.summary.totalScore[0]}/{data.summary.totalScore[1]})
                                </span>
                              </div>
                            ) : (
                              'N/A'
                            )}
                          </TableCell>
                          <TableCell>
                            <Button 
                              size="sm" 
                              variant="outline"
                              asChild
                            >
                              <a href={`/dashboard/tests/detail/${selectedTest}?student=${evaluation.student_id}`}>
                                View Details
                              </a>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
