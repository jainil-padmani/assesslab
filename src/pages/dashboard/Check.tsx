
import { useState, useEffect } from "react";
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
import { Upload, CheckCircle, FileCheck, FilePlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Student, Subject, AnswerKey } from "@/types/dashboard";
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
    } else {
      setTestFiles([]);
    }
  }, [selectedTest]);

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
          answer_key_id: null, // We don't have a direct answer key ID reference yet
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

  const handleEvaluateAll = () => {
    // Function to initiate the evaluation process for all uploaded sheets
    toast.info('Evaluation process would start here');
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
                <Button onClick={handleEvaluateAll}>
                  <FileCheck className="mr-2 h-4 w-4" />
                  Evaluate All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student Name</TableHead>
                    <TableHead>GR Number</TableHead>
                    <TableHead>Answer Sheet</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {classStudents.map((student) => (
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
                          />
                        </div>
                      </TableCell>
                      <TableCell>
                        <Button 
                          size="sm" 
                          onClick={() => handleUploadSheet(student.id)}
                          disabled={!studentUploads[student.id] || uploadingFor === student.id}
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
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
