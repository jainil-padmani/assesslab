
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { toast } from "sonner";

// Define a simplified type for student updates to avoid infinite type recursion
type StudentUpdateData = {
  id: string;
  name?: string;
  gr_number?: string;
  roll_number?: string | null;
  year?: number | null;
  department?: string;
  class_id?: string | null;
  overall_percentage?: number | null;
  user_id?: string;
  team_id?: string | null;
};

export function useStudentMutations(onClose: () => void) {
  const queryClient = useQueryClient();

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: Omit<Student, "id" | "created_at" | "email" | "parent_name" | "parent_contact" | "class"> & { class_id?: string | null }) => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to add a student");
      }

      // Get the user's profile to check for team membership
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        // Continue without team filtering if there's an error
      }

      // If the team_id is null, it will be undefined - this is ok
      const teamId = userProfile?.team_id || null;

      // Check if the GR number already exists for this user or team
      let query = supabase
        .from("students")
        .select("gr_number")
        .eq("gr_number", newStudent.gr_number);

      // If user is part of a team, check across the team
      if (teamId) {
        query = query.eq("team_id", teamId);
      } else {
        query = query.eq("user_id", user.id);
      }

      const { data: existingStudent, error: checkError } = await query.maybeSingle();

      if (checkError) {
        console.error("Error checking for existing student:", checkError);
      }

      if (existingStudent) {
        throw new Error(`A student with GR number ${newStudent.gr_number} already exists`);
      }

      const studentWithUserData = {
        ...newStudent,
        user_id: user.id,
        team_id: teamId
      };

      const { data, error } = await supabase
        .from("students")
        .insert([studentWithUserData])
        .select()
        .single();
      if (error) {
        // Check for duplicate key error
        if (error.code === "23505" && error.message.includes("students_gr_number_key")) {
          throw new Error(`A student with GR number ${newStudent.gr_number} already exists`);
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onClose();
      toast.success("Student added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add student: " + error.message);
    },
  });

  // Update student mutation - using the simplified type
  const updateStudentMutation = useMutation({
    mutationFn: async (studentData: StudentUpdateData) => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to update a student");
      }

      // Get the user's profile to check for team membership
      const { data: userProfile, error: profileError } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", user.id)
        .single();

      if (profileError) {
        console.error("Error fetching user profile:", profileError);
        // Continue without team filtering if there's an error
      }
      
      // If the team_id is null, it will be undefined - this is ok
      const teamId = userProfile?.team_id || null;
      
      // Check if updating to a GR number that already exists (but is not the current student's)
      if (studentData.gr_number) {
        let query = supabase
          .from("students")
          .select("id, gr_number")
          .eq("gr_number", studentData.gr_number)
          .neq("id", studentData.id);
          
        // Filter by team or user based on team membership
        if (teamId) {
          query = query.eq("team_id", teamId);
        } else {
          query = query.eq("user_id", user.id);
        }

        const { data: existingStudent, error: checkError } = await query.maybeSingle();

        if (checkError) {
          console.error("Error checking for existing student:", checkError);
        }

        if (existingStudent) {
          throw new Error(`Another student with GR number ${studentData.gr_number} already exists`);
        }
      }

      let updateQuery = supabase
        .from("students")
        .update(studentData)
        .eq("id", studentData.id);
        
      // Add the appropriate filter based on team membership
      if (teamId) {
        updateQuery = updateQuery.eq("team_id", teamId);
      } else {
        updateQuery = updateQuery.eq("user_id", user.id);
      }

      const { data, error } = await updateQuery.select().single();
      
      if (error) {
        // Check for duplicate key error
        if (error.code === "23505" && error.message.includes("students_gr_number_key")) {
          throw new Error(`Another student with GR number ${studentData.gr_number} already exists`);
        }
        throw error;
      }
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onClose();
      toast.success("Student updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update student: " + error.message);
    },
  });

  return { addStudentMutation, updateStudentMutation };
}
