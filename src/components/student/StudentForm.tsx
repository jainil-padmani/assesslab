
import { useState, useEffect } from "react";
import { Student } from "@/types/dashboard";
import StudentFormFields from "./form/StudentFormFields";
import StudentFormActions from "./form/StudentFormActions";
import { useStudentMutations } from "./form/useStudentMutations";

interface StudentFormProps {
  student: Student | null;
  onClose: () => void;
  classes?: { id: string; name: string; department: string | null; year: number | null }[];
  isClassesLoading?: boolean;
}

export default function StudentForm({ student, onClose, classes, isClassesLoading }: StudentFormProps) {
  const [selectedYear, setSelectedYear] = useState<string>(student?.year ? student.year.toString() : "");
  const [selectedDepartment, setSelectedDepartment] = useState<string>(student?.department || "");
  
  const { createStudentMutation, updateStudentMutation } = useStudentMutations();

  // Update state when student prop changes
  useEffect(() => {
    if (student) {
      setSelectedYear(student.year ? student.year.toString() : "");
      setSelectedDepartment(student.department || "");
    }
  }, [student]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const yearValue = formData.get("year") as string;
    
    // Get login related fields
    const loginEnabled = formData.get("login_enabled") === "on";
    const loginIdType = (formData.get("login_id_type") as "gr_number" | "roll_number" | "email") || "email";
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    
    const rollNumber = formData.get("roll_number") as string || null;
    
    const studentData = {
      name: formData.get("name") as string,
      gr_number: formData.get("gr_number") as string,
      roll_number: rollNumber,
      year: yearValue ? parseInt(yearValue) : null,
      department: formData.get("department") as string,
      overall_percentage: parseFloat(formData.get("overall_percentage") as string) || null,
      class_id: formData.get("class_id") as string || null,
      login_enabled: loginEnabled,
      login_id_type: loginIdType,
      email: email || null,
      password: password || (loginEnabled ? rollNumber : undefined),
    };

    try {
      if (student) {
        await updateStudentMutation.mutateAsync({ id: student.id, ...studentData });
      } else {
        await createStudentMutation.mutateAsync(studentData as any);
      }
      onClose();
    } catch (error) {
      console.error("Error submitting form:", error);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <StudentFormFields
        student={student}
        classes={classes}
        isClassesLoading={isClassesLoading}
        selectedYear={selectedYear}
        setSelectedYear={setSelectedYear}
        selectedDepartment={selectedDepartment}
        setSelectedDepartment={setSelectedDepartment}
      />
      <StudentFormActions 
        isEditing={!!student} 
        onClose={onClose} 
      />
    </form>
  );
}
