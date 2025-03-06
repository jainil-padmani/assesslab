
import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Plus, UserPlus, BookOpen } from "lucide-react";
import { toast } from "sonner";

interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
  created_at: string;
}

interface Subject {
  id: string;
  name: string;
  subject_code: string;
  semester: number;
}

export default function ClassDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [isAddStudentDialogOpen, setIsAddStudentDialogOpen] = useState(false);
  const [isAddSubjectDialogOpen, setIsAddSubjectDialogOpen] = useState(false);
  const [selectedStudentId, setSelectedStudentId] = useState<string>("");
  const [selectedSubjectId, setSelectedSubjectId] = useState<string>("");
  const [activeTab, setActiveTab] = useState<string>("students");

  // Fetch class details
  const { data: classData } = useQuery({
    queryKey: ["class", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data as Class;
    },
  });

  // Fetch students in this class
  const { data: classStudents, isLoading: isStudentsLoading } = useQuery({
    queryKey: ["class-students", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .eq("class_id", id)
        .order("name");
      if (error) throw error;
      return data as Student[];
    },
  });

  // Fetch class subjects
  const { data: classSubjects, isLoading: isSubjectsLoading } = useQuery({
    queryKey: ["class-subjects", id],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // First get subjects associated with this class through enrollments
      const { data: enrollmentData, error: enrollmentError } = await supabase
        .from("subject_enrollments")
        .select(`
          subject_id,
          subjects (*)
        `)
        .eq("student_id", (classStudents?.[0]?.id || ''));
        
      if (enrollmentError) throw enrollmentError;
      
      // Extract unique subjects
      const uniqueSubjects = enrollmentData?.length 
        ? Array.from(new Set(enrollmentData.map(e => e.subject_id)))
            .map(id => enrollmentData.find(e => e.subject_id === id)?.subjects)
            .filter(Boolean)
        : [];
      
      return uniqueSubjects as Subject[];
    },
    enabled: !!classStudents?.length,
  });

  // Fetch available students (not in any class or in a different class)
  const { data: availableStudents, isLoading: isAvailableLoading } = useQuery({
    queryKey: ["available-students", id],
    queryFn: async () => {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      // Query for students without a class and belonging to the current user
      const { data, error } = await supabase
        .from("students")
        .select("*")
        .is("class_id", null)
        .eq("user_id", user.id)
        .order("name");
        
      if (error) throw error;
      
      return data as Student[];
    },
  });

  // Fetch available subjects (for adding to class)
  const { data: availableSubjects, isLoading: isAvailableSubjectsLoading } = useQuery({
    queryKey: ["available-subjects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      
      const { data, error } = await supabase
        .from("subjects")
        .select("id, name, subject_code, semester")
        .eq("user_id", user.id)
        .order("name");
        
      if (error) throw error;
      return data as Subject[];
    }
  });

  // Add student to class mutation
  const addStudentToClassMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase
        .from("students")
        .update({ class_id: id })
        .eq("id", studentId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-students", id] });
      queryClient.invalidateQueries({ queryKey: ["available-students", id] });
      queryClient.invalidateQueries({ queryKey: ["class-subjects", id] });
      setIsAddStudentDialogOpen(false);
      setSelectedStudentId("");
      toast.success("Student added to class successfully");
    },
    onError: (error) => {
      toast.error("Failed to add student to class: " + error.message);
    },
  });

  // Remove student from class mutation
  const removeStudentFromClassMutation = useMutation({
    mutationFn: async (studentId: string) => {
      const { data, error } = await supabase
        .from("students")
        .update({ class_id: null })
        .eq("id", studentId)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-students", id] });
      queryClient.invalidateQueries({ queryKey: ["available-students", id] });
      queryClient.invalidateQueries({ queryKey: ["class-subjects", id] });
      toast.success("Student removed from class successfully");
    },
    onError: (error) => {
      toast.error("Failed to remove student from class: " + error.message);
    },
  });

  // Add subject to class (by enrolling all students in the class)
  const addSubjectToClassMutation = useMutation({
    mutationFn: async (subjectId: string) => {
      if (!classStudents?.length) {
        throw new Error("No students in this class to enroll");
      }
      
      // Create enrollment records for each student in the class
      const enrollmentRecords = classStudents.map(student => ({
        student_id: student.id,
        subject_id: subjectId
      }));
      
      const { data, error } = await supabase
        .from("subject_enrollments")
        .upsert(enrollmentRecords, { onConflict: 'student_id,subject_id' })
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-subjects", id] });
      setIsAddSubjectDialogOpen(false);
      setSelectedSubjectId("");
      toast.success("Subject added to class successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to add subject to class: " + error.message);
    },
  });

  // Remove subject from class (unenroll all students)
  const removeSubjectFromClassMutation = useMutation({
    mutationFn: async (subjectId: string) => {
      if (!classStudents?.length) return;
      
      // Delete enrollment records for this subject for all students in the class
      const studentIds = classStudents.map(student => student.id);
      
      const { error } = await supabase
        .from("subject_enrollments")
        .delete()
        .eq("subject_id", subjectId)
        .in("student_id", studentIds);
        
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["class-subjects", id] });
      toast.success("Subject removed from class successfully");
    },
    onError: (error: any) => {
      toast.error("Failed to remove subject from class: " + error.message);
    },
  });

  const handleAddStudentToClass = () => {
    if (!selectedStudentId) {
      toast.error("Please select a student");
      return;
    }
    addStudentToClassMutation.mutate(selectedStudentId);
  };

  const handleAddSubjectToClass = () => {
    if (!selectedSubjectId) {
      toast.error("Please select a subject");
      return;
    }
    addSubjectToClassMutation.mutate(selectedSubjectId);
  };

  if (!classData) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
      <Button
        variant="ghost"
        className="mb-4"
        onClick={() => navigate("/dashboard/classes")}
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to Classes
      </Button>

      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold">{classData.name}</h1>
        </div>

        <div className="grid grid-cols-2 gap-4 mb-6">
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{classData.department || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Year</p>
            <p className="font-medium">{classData.year || "-"}</p>
          </div>
        </div>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="students">Students</TabsTrigger>
            <TabsTrigger value="subjects">Subjects</TabsTrigger>
          </TabsList>
          
          <TabsContent value="students" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Students</h2>
              <Dialog
                open={isAddStudentDialogOpen}
                onOpenChange={setIsAddStudentDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Student
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Student to {classData.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Select
                      value={selectedStudentId}
                      onValueChange={setSelectedStudentId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a student" />
                      </SelectTrigger>
                      <SelectContent>
                        {isAvailableLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading students...
                          </SelectItem>
                        ) : !availableStudents?.length ? (
                          <SelectItem value="none" disabled>
                            No available students
                          </SelectItem>
                        ) : (
                          availableStudents.map((student) => (
                            <SelectItem key={student.id} value={student.id}>
                              {student.name} ({student.gr_number})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddStudentDialogOpen(false);
                          setSelectedStudentId("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddStudentToClass}
                        disabled={!selectedStudentId || isAvailableLoading}
                      >
                        Add Student
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>GR Number</TableHead>
                    <TableHead>Roll Number</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isStudentsLoading ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-4">
                        Loading students...
                      </TableCell>
                    </TableRow>
                  ) : !classStudents?.length ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-8 text-gray-500">
                        No students in this class. Add a student to get started!
                      </TableCell>
                    </TableRow>
                  ) : (
                    classStudents.map((student) => (
                      <TableRow key={student.id}>
                        <TableCell
                          className="font-medium cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/dashboard/students/${student.id}`)}
                        >
                          {student.name}
                        </TableCell>
                        <TableCell>{student.gr_number}</TableCell>
                        <TableCell>{student.roll_number}</TableCell>
                        <TableCell>{student.department}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to remove this student from the class?")) {
                                removeStudentFromClassMutation.mutate(student.id);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
          
          <TabsContent value="subjects" className="mt-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold">Subjects</h2>
              <Dialog
                open={isAddSubjectDialogOpen}
                onOpenChange={setIsAddSubjectDialogOpen}
              >
                <DialogTrigger asChild>
                  <Button disabled={!classStudents?.length}>
                    <BookOpen className="w-4 h-4 mr-2" />
                    Add Subject
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Subject to {classData.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 py-4">
                    <Select
                      value={selectedSubjectId}
                      onValueChange={setSelectedSubjectId}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a subject" />
                      </SelectTrigger>
                      <SelectContent>
                        {isAvailableSubjectsLoading ? (
                          <SelectItem value="loading" disabled>
                            Loading subjects...
                          </SelectItem>
                        ) : !availableSubjects?.length ? (
                          <SelectItem value="none" disabled>
                            No available subjects
                          </SelectItem>
                        ) : (
                          availableSubjects.map((subject) => (
                            <SelectItem key={subject.id} value={subject.id}>
                              {subject.name} ({subject.subject_code})
                            </SelectItem>
                          ))
                        )}
                      </SelectContent>
                    </Select>
                    <div className="flex justify-end space-x-2">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                          setIsAddSubjectDialogOpen(false);
                          setSelectedSubjectId("");
                        }}
                      >
                        Cancel
                      </Button>
                      <Button
                        type="button"
                        onClick={handleAddSubjectToClass}
                        disabled={!selectedSubjectId || isAvailableSubjectsLoading}
                      >
                        Add Subject
                      </Button>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="border rounded-lg">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Subject Name</TableHead>
                    <TableHead>Subject Code</TableHead>
                    <TableHead>Semester</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isSubjectsLoading ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-4">
                        Loading subjects...
                      </TableCell>
                    </TableRow>
                  ) : !classSubjects?.length ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-gray-500">
                        {classStudents?.length 
                          ? "No subjects assigned to this class. Add a subject to get started!"
                          : "Add students to this class first before adding subjects."
                        }
                      </TableCell>
                    </TableRow>
                  ) : (
                    classSubjects.map((subject) => (
                      <TableRow key={subject.id}>
                        <TableCell
                          className="font-medium cursor-pointer hover:text-primary"
                          onClick={() => navigate(`/dashboard/subjects/${subject.id}`)}
                        >
                          {subject.name}
                        </TableCell>
                        <TableCell>{subject.subject_code}</TableCell>
                        <TableCell>{subject.semester}</TableCell>
                        <TableCell>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              if (confirm("Are you sure you want to remove this subject from the class? This will unenroll all students from this subject.")) {
                                removeSubjectFromClassMutation.mutate(subject.id);
                              }
                            }}
                          >
                            Remove
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
