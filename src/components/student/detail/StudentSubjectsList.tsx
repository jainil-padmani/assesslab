
import { useState } from "react";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus } from "lucide-react";
import { Subject } from "@/types/dashboard";
import { toast } from "sonner";

interface StudentSubjectsListProps {
  studentId: string;
  studentSubjects: any[];
  enrolledSubjects: any[];
  subjects: Subject[];
  updateGradeMutation: any;
  deleteSubjectMutation: any;
  unenrollSubjectMutation: any;
  addSubjectMutation: any;
}

export function StudentSubjectsList({
  studentId,
  studentSubjects,
  enrolledSubjects,
  subjects,
  updateGradeMutation,
  deleteSubjectMutation,
  unenrollSubjectMutation,
  addSubjectMutation
}: StudentSubjectsListProps) {
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  const [grade, setGrade] = useState<string>("");

  const handleAddSubject = () => {
    if (!selectedSubject || !grade) {
      toast.error("Please select a subject and enter a grade");
      return;
    }

    addSubjectMutation.mutate({
      student_id: studentId,
      subject_id: selectedSubject,
      grade,
    }, {
      onSuccess: () => {
        setIsAddSubjectDialogOpen(false);
        setSelectedSubject("");
        setGrade("");
      }
    });
  };

  return (
    <div className="border rounded-lg">
      <div className="flex justify-between items-center p-4 border-b">
        <h2 className="text-lg font-semibold">Student Subjects</h2>
        <Dialog open={isAddSubjectDialogOpen} onOpenChange={setIsAddSubjectDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Add Subject
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Subject</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="subject">Subject</Label>
                <Select
                  value={selectedSubject}
                  onValueChange={setSelectedSubject}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects?.map((subject) => (
                      <SelectItem key={subject.id} value={subject.id}>
                        {subject.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="grade">Grade</Label>
                <Input
                  id="grade"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Enter grade"
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setIsAddSubjectDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button onClick={handleAddSubject}>Add Subject</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Subject</TableHead>
            <TableHead>Subject Code</TableHead>
            <TableHead>Grade</TableHead>
            <TableHead>Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {studentSubjects?.map((studentSubject: any) => (
            <TableRow key={studentSubject.id}>
              <TableCell>{studentSubject.subjects.name}</TableCell>
              <TableCell>{studentSubject.subjects.subject_code}</TableCell>
              <TableCell>
                <Input
                  value={studentSubject.grade || ""}
                  onChange={(e) =>
                    updateGradeMutation.mutate({
                      subjectId: studentSubject.subject_id,
                      grade: e.target.value,
                    })
                  }
                />
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to remove this subject?")) {
                      deleteSubjectMutation.mutate(studentSubject.id);
                    }
                  }}
                >
                  Remove
                </Button>
              </TableCell>
            </TableRow>
          ))}
          
          {enrolledSubjects?.map((subject: any) => (
            <TableRow key={`enrolled-${subject.id}`}>
              <TableCell>{subject.name}</TableCell>
              <TableCell>{subject.subject_code}</TableCell>
              <TableCell>
                <span className="text-muted-foreground">Enrolled</span>
              </TableCell>
              <TableCell>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    if (confirm("Are you sure you want to unenroll this student from the subject?")) {
                      unenrollSubjectMutation.mutate(subject.enrollment_id);
                    }
                  }}
                >
                  Unenroll
                </Button>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
