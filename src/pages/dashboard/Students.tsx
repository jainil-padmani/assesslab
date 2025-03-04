
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

// Define explicit interfaces to avoid deep type instantiation
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

// Simple type for database query results to avoid excessive type inference
interface QueryResult<T> {
  data: T[] | null;
  error: any;
}

export default function Students() {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);

  // Get current user profile to check team membership
  const { data: userProfile } = useQuery<UserProfile | null>({
    queryKey: ["user-profile"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return null;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('team_id')
        .eq('id', user.id)
        .maybeSingle();
        
      if (error) {
        console.error("Error fetching profile:", error);
        return null;
      }
      
      return data;
    },
  });

  // Fetch students with class info
  const { data: students, isLoading } = useQuery<StudentWithClass[]>({
    queryKey: ["students", userProfile?.team_id],
    queryFn: async () => {
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("You must be logged in to view students");
        }
        
        let query = supabase
          .from("students")
          .select("*, classes(name)");
        
        // If user has a team_id, get team students, otherwise get personal students
        if (userProfile?.team_id) {
          query = query.eq('team_id', userProfile.team_id);
        } else {
          query = query.eq('user_id', user.id);
        }
        
        // Use type assertion to avoid deep instantiation
        const result = await query as unknown as { data: StudentWithClass[], error: any };
        
        if (result.error) throw result.error;
        return result.data;
      } catch (error) {
        console.error("Error fetching students:", error);
        return [];
      }
    },
    enabled: true,
  });

  // Fetch classes for the dropdown
  const { data: classes, isLoading: isClassesLoading } = useQuery<Class[]>({
    queryKey: ["classes", userProfile?.team_id],
    queryFn: async () => {
      try {
        // Get the current user
        const { data: { user } } = await supabase.auth.getUser();
        
        if (!user) {
          throw new Error("You must be logged in to view classes");
        }
        
        let query = supabase
          .from("classes")
          .select("id, name, department, year")
          .order("name");
        
        // If user has a team_id, get team classes, otherwise get personal classes
        if (userProfile?.team_id) {
          query = query.eq('team_id', userProfile.team_id);
        } else {
          query = query.eq('user_id', user.id);
        }
        
        // Use type assertion to avoid deep instantiation
        const result = await query as unknown as { data: Class[], error: any };
        
        if (result.error) throw result.error;
        return result.data;
      } catch (error) {
        console.error("Error fetching classes:", error);
        return [];
      }
    },
    enabled: true,
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
