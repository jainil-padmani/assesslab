
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Subject } from "@/types/dashboard";

export function useSubjects(selectedClass: string) {
  const [subjects, setSubjects] = useState<Subject[]>([]);

  useEffect(() => {
    if (selectedClass) {
      fetchSubjects();
    } else {
      setSubjects([]);
    }
  }, [selectedClass]);

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

  return { subjects };
}
