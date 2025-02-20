import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, CheckCircle, Plus, Pencil, Trash } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import type { Student, Subject, AnswerKey } from "@/types/dashboard";

export default function Check() {
  const [selectedStudent, setSelectedStudent] = useState("");
  const [selectedSubject, setSelectedSubject] = useState("");
  const [selectedAnswerKey, setSelectedAnswerKey] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [answerKeys, setAnswerKeys] = useState<AnswerKey[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [isAddingKey, setIsAddingKey] = useState(false);
  const [newKeyTitle, setNewKeyTitle] = useState("");

  // Fetch data when component mounts
  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      // Fetch students
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*')
        .order('name');
      
      if (studentsError) throw studentsError;
      if (studentsData) setStudents(studentsData);

      // Fetch subjects
      const { data: subjectsData, error: subjectsError } = await supabase
        .from('subjects')
        .select('*')
        .order('name');
      
      if (subjectsError) throw subjectsError;
      if (subjectsData) setSubjects(subjectsData);

      // Fetch answer keys
      const { data: keysData, error: keysError } = await supabase
        .from('answer_keys')
        .select('*')
        .order('created_at');
      
      if (keysError) throw keysError;
      if (keysData) setAnswerKeys(keysData);
    } catch (error: any) {
      toast.error('Failed to fetch data');
      console.error('Error fetching data:', error);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.type !== 'application/pdf') {
        toast.error('Please upload PDF files only');
        return;
      }
      setFile(selectedFile);
    }
  };

  const handleSubmit = async () => {
    if (!selectedStudent || !selectedSubject || !selectedAnswerKey || !file) {
      toast.error('Please fill in all fields and upload an answer sheet');
      return;
    }

    setIsLoading(true);
    try {
      // Upload answer sheet
      const fileExt = file.name.split('.').pop();
      const fileName = `${crypto.randomUUID()}.${fileExt}`;
      
      const { error: uploadError } = await supabase.storage
        .from('documents')
        .upload(`answer-sheets/${fileName}`, file);

      if (uploadError) throw uploadError;

      // Get the file URL
      const { data: { publicUrl } } = supabase.storage
        .from('documents')
        .getPublicUrl(`answer-sheets/${fileName}`);

      // Create assessment
      const { error: assessmentError } = await supabase
        .from('assessments')
        .insert({
          student_id: selectedStudent,
          subject_id: selectedSubject,
          answer_key_id: selectedAnswerKey,
          answer_sheet_url: publicUrl,
          status: 'pending'
        });

      if (assessmentError) throw assessmentError;

      toast.success('Answer sheet uploaded successfully');
      // Reset form
      setFile(null);
      setSelectedStudent("");
      setSelectedSubject("");
      setSelectedAnswerKey("");
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error submitting answer sheet:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddAnswerKey = async () => {
    if (!newKeyTitle || !selectedSubject) {
      toast.error('Please provide a title and select a subject');
      return;
    }

    try {
      const { error } = await supabase
        .from('answer_keys')
        .insert({
          title: newKeyTitle,
          subject_id: selectedSubject,
          content: {} // Initialize with empty content
        });

      if (error) throw error;

      toast.success('Answer key added successfully');
      setIsAddingKey(false);
      setNewKeyTitle("");
      fetchData(); // Refresh the list
    } catch (error: any) {
      toast.error(error.message);
      console.error('Error adding answer key:', error);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Auto Check</h1>
      
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-accent" />
              Answer Keys Management
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isAddingKey ? (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="keyTitle">Answer Key Title</Label>
                  <Input
                    id="keyTitle"
                    value={newKeyTitle}
                    onChange={(e) => setNewKeyTitle(e.target.value)}
                    placeholder="Enter title"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="keySubject">Subject</Label>
                  <select
                    id="keySubject"
                    className="w-full rounded-md border border-input bg-background px-3 py-2"
                    value={selectedSubject}
                    onChange={(e) => setSelectedSubject(e.target.value)}
                  >
                    <option value="">Select Subject</option>
                    {subjects.map((subject) => (
                      <option key={subject.id} value={subject.id}>
                        {subject.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="flex gap-2">
                  <Button onClick={handleAddAnswerKey}>Save</Button>
                  <Button variant="outline" onClick={() => setIsAddingKey(false)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setIsAddingKey(true)} className="w-full">
                <Plus className="mr-2 h-4 w-4" />
                Add New Answer Key
              </Button>
            )}
            
            <div className="space-y-2">
              {answerKeys.map((key) => (
                <div
                  key={key.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <span>{key.title}</span>
                  <div className="flex gap-2">
                    <Button variant="ghost" size="icon">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Trash className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Submit Answer Sheet</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="student">Student</Label>
              <select
                id="student"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={selectedStudent}
                onChange={(e) => setSelectedStudent(e.target.value)}
              >
                <option value="">Select Student</option>
                {students.map((student) => (
                  <option key={student.id} value={student.id}>
                    {student.name} ({student.roll_number})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <select
                id="subject"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={selectedSubject}
                onChange={(e) => setSelectedSubject(e.target.value)}
              >
                <option value="">Select Subject</option>
                {subjects.map((subject) => (
                  <option key={subject.id} value={subject.id}>
                    {subject.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answerKey">Answer Key</Label>
              <select
                id="answerKey"
                className="w-full rounded-md border border-input bg-background px-3 py-2"
                value={selectedAnswerKey}
                onChange={(e) => setSelectedAnswerKey(e.target.value)}
              >
                <option value="">Select Answer Key</option>
                {answerKeys.map((key) => (
                  <option key={key.id} value={key.id}>
                    {key.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="answerSheet">Upload Answer Sheet (PDF only)</Label>
              <Input
                id="answerSheet"
                type="file"
                accept=".pdf"
                onChange={handleFileChange}
              />
            </div>

            <Button
              className="w-full"
              onClick={handleSubmit}
              disabled={isLoading}
            >
              {isLoading ? (
                "Processing..."
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Submit for Checking
                </>
              )}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
