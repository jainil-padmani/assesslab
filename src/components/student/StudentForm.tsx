
import { useState, useEffect } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
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
import { toast } from "sonner";

interface StudentFormProps {
  student: Student | null;
  onClose: () => void;
  classes?: { id: string; name: string; department: string | null; year: number | null }[];
  isClassesLoading?: boolean;
}

interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
}

export default function StudentForm({ student, onClose, classes, isClassesLoading }: StudentFormProps) {
  const queryClient = useQueryClient();
  const [selectedYear, setSelectedYear] = useState<string>(student?.year ? student.year.toString() : "");
  const [selectedDepartment, setSelectedDepartment] = useState<string>(student?.department || "");

  // Generate years (from 2018 to current year + 4)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2018 + 5 }, (_, i) => 2018 + i);

  // Common departments
  const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical", "Chemical", "Other"];

  // Filtered classes based on selected year
  const filteredClasses = selectedYear && classes
    ? classes.filter((cls) => cls.year === parseInt(selectedYear))
    : classes;

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: Omit<Student, "id" | "created_at"> & { class_id?: string | null }) => {
      const { data, error } = await supabase
        .from("students")
        .insert([newStudent])
        .select()
        .single();
      if (error) throw error;
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

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async (studentData: Partial<Student> & { id: string, class_id?: string | null }) => {
      const { data, error } = await supabase
        .from("students")
        .update(studentData)
        .eq("id", studentData.id)
        .select()
        .single();
      if (error) throw error;
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

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const yearValue = formData.get("year") as string;
    const studentData = {
      name: formData.get("name") as string,
      gr_number: formData.get("gr_number") as string,
      roll_number: formData.get("roll_number") as string || null,
      year: yearValue ? parseInt(yearValue) : null,
      class: formData.get("class") as string || null,
      department: formData.get("department") as string,
      overall_percentage: parseFloat(formData.get("overall_percentage") as string) || null,
      class_id: formData.get("class_id") as string || null,
      email: formData.get("email") as string || null,
      parent_name: formData.get("parent_name") as string || null,
      parent_contact: formData.get("parent_contact") as string || null,
    };

    if (student) {
      updateStudentMutation.mutate({ id: student.id, ...studentData });
    } else {
      addStudentMutation.mutate(studentData as any);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            name="name"
            required
            defaultValue={student?.name || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="gr_number">GR Number *</Label>
          <Input
            id="gr_number"
            name="gr_number"
            required
            defaultValue={student?.gr_number || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="roll_number">Roll Number</Label>
          <Input
            id="roll_number"
            name="roll_number"
            defaultValue={student?.roll_number || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="year">Year</Label>
          <Select 
            name="year" 
            value={selectedYear} 
            onValueChange={setSelectedYear}
          >
            <SelectTrigger id="year">
              <SelectValue placeholder="Select year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No year selected</SelectItem>
              {years.map(year => (
                <SelectItem key={year} value={year.toString()}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="class_id">Class</Label>
          <Select
            name="class_id"
            defaultValue={student?.class_id || ""}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">No class assigned</SelectItem>
              {filteredClasses?.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name} {cls.year ? `- Year ${cls.year}` : ""}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="class">Class Section</Label>
          <Input
            id="class"
            name="class"
            defaultValue={student?.class || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="department">Department *</Label>
          <Select 
            name="department" 
            value={selectedDepartment} 
            onValueChange={setSelectedDepartment} 
            required
          >
            <SelectTrigger id="department">
              <SelectValue placeholder="Select department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map(dept => (
                <SelectItem key={dept} value={dept}>
                  {dept}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="overall_percentage">Overall Percentage</Label>
          <Input
            id="overall_percentage"
            name="overall_percentage"
            type="number"
            step="0.01"
            defaultValue={student?.overall_percentage || ""}
          />
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            defaultValue={student?.email || ""}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="parent_name">Parent Name</Label>
          <Input
            id="parent_name"
            name="parent_name"
            defaultValue={student?.parent_name || ""}
          />
        </div>
        <div className="space-y-2 col-span-2">
          <Label htmlFor="parent_contact">Parent Contact</Label>
          <Input
            id="parent_contact"
            name="parent_contact"
            defaultValue={student?.parent_contact || ""}
          />
        </div>
      </div>
      <div className="flex justify-end space-x-2">
        <Button
          type="button"
          variant="outline"
          onClick={onClose}
        >
          Cancel
        </Button>
        <Button type="submit">
          {student ? "Update" : "Add"} Student
        </Button>
      </div>
    </form>
  );
}
