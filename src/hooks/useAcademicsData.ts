
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import type { Student, Subject } from '@/types/dashboard';

// Define Class type here since it's not exported from dashboard types
interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
  user_id: string;
  created_at: string;
}

/**
 * Custom hook to load and manage all academics-related data in one place
 */
export function useAcademicsData() {
  // Get current user session
  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  // Fetch classes
  const { 
    data: classes = [], 
    isLoading: isClassesLoading,
    refetch: refetchClasses,
  } = useQuery({
    queryKey: ['classes'],
    queryFn: async () => {
      if (!session?.user.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('classes')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name');
        
        if (error) throw error;
        return data as unknown as Class[];
      } catch (error: any) {
        console.error('Error fetching classes:', error);
        toast.error(`Failed to load classes: ${error.message}`);
        return [];
      }
    },
    enabled: !!session
  });

  // Fetch students 
  const { 
    data: students = [], 
    isLoading: isStudentsLoading,
    refetch: refetchStudents,
  } = useQuery({
    queryKey: ['students'],
    queryFn: async () => {
      if (!session?.user.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('students')
          .select(`
            *,
            classes(name, department)
          `)
          .eq('user_id', session.user.id)
          .order('name');
        
        if (error) throw error;
        return data as (Student & { classes: { name: string, department: string | null } | null })[];
      } catch (error: any) {
        console.error('Error fetching students:', error);
        toast.error(`Failed to load students: ${error.message}`);
        return [];
      }
    },
    enabled: !!session
  });

  // Fetch subjects
  const { 
    data: subjects = [], 
    isLoading: isSubjectsLoading,
    refetch: refetchSubjects,
  } = useQuery({
    queryKey: ['subjects'],
    queryFn: async () => {
      if (!session?.user.id) return [];
      
      try {
        const { data, error } = await supabase
          .from('subjects')
          .select('*')
          .eq('user_id', session.user.id)
          .order('name');
        
        if (error) throw error;
        return data as Subject[];
      } catch (error: any) {
        console.error('Error fetching subjects:', error);
        toast.error(`Failed to load subjects: ${error.message}`);
        return [];
      }
    },
    enabled: !!session
  });

  // Function to refetch all academic data
  const refetchAll = () => {
    refetchStudents();
    refetchClasses();
    refetchSubjects();
  };

  // Get students by class
  const getStudentsByClass = (classId: string) => {
    return students.filter(student => student.class_id === classId);
  };

  // Get subjects by class
  const getSubjectsByClass = async (classId: string) => {
    try {
      // This requires joining through subject_enrollments
      // For now, return all subjects as the data model might not yet support this
      return subjects;
    } catch (error) {
      console.error("Error getting subjects by class:", error);
      return [];
    }
  };

  return {
    students,
    classes,
    subjects,
    isStudentsLoading,
    isClassesLoading,
    isSubjectsLoading,
    isLoading: isStudentsLoading || isClassesLoading || isSubjectsLoading,
    refetchStudents,
    refetchClasses,
    refetchSubjects,
    refetchAll,
    getStudentsByClass,
    getSubjectsByClass
  };
}
