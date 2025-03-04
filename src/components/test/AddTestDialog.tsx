
import React, { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { TestFormFields } from "./TestFormFields";
import { TestFormActions } from "./TestFormActions";
import { useTestFormData, useUserProfile } from "./useTestFormData";

interface AddTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubjectId?: string;
}

export function AddTestDialog({ open, onOpenChange, defaultSubjectId }: AddTestDialogProps) {
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState(defaultSubjectId || "");
  const [classId, setClassId] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile } = useUserProfile();

  // Fetch subjects and classes
  const { subjects, classes } = useTestFormData(profile);

  // Add test mutation
  const addTestMutation = useMutation({
    mutationFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) throw new Error("You must be logged in to add a test");
      
      const { data, error } = await supabase
        .from("tests")
        .insert({
          name,
          subject_id: subjectId,
          class_id: classId,
          max_marks: maxMarks,
          test_date: date ? date.toISOString().split('T')[0] : new Date().toISOString().split('T')[0],
          user_id: user.id,
          team_id: profile?.team_id
        })
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      toast.success("Test added successfully");
      resetForm();
      onOpenChange(false);
    },
    onError: (error: any) => {
      console.error("Error adding test:", error);
      toast.error(`Failed to add test: ${error.message}`);
      setIsSubmitting(false);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    addTestMutation.mutate();
  };

  const resetForm = () => {
    setName("");
    setSubjectId(defaultSubjectId || "");
    setClassId("");
    setMaxMarks(100);
    setDate(new Date());
    setIsSubmitting(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Add New Test</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <TestFormFields
            name={name}
            setName={setName}
            subjectId={subjectId}
            setSubjectId={setSubjectId}
            classId={classId}
            setClassId={setClassId}
            maxMarks={maxMarks}
            setMaxMarks={setMaxMarks}
            date={date}
            setDate={setDate}
            subjects={subjects}
            classes={classes}
          />
          <TestFormActions isSubmitting={isSubmitting} />
        </form>
      </DialogContent>
    </Dialog>
  );
}
