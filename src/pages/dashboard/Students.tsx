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

interface UserProfile {
  team_id: string | null;
}

export default function Students() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .single();
      
      return data as UserProfile;
    },
  });

  const { data: students = [], isLoading } = useQuery<StudentWithClass[]>({
    queryKey: ["students", userProfile?.team_id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const filterColumn = userProfile?.team_id ? 'team_id' : 'user_id';
      const filterValue = userProfile?.team_id || user.id;
      
      const { data, error } = await supabase
        .from("students")
        .select('*, classes(name)')
        .eq(filterColumn, filterValue);
      
      if (error) {
        console.error("Error fetching students:", error);
        return [];
      }
      
      return (data || []) as StudentWithClass[];
    },
  });

  const { data: classes = [], isLoading: isClassesLoading } = useQuery<Class[]>({
    queryKey: ["classes", userProfile?.team_id],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const filterColumn = userProfile?.team_id ? 'team_id' : 'user_id';
      const filterValue = userProfile?.team_id || user.id;
      
      const { data, error } = await supabase
        .from("classes")
        .select('id, name, department, year')
        .eq(filterColumn, filterValue)
        .order('name');
      
      if (error) {
        console.error("Error fetching classes:", error);
        return [];
      }
      
      return (data || []) as Class[];
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
                classes={classes || []}
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
