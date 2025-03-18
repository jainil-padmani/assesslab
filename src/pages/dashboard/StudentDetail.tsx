
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useStudentDetail } from "@/components/student/detail/useStudentDetail";
import { StudentInfoCard } from "@/components/student/detail/StudentInfoCard";
import { LoginCredentialsCard } from "@/components/student/detail/LoginCredentialsCard";
import { StudentSubjectsList } from "@/components/student/detail/StudentSubjectsList";

export default function StudentDetail() {
  const navigate = useNavigate();
  const {
    id,
    student,
    studentSubjects,
    enrolledSubjects,
    subjects,
    isPasswordDialogOpen,
    setIsPasswordDialogOpen,
    isLoginSettingsDialogOpen,
    setIsLoginSettingsDialogOpen,
    newPassword,
    setNewPassword,
    loginIdType,
    setLoginIdType,
    showPassword,
    setShowPassword,
    toggleLoginMutation,
    updateLoginSettingsMutation,
    updatePasswordMutation,
    addSubjectMutation,
    updateGradeMutation,
    deleteSubjectMutation,
    unenrollSubjectMutation,
    getLoginIdValue,
    copyToClipboard
  } = useStudentDetail();

  const handleUpdatePassword = () => {
    if (!newPassword) {
      return;
    }
    updatePasswordMutation.mutate(newPassword);
  };
  
  const handleUpdateLoginSettings = () => {
    updateLoginSettingsMutation.mutate({
      login_id_type: loginIdType,
    });
  };

  if (!student) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/dashboard/students")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Students
      </Button>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{student.name}</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Basic Info Card */}
          <StudentInfoCard student={student} />

          {/* Login Credentials Card */}
          <LoginCredentialsCard
            student={student}
            showPassword={showPassword}
            setShowPassword={setShowPassword}
            getLoginIdValue={getLoginIdValue}
            copyToClipboard={copyToClipboard}
            toggleLoginMutation={toggleLoginMutation}
            isPasswordDialogOpen={isPasswordDialogOpen}
            setIsPasswordDialogOpen={setIsPasswordDialogOpen}
            newPassword={newPassword}
            setNewPassword={setNewPassword}
            handleUpdatePassword={handleUpdatePassword}
            isLoginSettingsDialogOpen={isLoginSettingsDialogOpen}
            setIsLoginSettingsDialogOpen={setIsLoginSettingsDialogOpen}
            loginIdType={loginIdType}
            setLoginIdType={setLoginIdType}
            handleUpdateLoginSettings={handleUpdateLoginSettings}
          />
        </div>

        {/* Student Subjects List */}
        <StudentSubjectsList
          studentId={id!}
          studentSubjects={studentSubjects || []}
          enrolledSubjects={enrolledSubjects || []}
          subjects={subjects || []}
          updateGradeMutation={updateGradeMutation}
          deleteSubjectMutation={deleteSubjectMutation}
          unenrollSubjectMutation={unenrollSubjectMutation}
          addSubjectMutation={addSubjectMutation}
        />
      </div>
    </div>
  );
}
