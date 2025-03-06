
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
import { useEffect, useState as useReactState } from "react";

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
  const [isMobile, setIsMobile] = useReactState(window.innerWidth < 768);

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768);
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleOpenAddStudent = () => {
    onEdit(null);
    setIsAddDialogOpen(true);
  };

  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-4 mb-6">
      <h1 className="text-xl md:text-2xl font-bold">Students</h1>
      <div className={`flex ${isMobile ? 'flex-col' : 'flex-row'} gap-2 w-full md:w-auto`}>
        <Button 
          variant="outline" 
          onClick={generateSampleCsv}
          className="text-sm md:text-base py-5 md:py-2 justify-center"
          size={isMobile ? "lg" : "default"}
        >
          <Download className="w-4 h-4 mr-2" />
          Sample CSV
        </Button>
        
        <Dialog open={isCsvDialogOpen} onOpenChange={setIsCsvDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              variant="outline"
              className="text-sm md:text-base py-5 md:py-2 justify-center"
              size={isMobile ? "lg" : "default"}
            >
              <UploadCloud className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-3xl">
            <DialogHeader>
              <DialogTitle>Import Students from CSV</DialogTitle>
            </DialogHeader>
            <CsvImport onClose={() => setIsCsvDialogOpen(false)} />
          </DialogContent>
        </Dialog>
        
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button 
              onClick={handleOpenAddStudent}
              className="text-sm md:text-base py-5 md:py-2 justify-center"
              size={isMobile ? "lg" : "default"}
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Student
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-[95vw] md:max-w-md">
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
