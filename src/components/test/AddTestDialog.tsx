
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { 
  Dialog, DialogContent, DialogHeader, 
  DialogTitle, DialogDescription, DialogFooter 
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  Select, SelectContent, SelectItem, 
  SelectTrigger, SelectValue 
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";
import { TestFormData } from "@/types/tests";

interface AddTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function AddTestDialog({ open, onOpenChange }: AddTestDialogProps) {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  
  const [formData, setFormData] = useState<TestFormData>({
    name: "",
    subject_id: "",
    class_id: "",
    test_date: new Date().toISOString().slice(0, 10),
    max_marks: 100
  });

  // Location state might contain default subject ID
  const { state } = location;
  
  useEffect(() => {
    if (state?.defaultSubjectId) {
      setFormData(prev => ({ ...prev, subject_id: state.defaultSubjectId }));
    }
  }, [state]);

  const { data: subjects } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as Subject[];
    }
  });

  const { data: classes } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .order("name");
      
      if (error) throw error;
      return data as { id: string; name: string; department: string | null; year: number | null }[];
    }
  });

  const createTestMutation = useMutation({
    mutationFn: async (data: TestFormData) => {
      const { error, data: result } = await supabase
        .from("tests")
        .insert(data)
        .select();
      
      if (error) throw error;
      return result[0];
    },
    onSuccess: (data) => {
      toast.success("Test created successfully");
      queryClient.invalidateQueries({ queryKey: ["tests"] });
      onOpenChange(false);
      navigate(`/dashboard/tests/detail/${data.id}`);
    },
    onError: (error: any) => {
      toast.error(`Failed to create test: ${error.message}`);
    }
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name.trim()) {
      toast.error("Test name is required");
      return;
    }
    
    if (!formData.subject_id) {
      toast.error("Please select a subject");
      return;
    }
    
    if (!formData.class_id) {
      toast.error("Please select a class");
      return;
    }
    
    createTestMutation.mutate(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Add New Test</DialogTitle>
            <DialogDescription>
              Create a new test for a specific subject and class.
            </DialogDescription>
          </DialogHeader>
          
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Test Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Midterm Examination"
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="subject">Subject *</Label>
              <Select
                value={formData.subject_id}
                onValueChange={(value) => setFormData({ ...formData, subject_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects?.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name} ({subject.subject_code})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="class">Class *</Label>
              <Select
                value={formData.class_id}
                onValueChange={(value) => setFormData({ ...formData, class_id: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a class" />
                </SelectTrigger>
                <SelectContent>
                  {classes?.map((cls) => (
                    <SelectItem key={cls.id} value={cls.id}>
                      {cls.name} {cls.year ? `(${cls.year})` : ""}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="test_date">Test Date *</Label>
              <Input
                id="test_date"
                type="date"
                value={formData.test_date}
                onChange={(e) => setFormData({ ...formData, test_date: e.target.value })}
                required
              />
            </div>
            
            <div className="grid gap-2">
              <Label htmlFor="max_marks">Maximum Marks *</Label>
              <Input
                id="max_marks"
                type="number"
                min={1}
                value={formData.max_marks}
                onChange={(e) => setFormData({ ...formData, max_marks: Number(e.target.value) })}
                required
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              type="button" 
              variant="outline" 
              onClick={() => onOpenChange(false)}
            >
              Cancel
            </Button>
            <Button 
              type="submit" 
              disabled={createTestMutation.isPending}
            >
              {createTestMutation.isPending ? "Creating..." : "Create Test"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
