
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user session
  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  // Get user's team_id
  const { data: userProfile } = useQuery({
    queryKey: ["user-profile"],
    queryFn: async () => {
      if (!session?.user) return null;
      
      const { data, error } = await supabase
        .from("profiles")
        .select("team_id")
        .eq("id", session.user.id)
        .single();
        
      if (error && error.code !== 'PGRST116') {
        console.error("Error fetching profile:", error);
      }
      
      return data;
    },
    enabled: !!session,
  });

  // Fetch subjects
  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      // Fetch subjects - no need to filter as RLS will handle it based on team_id
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
        
      if (error) throw error;
      return data as Subject[];
    },
    enabled: !!session, // Only fetch if user is logged in
  });

  // Add subject mutation
  const addSubjectMutation = useMutation({
    mutationFn: async (newSubject: Omit<Subject, "id" | "created_at">) => {
      // Include team_id if user has one
      const team_id = userProfile?.team_id || null;
      
      const { data, error } = await supabase
        .from("subjects")
        .insert([{ ...newSubject, user_id: session?.user.id, team_id }])
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["subjects"] });
      setIsAddDialogOpen(false);
      setIsSubmitting(false);
      toast.success("Subject added successfully");
    },
    onError: (error) => {
      setIsSubmitting(false);
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
      setIsAddDialogOpen(false);
      setIsSubmitting(false);
      toast.success("Subject updated successfully");
    },
    onError: (error) => {
      setIsSubmitting(false);
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
    setIsSubmitting(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const subjectData = {
      name: formData.get("name") as string,
      subject_code: formData.get("subject_code") as string,
      semester: parseInt(formData.get("semester") as string),
      user_id: session?.user.id, // Add user_id from the current session
    };

    if (editingSubject) {
      updateSubjectMutation.mutate({ id: editingSubject.id, ...subjectData });
    } else {
      addSubjectMutation.mutate(subjectData as any);
    }
  };

  // Show login message if not logged in
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Subjects</h1>
        <p className="mb-4">Please log in to view and manage subjects.</p>
      </div>
    );
  }

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
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingSubject ? "Update" : "Add"} Subject
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
            {!subjects?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No subjects found. Create a subject to get started!
                </TableCell>
              </TableRow>
            ) : (
              subjects?.map((subject) => (
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
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
