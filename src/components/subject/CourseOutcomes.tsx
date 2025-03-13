
import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Subject, CourseOutcome } from "@/types/dashboard";
import { Plus, Edit, Trash } from "lucide-react";

interface CourseOutcomesProps {
  subject: Subject;
  fetchSubjectData: () => Promise<void>;
}

export function CourseOutcomes({ subject, fetchSubjectData }: CourseOutcomesProps) {
  const [courseOutcomes, setCourseOutcomes] = useState<CourseOutcome[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [selectedOutcome, setSelectedOutcome] = useState<CourseOutcome | null>(null);
  const [coNumber, setCoNumber] = useState<string>("1");
  const [description, setDescription] = useState<string>("");

  useEffect(() => {
    fetchCourseOutcomes();
  }, [subject.id]);

  const fetchCourseOutcomes = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('course_outcomes')
        .select('*')
        .eq('subject_id', subject.id)
        .order('co_number', { ascending: true });

      if (error) throw error;
      
      setCourseOutcomes(data as CourseOutcome[] || []);
    } catch (error: any) {
      console.error("Error fetching course outcomes:", error);
      toast.error("Failed to load course outcomes");
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddOutcome = async () => {
    try {
      const { data, error } = await supabase
        .from('course_outcomes')
        .insert({
          subject_id: subject.id,
          co_number: parseInt(coNumber),
          description: description.trim()
        })
        .select()
        .single();

      if (error) throw error;
      
      toast.success("Course outcome added successfully");
      setIsAddDialogOpen(false);
      resetForm();
      fetchCourseOutcomes();
    } catch (error: any) {
      console.error("Error adding course outcome:", error);
      toast.error("Failed to add course outcome");
    }
  };

  const handleEditOutcome = async () => {
    if (!selectedOutcome) return;
    
    try {
      const { error } = await supabase
        .from('course_outcomes')
        .update({
          co_number: parseInt(coNumber),
          description: description.trim()
        })
        .eq('id', selectedOutcome.id);

      if (error) throw error;
      
      toast.success("Course outcome updated successfully");
      setIsEditDialogOpen(false);
      resetForm();
      fetchCourseOutcomes();
    } catch (error: any) {
      console.error("Error updating course outcome:", error);
      toast.error("Failed to update course outcome");
    }
  };

  const handleDeleteOutcome = async (id: string) => {
    try {
      const { error } = await supabase
        .from('course_outcomes')
        .delete()
        .eq('id', id);

      if (error) throw error;
      
      toast.success("Course outcome deleted successfully");
      fetchCourseOutcomes();
    } catch (error: any) {
      console.error("Error deleting course outcome:", error);
      toast.error("Failed to delete course outcome");
    }
  };

  const openEditDialog = (outcome: CourseOutcome) => {
    setSelectedOutcome(outcome);
    setCoNumber(outcome.co_number.toString());
    setDescription(outcome.description);
    setIsEditDialogOpen(true);
  };

  const resetForm = () => {
    setCoNumber("1");
    setDescription("");
    setSelectedOutcome(null);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Course Outcomes</CardTitle>
        <Button onClick={() => setIsAddDialogOpen(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" /> Add Outcome
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="text-center py-4">Loading course outcomes...</div>
        ) : courseOutcomes.length === 0 ? (
          <div className="text-center py-4 text-muted-foreground">
            No course outcomes added yet
          </div>
        ) : (
          <div className="space-y-4">
            {courseOutcomes.map((outcome) => (
              <div 
                key={outcome.id} 
                className="flex items-start justify-between p-3 border rounded-lg"
              >
                <div>
                  <span className="font-medium text-primary">CO{outcome.co_number}:</span> {outcome.description}
                </div>
                <div className="flex gap-2 ml-4">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => openEditDialog(outcome)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => handleDeleteOutcome(outcome.id)}
                  >
                    <Trash className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>

      {/* Add Course Outcome Dialog */}
      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Course Outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="co-number">CO Number</Label>
              <Select value={coNumber} onValueChange={setCoNumber}>
                <SelectTrigger id="co-number">
                  <SelectValue placeholder="Select CO number" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      CO{num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Input
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter course outcome description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleAddOutcome} 
              disabled={!description.trim()}
            >
              Add
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Course Outcome Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Course Outcome</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="edit-co-number">CO Number</Label>
              <Select value={coNumber} onValueChange={setCoNumber}>
                <SelectTrigger id="edit-co-number">
                  <SelectValue placeholder="Select CO number" />
                </SelectTrigger>
                <SelectContent>
                  {Array.from({ length: 10 }, (_, i) => i + 1).map((num) => (
                    <SelectItem key={num} value={num.toString()}>
                      CO{num}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Input
                id="edit-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Enter course outcome description"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleEditOutcome} 
              disabled={!description.trim()}
            >
              Update
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
