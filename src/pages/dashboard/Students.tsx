
import { useState } from "react";
import { Student } from "@/types/dashboard";
import StudentTable from "@/components/student/StudentTable";
import StudentHeader from "@/components/student/StudentHeader";
import { useUserProfile } from "@/hooks/useUserProfile";
import { useStudentData } from "@/hooks/useStudentData";
import { useClassData } from "@/hooks/useClassData";

export default function Students() {
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  
  // Use custom hooks to fetch data
  const { data: userProfile } = useUserProfile();
  const { data: students = [], isLoading: isStudentsLoading } = useStudentData(userProfile?.team_id);
  const { data: classes = [], isLoading: isClassesLoading } = useClassData(userProfile?.team_id);

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
