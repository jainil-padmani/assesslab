
import { useState } from "react";
import { useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student, Subject } from "@/types/dashboard";
import { toast } from "sonner";

export function useStudentDetail() {
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isLoginSettingsDialogOpen, setIsLoginSettingsDialogOpen] = useState(false);
  const [newPassword, setNewPassword] = useState("");
  const [loginIdType, setLoginIdType] = useState<"gr_number" | "roll_number" | "email">("gr_number");
  const [showPassword, setShowPassword] = useState(false);

  // Fetch student details
  const { data: student } = useQuery({
    queryKey: ["student", id],
    queryFn: async () => {
      // First, get the student record which has the hashed password
      const { data: studentData, error: studentError } = await supabase
        .from("students")
        .select("*, classes(name)")
        .eq("id", id)
        .single();
      
      if (studentError) throw studentError;
      
      const result = studentData as Student & { classes: { name: string } | null };
      
      // Initialize login ID type from database
      if (result.login_id_type) {
        setLoginIdType(result.login_id_type as "gr_number" | "roll_number" | "email");
      }
      
      // For password display, we need to get the original non-hashed password
      // If we don't have the actual password stored somewhere, we'll show a placeholder
      // or request the user to set a new password
      if (result.password) {
        // This is the hashed password, but for display purposes, we'll use what we have
        // In a real application, you would never be able to decrypt a properly hashed password
        // This assumes passwords were not securely hashed or there's a system to retrieve the original password
        result.password = result.password; // Keep as is, this would be the plain text in a real system
      }
      
      return result;
    },
  });

  // Fetch student subjects
  const { data: studentSubjects } = useQuery({
    queryKey: ["student-subjects", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("student_subjects")
        .select(`
          *,
          subjects (
            id,
            name,
            subject_code
          )
        `)
        .eq("student_id", id);
      if (error) throw error;
      return data;
    },
  });

  // Fetch enrolled subjects through subject_enrollments
  const { data: enrolledSubjects } = useQuery({
    queryKey: ["student-enrolled-subjects", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subject_enrollments")
        .select(`
          id,
          subject_id,
          subjects (
            id,
            name,
            subject_code
          )
        `)
        .eq("student_id", id);
      if (error) throw error;
      return data.map(item => ({
        ...item.subjects,
        enrollment_id: item.id
      }));
    },
  });

  // Fetch all subjects for selection
  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Subject[];
    },
  });

  // Toggle student login mutation
  const toggleLoginMutation = useMutation({
    mutationFn: async (loginEnabled: boolean) => {
      let updateData: any = { login_enabled: loginEnabled };
      
      if (loginEnabled && !student?.password && student?.roll_number) {
        updateData.password = student.roll_number;
      }
      
      const { error } = await supabase
        .from("students")
        .update(updateData)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_, loginEnabled) => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      toast.success(`Student login ${loginEnabled ? 'enabled' : 'disabled'} successfully`);
    },
    onError: (error) => {
      toast.error("Failed to update login status: " + error.message);
    },
  });

  // Update student login settings mutation
  const updateLoginSettingsMutation = useMutation({
    mutationFn: async (data: { login_id_type: 'gr_number' | 'roll_number' | 'email' }) => {
      const { error } = await supabase
        .from("students")
        .update(data)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      setIsLoginSettingsDialogOpen(false);
      toast.success("Login settings updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update login settings: " + error.message);
    },
  });

  // Update student password mutation
  const updatePasswordMutation = useMutation({
    mutationFn: async (password: string) => {
      const { error } = await supabase
        .from("students")
        .update({ password })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student", id] });
      setIsPasswordDialogOpen(false);
      setNewPassword("");
      toast.success("Password updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update password: " + error.message);
    },
  });

  // Add student subject mutation
  const addSubjectMutation = useMutation({
    mutationFn: async (data: { student_id: string; subject_id: string; grade: string }) => {
      const { error } = await supabase.from("student_subjects").insert([data]);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-subjects", id] });
      toast.success("Subject added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add subject: " + error.message);
    },
  });

  // Update grade mutation
  const updateGradeMutation = useMutation({
    mutationFn: async ({ subjectId, grade }: { subjectId: string; grade: string }) => {
      const { error } = await supabase
        .from("student_subjects")
        .update({ grade })
        .eq("student_id", id)
        .eq("subject_id", subjectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-subjects", id] });
      toast.success("Grade updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update grade: " + error.message);
    },
  });

  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (subjectId: string) => {
      const { error } = await supabase
        .from("student_subjects")
        .delete()
        .eq("id", subjectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-subjects", id] });
      toast.success("Subject removed successfully");
    },
    onError: (error) => {
      toast.error("Failed to remove subject: " + error.message);
    },
  });

  // Unenroll subject mutation
  const unenrollSubjectMutation = useMutation({
    mutationFn: async (enrollmentId: string) => {
      const { error } = await supabase
        .from("subject_enrollments")
        .delete()
        .eq("id", enrollmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["student-enrolled-subjects", id] });
      toast.success("Student unenrolled successfully");
    },
    onError: (error) => {
      toast.error("Failed to unenroll student: " + error.message);
    },
  });

  const getLoginIdValue = () => {
    if (!student) return "";
    const idType = student.login_id_type || 'email';
    if (idType === 'email') return student.email;
    if (idType === 'roll_number') return student.roll_number;
    return student.gr_number;
  };

  const copyToClipboard = (text: string, message: string) => {
    navigator.clipboard.writeText(text)
      .then(() => toast.success(message))
      .catch(err => toast.error("Failed to copy: " + err));
  };

  return {
    id,
    student,
    studentSubjects,
    enrolledSubjects,
    subjects,
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    isLoginSettingsDialogOpen,
    setIsLoginSettingsDialogOpen,
    newPassword,
    setNewPassword,
    loginIdType,
    setLoginIdType,
    showPassword,
    setShowPassword,
    toggleLoginMutation,
    updateLoginSettingsMutation,
    updatePasswordMutation,
    addSubjectMutation,
    updateGradeMutation,
    deleteSubjectMutation,
    unenrollSubjectMutation,
    getLoginIdValue,
    copyToClipboard
  };
}
