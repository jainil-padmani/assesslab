
import React, { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
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
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface AddTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultSubjectId?: string;
}

type Profile = {
  team_id: string | null;
};

type Subject = {
  id: string;
  name: string;
};

type Class = {
  id: string;
  name: string;
};

export function AddTestDialog({ open, onOpenChange, defaultSubjectId }: AddTestDialogProps) {
  const [name, setName] = useState("");
  const [subjectId, setSubjectId] = useState(defaultSubjectId || "");
  const [classId, setClassId] = useState("");
  const [maxMarks, setMaxMarks] = useState(100);
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const queryClient = useQueryClient();

  // Fetch user profile
  const { data: profile } = useQuery<Profile | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data;
    }
  });

  // Fetch subjects
  const { data: subjects } = useQuery<Subject[]>({
    queryKey: ["subjects", profile?.team_id],
    queryFn: async () => {
      let query = supabase.from("subjects").select("id, name");
      
      if (profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      }
      
      const { data, error } = await query.order("name");
        
      if (error) {
        console.error("Error fetching subjects:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: profile !== undefined,
  });

  // Fetch classes
  const { data: classes } = useQuery<Class[]>({
    queryKey: ["classes", profile?.team_id],
    queryFn: async () => {
      let query = supabase.from("classes").select("id, name");
      
      if (profile?.team_id) {
        query = query.eq("team_id", profile.team_id);
      }
      
      const { data, error } = await query.order("name");
        
      if (error) {
        console.error("Error fetching classes:", error);
        throw error;
      }
      
      return data || [];
    },
    enabled: profile !== undefined,
  });

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
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">
                Test Name
              </Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="subject" className="text-right">
                Subject
              </Label>
              <Select value={subjectId} onValueChange={setSubjectId} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="class" className="text-right">
                Class
              </Label>
              <Select value={classId} onValueChange={setClassId} required>
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="maxMarks" className="text-right">
                Max Marks
              </Label>
              <Input
                id="maxMarks"
                type="number"
                value={maxMarks}
                onChange={(e) => setMaxMarks(Number(e.target.value))}
                className="col-span-3"
                required
              />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="date" className="text-right">
                Test Date
              </Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant={"outline"}
                    className={cn(
                      "col-span-3 justify-start text-left font-normal",
                      !date && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {date ? format(date, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={date}
                    onSelect={setDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
          </div>
          <DialogFooter>
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Adding..." : "Add Test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
