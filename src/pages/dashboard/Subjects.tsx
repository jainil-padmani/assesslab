
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Plus, FileDown, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export default function Subjects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingSubject, setEditingSubject] = useState<Subject | null>(null);

  // Fetch subjects
  const { data: subjects, isLoading } = useQuery({
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

  // Add subject mutation
  const addSubjectMutation = useMutation({
    mutationFn: async (newSubject: Omit<Subject, "id" | "created_at">) => {
      const { data, error } = await supabase
        .from("subjects")
        .insert([newSubject])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setIsAddDialogOpen(false);
      toast.success("Subject added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add subject: " + error.message);
    },
  });

  // Update subject mutation
  const updateSubjectMutation = useMutation({
    mutationFn: async (subject: Partial<Subject> & { id: string }) => {
      const { data, error } = await supabase
        .from("subjects")
        .update(subject)
        .eq("id", subject.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setEditingSubject(null);
      toast.success("Subject updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update subject: " + error.message);
    },
  });

  // Delete subject mutation
  const deleteSubjectMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("subjects").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      toast.success("Subject deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete subject: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const subjectData = {
      name: formData.get("name") as string,
      subject_code: formData.get("subject_code") as string,
      semester: parseInt(formData.get("semester") as string),
    };

    if (editingSubject) {
      updateSubjectMutation.mutate({ id: editingSubject.id, ...subjectData });
    } else {
      addSubjectMutation.mutate(subjectData as any);
    }
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Subjects</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingSubject ? "Edit Subject" : "Add New Subject"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Subject Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={editingSubject?.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="subject_code">Subject Code</Label>
                  <Input
                    id="subject_code"
                    name="subject_code"
                    required
                    defaultValue={editingSubject?.subject_code}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="semester">Semester</Label>
                  <Input
                    id="semester"
                    name="semester"
                    type="number"
                    required
                    min="1"
                    defaultValue={editingSubject?.semester}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingSubject(null);
                  }}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  {editingSubject ? "Update" : "Add"} Subject
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Subject Code</TableHead>
              <TableHead>Semester</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {subjects?.map((subject) => (
              <TableRow key={subject.id}>
                <TableCell
                  className="font-medium cursor-pointer hover:text-primary"
                  onClick={() => navigate(`/dashboard/subjects/${subject.id}`)}
                >
                  {subject.name}
                </TableCell>
                <TableCell>{subject.subject_code}</TableCell>
                <TableCell>{subject.semester}</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        setEditingSubject(subject);
                        setIsAddDialogOpen(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this subject?")) {
                          deleteSubjectMutation.mutate(subject.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
