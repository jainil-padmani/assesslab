import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
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
import { toast } from "sonner";

interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
  created_at: string;
  user_id?: string | null;
}

export default function Classes() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [editingClass, setEditingClass] = useState<Class | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Get current user session
  const { data: session, isLoading: isSessionLoading } = useQuery({
    queryKey: ["user-session"],
    queryFn: async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) throw error;
      return data.session;
    },
  });

  // Fetch classes - simple filtering by user_id
  const { data: classes, isLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      if (!session?.user.id) {
        return [];
      }
      
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("user_id", session.user.id)
        .order("name");
        
      if (error) {
        console.error("Error fetching classes:", error);
        throw error;
      }
      return data as Class[];
    },
    enabled: !!session, // Only fetch if user is logged in
  });

  // Add class mutation
  const addClassMutation = useMutation({
    mutationFn: async (newClass: Omit<Class, "id" | "created_at">) => {
      if (!session?.user.id) {
        throw new Error("You must be logged in to add a class");
      }
      
      const classWithUserId = {
        ...newClass,
        user_id: session.user.id
      };
      
      const { data, error } = await supabase
        .from("classes")
        .insert([classWithUserId])
        .select();
        
      if (error) throw error;
      return data[0] as Class;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setIsAddDialogOpen(false);
      setIsSubmitting(false);
      toast.success("Class added successfully");
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast.error("Failed to add class: " + error.message);
    },
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: async (classData: Partial<Class> & { id: string }) => {
      if (!session?.user.id) {
        throw new Error("You must be logged in to update a class");
      }
      
      const { data, error } = await supabase
        .from("classes")
        .update({
          ...classData,
          user_id: session.user.id
        })
        .eq("id", classData.id)
        .select();
        
      if (error) throw error;
      return data[0] as Class;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      setEditingClass(null);
      setIsAddDialogOpen(false);
      setIsSubmitting(false);
      toast.success("Class updated successfully");
    },
    onError: (error: Error) => {
      setIsSubmitting(false);
      toast.error("Failed to update class: " + error.message);
    },
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: async (id: string) => {
      if (!session?.user.id) {
        throw new Error("You must be logged in to delete a class");
      }
      
      const { error } = await supabase
        .from("classes")
        .delete()
        .eq("id", id);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["classes"] });
      toast.success("Class deleted successfully");
    },
    onError: (error: Error) => {
      toast.error("Failed to delete class: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const yearValue = formData.get("year") as string;
    const classData = {
      name: formData.get("name") as string,
      department: formData.get("department") as string,
      year: yearValue ? parseInt(yearValue) : null,
    };

    if (editingClass) {
      updateClassMutation.mutate({ id: editingClass.id, ...classData });
    } else {
      addClassMutation.mutate(classData as any);
    }
  };

  // Show loading state
  if (isSessionLoading || (isLoading && session)) {
    return (
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold mb-4">Classes</h1>
        <div className="flex justify-center">
          <div className="animate-pulse p-4">Loading classes...</div>
        </div>
      </div>
    );
  }

  // Show login message if not logged in
  if (!session) {
    return (
      <div className="container mx-auto px-4 py-8 text-center">
        <h1 className="text-2xl font-bold mb-4">Classes</h1>
        <p className="mb-4">Please log in to view and manage classes.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Classes</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Class
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>
                {editingClass ? "Edit Class" : "Add New Class"}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name</Label>
                  <Input
                    id="name"
                    name="name"
                    required
                    defaultValue={editingClass?.name}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="department">Department</Label>
                  <Input
                    id="department"
                    name="department"
                    defaultValue={editingClass?.department || ""}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="year">Year</Label>
                  <Input
                    id="year"
                    name="year"
                    type="number"
                    defaultValue={editingClass?.year || ""}
                  />
                </div>
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => {
                    setIsAddDialogOpen(false);
                    setEditingClass(null);
                  }}
                  disabled={isSubmitting}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? "Saving..." : editingClass ? "Update" : "Add"} Class
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
              <TableHead>Department</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {!classes?.length ? (
              <TableRow>
                <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                  No classes found. Create a class to get started!
                </TableCell>
              </TableRow>
            ) : (
              classes.map((cls) => (
                <TableRow key={cls.id}>
                  <TableCell
                    className="font-medium cursor-pointer hover:text-primary"
                    onClick={() => navigate(`/dashboard/classes/${cls.id}`)}
                  >
                    {cls.name}
                  </TableCell>
                  <TableCell>{cls.department || "-"}</TableCell>
                  <TableCell>{cls.year || "-"}</TableCell>
                  <TableCell>
                    <div className="flex space-x-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          setEditingClass(cls);
                          setIsAddDialogOpen(true);
                        }}
                      >
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => {
                          if (confirm("Are you sure you want to delete this class? Students in this class will not be deleted but will no longer be associated with this class.")) {
                            deleteClassMutation.mutate(cls.id);
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
