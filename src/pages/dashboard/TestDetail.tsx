
import React, { useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { useTestDetail } from "@/hooks/useTestDetail";
import { TestHeader } from "@/components/test/TestHeader";
import { TestPapersManagement } from "@/components/test/TestPapersManagement";
import { StudentEvaluationDetails } from "@/components/test/StudentEvaluationDetails";
import { StudentGradesTable } from "@/components/test/StudentGradesTable";
import { useClassStudents } from "@/hooks/test-selection/useClassStudents";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle,
  DialogFooter,
  DialogTrigger 
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { AlertTriangle, Check, CheckSquare, Square } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";

export default function TestDetail() {
  const { testId } = useParams<{ testId: string }>();
  const [searchParams] = useSearchParams();
  const [notificationMessage, setNotificationMessage] = useState<string>("");
  const [isNotifyDialogOpen, setIsNotifyDialogOpen] = useState(false);
  const [notifyAllStudents, setNotifyAllStudents] = useState(true);
  
  // Get student ID from URL if present
  const studentId = searchParams.get('student');

  // Use our custom hook to handle test data and operations
  const {
    test,
    grades,
    isLoading,
    editingStudentId,
    setEditingStudentId,
    editMarks,
    setEditMarks,
    handleSaveMarks,
    handleUpdateAnswerScore,
    refetch
  } = useTestDetail(testId);

  // Use the hook to get class students and the notify function
  const { 
    classStudents, 
    notifyStudents, 
    selectedStudents,
    toggleStudentSelection,
    selectAllStudents,
    clearStudentSelection
  } = useClassStudents(test?.class_id || "");

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!test) {
    return <div className="text-center py-12">Test not found</div>;
  }

  // Find the selected student's grade
  const selectedStudentGrade = studentId 
    ? grades?.find(grade => grade.student_id === studentId)
    : null;

  const handleNotifyStudents = async () => {
    if (!testId || !notificationMessage.trim()) {
      toast.error("Please enter a notification message");
      return;
    }
    
    const message = notificationMessage.trim();
    const success = await notifyStudents(
      testId, 
      message, 
      notifyAllStudents ? undefined : selectedStudents
    );
    
    if (success) {
      setNotificationMessage("");
      setIsNotifyDialogOpen(false);
    }
  };

  const handleToggleAll = () => {
    if (notifyAllStudents) {
      setNotifyAllStudents(false);
      clearStudentSelection();
    } else {
      setNotifyAllStudents(true);
    }
  };

  return (
    <div className="container mx-auto">
      {/* Notification Button */}
      <div className="flex justify-end mb-4">
        <Dialog open={isNotifyDialogOpen} onOpenChange={setIsNotifyDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" className="flex gap-2 items-center">
              <AlertTriangle className="h-4 w-4" />
              Notify Students
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Notify Students About Test Changes</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-4">
              <Textarea
                placeholder="Enter notification message for students..."
                value={notificationMessage}
                onChange={(e) => setNotificationMessage(e.target.value)}
                className="min-h-[100px]"
              />
              
              <div className="space-y-2">
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="notify-all" 
                    checked={notifyAllStudents}
                    onCheckedChange={handleToggleAll}
                  />
                  <label 
                    htmlFor="notify-all" 
                    className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                  >
                    Notify all students in this class
                  </label>
                </div>
                
                {!notifyAllStudents && (
                  <div className="mt-4 space-y-2">
                    <div className="flex justify-between items-center">
                      <p className="text-sm font-medium">Select students to notify:</p>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={selectedStudents.length === classStudents.length ? clearStudentSelection : selectAllStudents}
                      >
                        {selectedStudents.length === classStudents.length ? "Clear All" : "Select All"}
                      </Button>
                    </div>
                    <div className="max-h-[200px] overflow-y-auto border rounded-md p-2">
                      {classStudents.map(student => (
                        <div 
                          key={student.id} 
                          className="flex items-center py-1 px-2 hover:bg-gray-100 rounded cursor-pointer"
                          onClick={() => toggleStudentSelection(student.id)}
                        >
                          <Checkbox 
                            id={`student-${student.id}`}
                            checked={selectedStudents.includes(student.id)}
                            className="mr-2"
                            onCheckedChange={() => toggleStudentSelection(student.id)}
                          />
                          <label 
                            htmlFor={`student-${student.id}`} 
                            className="text-sm cursor-pointer flex-1"
                          >
                            {student.name} ({student.gr_number})
                          </label>
                        </div>
                      ))}
                      {classStudents.length === 0 && (
                        <p className="text-sm text-gray-500 py-2 text-center">No students found</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-500">
                      {selectedStudents.length} of {classStudents.length} students selected
                    </p>
                  </div>
                )}
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsNotifyDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleNotifyStudents}>
                Send Notification
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {/* Test Header */}
      <TestHeader test={test} />
      
      {/* Test Papers Management */}
      <TestPapersManagement test={test} />

      {/* Student Evaluation Details */}
      <StudentEvaluationDetails 
        selectedStudentGrade={selectedStudentGrade}
        test={test}
        handleUpdateAnswerScore={handleUpdateAnswerScore}
      />

      {/* Student Grades Table */}
      <StudentGradesTable 
        test={test}
        grades={grades || []}
        editingStudentId={editingStudentId}
        editMarks={editMarks}
        setEditingStudentId={setEditingStudentId}
        setEditMarks={setEditMarks}
        handleSaveMarks={handleSaveMarks}
      />
    </div>
  );
}
