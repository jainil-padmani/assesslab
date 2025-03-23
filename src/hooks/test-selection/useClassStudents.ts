
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Student } from "@/types/dashboard";

export function useClassStudents(selectedClass: string) {
  const [classStudents, setClassStudents] = useState<Student[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedStudents, setSelectedStudents] = useState<string[]>([]);

  useEffect(() => {
    if (selectedClass) {
      fetchClassStudents();
    } else {
      setClassStudents([]);
      setSelectedStudents([]);
    }
  }, [selectedClass]);

  const fetchClassStudents = async () => {
    setIsLoading(true);
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
    } finally {
      setIsLoading(false);
    }
  };

  // Function to toggle student selection
  const toggleStudentSelection = (studentId: string) => {
    setSelectedStudents(prev => 
      prev.includes(studentId)
        ? prev.filter(id => id !== studentId)
        : [...prev, studentId]
    );
  };

  // Function to select all students
  const selectAllStudents = () => {
    setSelectedStudents(classStudents.map(student => student.id));
  };

  // Function to clear all selections
  const clearStudentSelection = () => {
    setSelectedStudents([]);
  };

  // Function to notify students about test changes
  const notifyStudents = async (testId: string, message: string, studentIds?: string[]) => {
    try {
      // If studentIds is provided, only notify those students
      // Otherwise notify all students in the class
      const studentsToNotify = studentIds || classStudents.map(student => student.id);
      
      if (studentsToNotify.length === 0) {
        toast.info('No students to notify');
        return;
      }

      // Create notifications for each student
      const notifications = studentsToNotify.map(studentId => ({
        student_id: studentId,
        test_id: testId,
        message,
        read: false,
        created_at: new Date().toISOString()
      }));

      const { error } = await supabase
        .from('student_notifications')
        .insert(notifications);
      
      if (error) throw error;
      
      toast.success(`${studentsToNotify.length} students have been notified`);
      return true;
    } catch (error: any) {
      toast.error('Failed to notify students');
      console.error('Error notifying students:', error);
      return false;
    }
  };

  return { 
    classStudents,
    isLoading,
    notifyStudents,
    selectedStudents,
    toggleStudentSelection,
    selectAllStudents,
    clearStudentSelection
  };
}
