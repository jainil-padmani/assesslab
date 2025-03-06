
import { useState } from "react";
import { Student } from "@/types/dashboard";
import StudentTable from "@/components/student/StudentTable";
import StudentHeader from "@/components/student/StudentHeader";
import { useStudentData } from "@/hooks/useStudentData";
import { useClassData } from "@/hooks/useClassData";

export default function Students() {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Use custom hooks to fetch data - without team filtering
  const { data: students = [], isLoading: isStudentsLoading } = useStudentData();
  const { data: classes = [], isLoading: isClassesLoading } = useClassData();

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
  };

  if (isStudentsLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <StudentHeader 
        onEdit={setEditingStudent}
        classes={classes}
        isClassesLoading={isClassesLoading}
        editingStudent={editingStudent}
      />

      <StudentTable 
        students={students}
        onEdit={handleEditStudent}
      />
    </div>
  );
}
