import { useState } from "react";
import { Plus, UploadCloud, Download } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import StudentTable from "@/components/student/StudentTable";
import StudentForm from "@/components/student/StudentForm";
import CsvImport from "@/components/student/CsvImport";
import { generateSampleCsv } from "@/utils/csvUtils";

interface StudentWithClass extends Student {
  classes: { name: string } | null;
}

interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
}

export default function Students() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Fetch students with class info - now filtered by user_id or team_id
  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to view students");
      }
      
      // Get the user's profile to check if they are part of a team
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();
        
      if (profileError && profileError.code !== 'PGRST116') {
        console.error("Error fetching profile:", profileError);
      }
      
      // Fetch students - no need to filter as RLS will handle it
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name)");
      
      if (error) throw error;
      return data as StudentWithClass[];
    },
  });

  // Fetch classes for the dropdown - now filtered by user_id or team_id
  const { data: classes, isLoading: isClassesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      // Get the current user
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to view classes");
      }
      
      // Fetch classes - no need to filter as RLS will handle it
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, department, year")
        .order("name");
      
      if (error) throw error;
      return data as Class[];
    },
  });

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setIsAddDialogOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setIsAddDialogOpen(true);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Students</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={generateSampleCsv}>
            <Download className="w-4 h-4 mr-2" />
            Sample CSV
          </Button>
          
          <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <UploadCloud className="w-4 h-4 mr-2" />
                Import CSV
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl">
              <DialogHeader>
                <DialogTitle>Import Students from CSV</DialogTitle>
                <DialogDescription>
                  Upload a CSV file with student data and map the fields.
                </DialogDescription>
              </DialogHeader>
              <CsvImport onClose={() => setIsCsvDialogOpen(false)} />
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAddStudent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? "Edit Student" : "Add New Student"}
                </DialogTitle>
              </DialogHeader>
              <StudentForm 
                student={editingStudent} 
                onClose={() => setIsAddDialogOpen(false)} 
                classes={classes}
                isClassesLoading={isClassesLoading}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <StudentTable 
        students={students || []}
        onEdit={handleEditStudent}
      />
    </div>
  );
}
