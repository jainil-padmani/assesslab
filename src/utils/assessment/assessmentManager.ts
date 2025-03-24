
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Json } from '@/integrations/supabase/types';

// Function to fetch subjects for assessment creation
export async function fetchSubjects() {
  try {
    const { data, error } = await supabase
      .from('subjects')
      .select('*')
      .order('name', { ascending: true });
      
    if (error) {
      console.error("Error fetching subjects:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Failed to fetch subjects:", error);
    throw error;
  }
}

// Function to fetch existing assessments for a student and subject
export async function fetchExistingAssessments(studentId: string, subjectId: string, testId?: string) {
  try {
    console.log(`Fetching existing assessments for student: ${studentId}, subject: ${subjectId}, test: ${testId || 'none'}`);
    
    let query = supabase
      .from('assessments_master')
      .select('*')
      .eq('student_id', studentId)
      .eq('subject_id', subjectId);
      
    if (testId) {
      query = query.eq('test_id', testId);
    }
    
    const { data, error } = await query;
    
    if (error) {
      console.error("Error fetching existing assessments:", error);
      throw error;
    }
    
    return data || [];
  } catch (error) {
    console.error("Error in fetchExistingAssessments:", error);
    throw error;
  }
}

// Function to update an assessment
export async function updateAssessment(assessmentId: string, assessmentData: any) {
  try {
    console.log(`Updating assessment: ${assessmentId}`, assessmentData);
    
    const { error } = await supabase
      .from('assessments_master')
      .update(assessmentData)
      .eq('id', assessmentId);
      
    if (error) {
      console.error("Error updating assessment:", error);
      throw error;
    }
    
    console.log(`Assessment updated successfully: ${assessmentId}`);
    return true;
  } catch (error) {
    console.error("Error in updateAssessment:", error);
    toast.error("Failed to update assessment");
    throw error;
  }
}

// Function to create a new assessment
export async function createAssessment(assessmentData: any) {
  try {
    console.log("Creating new assessment", assessmentData);
    
    const { data, error } = await supabase
      .from('assessments_master')
      .insert(assessmentData)
      .select('id')
      .single();
      
    if (error) {
      console.error("Error creating assessment:", error);
      throw error;
    }
    
    console.log(`New assessment created with ID: ${data.id}`);
    return data.id;
  } catch (error) {
    console.error("Error in createAssessment:", error);
    toast.error("Failed to create assessment");
    throw error;
  }
}

// Function to remove duplicate assessments
export async function removeDuplicateAssessments(primaryId: string, duplicateIds: string[]) {
  if (!duplicateIds.length) return;
  
  try {
    console.log(`Removing ${duplicateIds.length} duplicate assessments, keeping primary ID: ${primaryId}`);
    
    const { error } = await supabase
      .from('assessments_master')
      .delete()
      .in('id', duplicateIds);
      
    if (error) {
      console.error("Error removing duplicate assessments:", error);
      toast.error("Failed to remove duplicate assessments");
      // Continue despite errors
    } else {
      console.log("Duplicate assessments removed successfully");
    }
    
    return true;
  } catch (error) {
    console.error("Error in removeDuplicateAssessments:", error);
    toast.error("Failed to remove duplicate assessments");
    // We'll continue despite errors
    return false;
  }
}

// Function to clear all assessments for a student
export async function clearAllAssessments(studentId: string) {
  try {
    console.log(`Clearing all assessments for student: ${studentId}`);
    
    const { error } = await supabase
      .from('assessments_master')
      .delete()
      .eq('student_id', studentId);
      
    if (error) {
      console.error("Error clearing assessments:", error);
      throw error;
    }
    
    console.log("All assessments cleared successfully");
    toast.success("All assessments cleared");
    return true;
  } catch (error) {
    console.error("Error in clearAllAssessments:", error);
    toast.error("Failed to clear assessments");
    throw error;
  }
}

// Function to fetch assessments for a specific test
export async function fetchTestAssessments(testId: string) {
  try {
    console.log(`Fetching assessments for test: ${testId}`);
    
    const { data, error } = await supabase
      .from('assessments_master')
      .select(`
        *,
        student:student_id(
          id, 
          name, 
          gr_number, 
          roll_number
        )
      `)
      .eq('test_id', testId);
      
    if (error) {
      console.error("Error fetching test assessments:", error);
      throw error;
    }
    
    console.log(`Retrieved ${data?.length || 0} assessments for test`);
    return data || [];
  } catch (error) {
    console.error("Error in fetchTestAssessments:", error);
    toast.error("Failed to fetch test assessments");
    throw error;
  }
}

// Function to archive old assessments
export async function archiveOldAssessments(olderThanDays = 90) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - olderThanDays);
    
    console.log(`Archiving assessments older than ${olderThanDays} days (${cutoffDate.toISOString()})`);
    
    const { data, error } = await supabase
      .from('assessments_master')
      .update({ status: 'archived' })
      .lt('created_at', cutoffDate.toISOString())
      .select('id');
      
    if (error) {
      console.error("Error archiving old assessments:", error);
      throw error;
    }
    
    console.log(`Archived ${data?.length || 0} old assessments`);
    return data?.length || 0;
  } catch (error) {
    console.error("Error in archiveOldAssessments:", error);
    toast.error("Failed to archive old assessments");
    throw error;
  }
}
