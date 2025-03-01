
import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Pencil, Trash2, UploadCloud, Download } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import Papa from 'papaparse';
import { Textarea } from "@/components/ui/textarea";

interface Class {
  id: string;
  name: string;
  department: string | null;
  year: number | null;
}

interface StudentWithClass extends Student {
  classes: { name: string } | null;
}

interface CsvMappingField {
  csvHeader: string;
  studentField: keyof Student | "";
}

export default function Students() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [isCsvDialogOpen, setIsCsvDialogOpen] = useState(false);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedYear, setSelectedYear] = useState<string>("");
  const [selectedDepartment, setSelectedDepartment] = useState<string>("");
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<CsvMappingField[]>([]);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);

  // Generate years (from 2018 to current year + 4)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2018 + 5 }, (_, i) => 2018 + i);

  // Common departments
  const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical", "Chemical", "Other"];

  // Fetch students with class info
  const { data: students, isLoading } = useQuery({
    queryKey: ["students"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("students")
        .select("*, classes(name)")
        .order("name");
      if (error) throw error;
      return data as StudentWithClass[];
    },
  });

  // Fetch classes for the dropdown
  const { data: classes, isLoading: isClassesLoading } = useQuery({
    queryKey: ["classes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("classes")
        .select("id, name, department, year")
        .order("name");
      if (error) throw error;
      return data as Class[];
    },
  });

  // Filtered classes based on selected year
  const filteredClasses = selectedYear
    ? classes?.filter((cls) => cls.year === parseInt(selectedYear))
    : classes;

  // Add student mutation
  const addStudentMutation = useMutation({
    mutationFn: async (newStudent: Omit<Student, "id" | "created_at"> & { class_id?: string | null }) => {
      const { data, error } = await supabase
        .from("students")
        .insert([newStudent])
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsAddDialogOpen(false);
      toast.success("Student added successfully");
    },
    onError: (error) => {
      toast.error("Failed to add student: " + error.message);
    },
  });

  // Batch add students mutation
  const batchAddStudentsMutation = useMutation({
    mutationFn: async (students: Omit<Student, "id" | "created_at">[]) => {
      const { data, error } = await supabase
        .from("students")
        .insert(students)
        .select();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setIsCsvDialogOpen(false);
      setCsvFile(null);
      setCsvData([]);
      setCsvHeaders([]);
      setFieldMapping([]);
      setCsvPreview([]);
      toast.success(`${data.length} students added successfully`);
    },
    onError: (error) => {
      toast.error("Failed to add students: " + error.message);
    },
  });

  // Update student mutation
  const updateStudentMutation = useMutation({
    mutationFn: async (student: Partial<Student> & { id: string, class_id?: string | null }) => {
      const { data, error } = await supabase
        .from("students")
        .update(student)
        .eq("id", student.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      setEditingStudent(null);
      setIsAddDialogOpen(false);
      toast.success("Student updated successfully");
    },
    onError: (error) => {
      toast.error("Failed to update student: " + error.message);
    },
  });

  // Delete student mutation
  const deleteStudentMutation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("students").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      toast.success("Student deleted successfully");
    },
    onError: (error) => {
      toast.error("Failed to delete student: " + error.message);
    },
  });

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    
    const yearValue = formData.get("year") as string;
    const studentData = {
      name: formData.get("name") as string,
      gr_number: formData.get("gr_number") as string,
      roll_number: formData.get("roll_number") as string || null,
      year: yearValue ? parseInt(yearValue) : null,
      class: formData.get("class") as string || null,
      department: formData.get("department") as string,
      overall_percentage: parseFloat(formData.get("overall_percentage") as string) || null,
      class_id: formData.get("class_id") as string || null,
      email: formData.get("email") as string || null,
      parent_name: formData.get("parent_name") as string || null,
      parent_contact: formData.get("parent_contact") as string || null,
    };

    if (editingStudent) {
      updateStudentMutation.mutate({ id: editingStudent.id, ...studentData });
    } else {
      addStudentMutation.mutate(studentData as any);
    }
  };

  const handleOpenAddStudent = () => {
    setEditingStudent(null);
    setSelectedYear("");
    setSelectedDepartment("");
    setIsAddDialogOpen(true);
  };

  const handleEditStudent = (student: Student) => {
    setEditingStudent(student);
    setSelectedYear(student.year ? student.year.toString() : "");
    setSelectedDepartment(student.department);
    setIsAddDialogOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      setCsvFile(file);
      
      Papa.parse(file, {
        header: true,
        skipEmptyLines: true,
        complete: (results) => {
          const headers = results.meta.fields || [];
          setCsvHeaders(headers);
          setCsvData(results.data);
          setCsvPreview(results.data.slice(0, 5));
          
          // Initialize field mapping with type-safe empty strings
          const initialMapping: CsvMappingField[] = headers.map(header => ({
            csvHeader: header,
            studentField: "" as "" | keyof Student
          }));
          setFieldMapping(initialMapping);
        },
        error: (error) => {
          toast.error("Error parsing CSV file: " + error.message);
        }
      });
    }
  };

  const handleMappingChange = (csvHeader: string, studentField: keyof Student | "") => {
    setFieldMapping(prev => 
      prev.map(field => 
        field.csvHeader === csvHeader 
          ? { ...field, studentField } 
          : field
      )
    );
  };

  const handleImportCsv = () => {
    if (!csvData.length || !fieldMapping.length) {
      toast.error("No CSV data to import or field mapping is incomplete");
      return;
    }

    const requiredFields: (keyof Student)[] = ["name", "gr_number", "department"];
    const mappedRequiredFields = fieldMapping
      .filter(mapping => requiredFields.includes(mapping.studentField as keyof Student))
      .map(mapping => mapping.studentField);

    if (mappedRequiredFields.length !== requiredFields.length) {
      toast.error(`Please map all required fields: ${requiredFields.join(", ")}`);
      return;
    }

    // Transform CSV data to student objects based on mapping
    const studentsToAdd = csvData.map(row => {
      const studentObj: Record<string, any> = {};
      
      fieldMapping.forEach(mapping => {
        if (mapping.studentField) {
          const value = row[mapping.csvHeader];
          
          // Handle type conversions
          if (mapping.studentField === "year" && value) {
            studentObj[mapping.studentField] = parseInt(value);
          } else if (mapping.studentField === "overall_percentage" && value) {
            studentObj[mapping.studentField] = parseFloat(value);
          } else {
            studentObj[mapping.studentField] = value || null;
          }
        }
      });
      
      return studentObj as Omit<Student, "id" | "created_at">;
    });

    batchAddStudentsMutation.mutate(studentsToAdd);
  };

  // Generate sample CSV
  const generateSampleCsv = () => {
    const sampleData = [
      {
        Name: "John Doe",
        GR_Number: "GR12345",
        Roll_Number: "1001",
        Year: "2023",
        Class: "Class A",
        Department: "Computer Science",
        Overall_Percentage: "85.5",
        Email: "john.doe@example.com",
        Parent_Name: "Jane Doe",
        Parent_Contact: "+1-123-456-7890"
      },
      {
        Name: "Jane Smith",
        GR_Number: "GR67890",
        Roll_Number: "1002",
        Year: "2023",
        Class: "Class B",
        Department: "Information Technology",
        Overall_Percentage: "92.3",
        Email: "jane.smith@example.com",
        Parent_Name: "John Smith",
        Parent_Contact: "+1-987-654-3210"
      }
    ];

    const csv = Papa.unparse(sampleData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'sampleStudents.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (isLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="container mx-auto px-4">
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
                <DialogDescription>
                  Upload a CSV file with student data and map the fields.
                </DialogDescription>
              </DialogHeader>
              
              {!csvFile ? (
                <div className="py-6">
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-12 text-center">
                    <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="mt-4 flex text-sm justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md bg-white font-medium text-primary hover:text-primary/80 focus-within:outline-none"
                      >
                        <span>Upload a CSV file</span>
                        <input
                          id="file-upload"
                          name="file-upload"
                          type="file"
                          className="sr-only"
                          accept=".csv"
                          ref={fileInputRef}
                          onChange={handleFileChange}
                        />
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 mt-2">
                      CSV should contain student information
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="text-sm font-medium">File: {csvFile.name}</p>
                      <p className="text-xs text-gray-500">
                        {csvData.length} records found
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setCsvFile(null);
                        setCsvData([]);
                        setCsvHeaders([]);
                        setFieldMapping([]);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                    >
                      Change File
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <h3 className="text-sm font-medium">Map CSV Fields to Student Data</h3>
                    <p className="text-xs text-gray-500">
                      Required fields: Name, GR Number, Department
                    </p>
                    
                    <div className="grid grid-cols-2 gap-4 max-h-64 overflow-y-auto p-2">
                      {fieldMapping.map((field, index) => (
                        <div key={index} className="flex items-center gap-2">
                          <div className="w-1/2">
                            <Label htmlFor={`csv-field-${index}`} className="text-xs">
                              CSV Column: {field.csvHeader}
                            </Label>
                          </div>
                          <div className="w-1/2">
                            <Select
                              value={field.studentField}
                              onValueChange={(value) => 
                                handleMappingChange(field.csvHeader, value as keyof Student | "")
                              }
                            >
                              <SelectTrigger id={`csv-field-${index}`}>
                                <SelectValue placeholder="Map to field" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="">-- Skip this field --</SelectItem>
                                <SelectItem value="name">Name *</SelectItem>
                                <SelectItem value="gr_number">GR Number *</SelectItem>
                                <SelectItem value="roll_number">Roll Number</SelectItem>
                                <SelectItem value="year">Year</SelectItem>
                                <SelectItem value="class">Class</SelectItem>
                                <SelectItem value="department">Department *</SelectItem>
                                <SelectItem value="overall_percentage">Overall Percentage</SelectItem>
                                <SelectItem value="email">Email</SelectItem>
                                <SelectItem value="parent_name">Parent Name</SelectItem>
                                <SelectItem value="parent_contact">Parent Contact</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  
                  {csvPreview.length > 0 && (
                    <div className="space-y-2">
                      <h3 className="text-sm font-medium">Preview (First 5 rows)</h3>
                      <div className="border rounded-md overflow-x-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              {csvHeaders.map((header, index) => (
                                <TableHead key={index}>{header}</TableHead>
                              ))}
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {csvPreview.map((row, rowIndex) => (
                              <TableRow key={rowIndex}>
                                {csvHeaders.map((header, cellIndex) => (
                                  <TableCell key={cellIndex}>
                                    {row[header]}
                                  </TableCell>
                                ))}
                              </TableRow>
                            ))}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  )}
                  
                  <div className="flex justify-end space-x-2">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setIsCsvDialogOpen(false)}
                    >
                      Cancel
                    </Button>
                    <Button 
                      type="button"
                      onClick={handleImportCsv}
                      disabled={!csvFile || !csvData.length}
                    >
                      Import Students
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>
          
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button onClick={handleOpenAddStudent}>
                <Plus className="w-4 h-4 mr-2" />
                Add Student
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>
                  {editingStudent ? "Edit Student" : "Add New Student"}
                </DialogTitle>
              </DialogHeader>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name *</Label>
                    <Input
                      id="name"
                      name="name"
                      required
                      defaultValue={editingStudent?.name || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="gr_number">GR Number *</Label>
                    <Input
                      id="gr_number"
                      name="gr_number"
                      required
                      defaultValue={editingStudent?.gr_number || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="roll_number">Roll Number</Label>
                    <Input
                      id="roll_number"
                      name="roll_number"
                      defaultValue={editingStudent?.roll_number || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="year">Year</Label>
                    <Select 
                      name="year" 
                      value={selectedYear} 
                      onValueChange={setSelectedYear}
                    >
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No year selected</SelectItem>
                        {years.map(year => (
                          <SelectItem key={year} value={year.toString()}>
                            {year}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class_id">Class</Label>
                    <Select
                      name="class_id"
                      defaultValue={editingStudent?.class_id || ""}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">No class assigned</SelectItem>
                        {filteredClasses?.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>
                            {cls.name} {cls.year ? `- Year ${cls.year}` : ""}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class">Class Section</Label>
                    <Input
                      id="class"
                      name="class"
                      defaultValue={editingStudent?.class || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="department">Department *</Label>
                    <Select 
                      name="department" 
                      value={selectedDepartment} 
                      onValueChange={setSelectedDepartment} 
                      required
                    >
                      <SelectTrigger id="department">
                        <SelectValue placeholder="Select department" />
                      </SelectTrigger>
                      <SelectContent>
                        {departments.map(dept => (
                          <SelectItem key={dept} value={dept}>
                            {dept}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="overall_percentage">Overall Percentage</Label>
                    <Input
                      id="overall_percentage"
                      name="overall_percentage"
                      type="number"
                      step="0.01"
                      defaultValue={editingStudent?.overall_percentage || ""}
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      defaultValue={editingStudent?.email || ""}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="parent_name">Parent Name</Label>
                    <Input
                      id="parent_name"
                      name="parent_name"
                      defaultValue={editingStudent?.parent_name || ""}
                    />
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="parent_contact">Parent Contact</Label>
                    <Input
                      id="parent_contact"
                      name="parent_contact"
                      defaultValue={editingStudent?.parent_contact || ""}
                    />
                  </div>
                </div>
                <div className="flex justify-end space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      setIsAddDialogOpen(false);
                      setEditingStudent(null);
                    }}
                  >
                    Cancel
                  </Button>
                  <Button type="submit">
                    {editingStudent ? "Update" : "Add"} Student
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>GR Number</TableHead>
              <TableHead>Roll Number</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Class</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Overall %</TableHead>
              <TableHead>Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {students?.map((student) => (
              <TableRow key={student.id}>
                <TableCell
                  className="font-medium cursor-pointer hover:text-primary"
                  onClick={() => navigate(`/dashboard/students/${student.id}`)}
                >
                  {student.name}
                </TableCell>
                <TableCell>{student.gr_number}</TableCell>
                <TableCell>{student.roll_number}</TableCell>
                <TableCell>{student.year}</TableCell>
                <TableCell>
                  {student.classes?.name || student.class || "-"}
                </TableCell>
                <TableCell>{student.department}</TableCell>
                <TableCell>{student.overall_percentage}%</TableCell>
                <TableCell>
                  <div className="flex space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEditStudent(student)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm("Are you sure you want to delete this student?")) {
                          deleteStudentMutation.mutate(student.id);
                        }
                      }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
