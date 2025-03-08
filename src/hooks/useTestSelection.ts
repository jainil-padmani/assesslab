
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { fetchTestFiles } from "@/utils/subjectFilesUtils";
import type { Test } from "@/types/tests";
import type { Class, Student, Subject } from "@/types/dashboard";

export interface TestFile {
  id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
}

export function useTestSelection() {
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

  // UI state
  const [isLoading, setIsLoading] = useState(false);

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

  return { 
    selectedClass, setSelectedClass,
    selectedSubject, setSelectedSubject,
    selectedTest, setSelectedTest,
    classes, subjects, tests, testFiles, classStudents,
    isLoading, setIsLoading
  };
}
