
import { useState } from "react";
import { Plus, UploadCloud, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import StudentForm from "@/components/student/StudentForm";
import CsvImport from "@/components/student/CsvImport";
import { generateSampleCsv } from "@/utils/csvUtils";
import { Student } from "@/types/dashboard";
import { Class } from "@/hooks/useClassData";

interface StudentHeaderProps {
  onEdit: (student: Student | null) => void;
  classes: Class[];
  isClassesLoading: boolean;
  editingStudent: Student | null;
}

export default function StudentHeader({ 
  onEdit, 
  classes, 
  isClassesLoading,
  editingStudent
}: StudentHeaderProps) {
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);

  const handleOpenAddStudent = () => {
    onEdit(null);
    setIsAddDialogOpen(true);
  };

  return (
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
  );
}
