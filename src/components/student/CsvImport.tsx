
import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Student } from "@/types/dashboard";
import { Button } from "@/components/ui/button";
import { UploadCloud } from "lucide-react";
import { toast } from "sonner";
import Papa from 'papaparse';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Label } from "@/components/ui/label";

interface CsvImportProps {
  onClose: () => void;
}

interface CsvMappingField {
  csvHeader: string;
  studentField: keyof Student | "";
}

export default function CsvImport({ onClose }: CsvImportProps) {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvData, setCsvData] = useState<any[]>([]);
  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [fieldMapping, setFieldMapping] = useState<CsvMappingField[]>([]);
  const [csvPreview, setCsvPreview] = useState<any[]>([]);
  const [importing, setImporting] = useState(false);

  const checkDuplicateGRNumbers = async (grNumbers: string[]): Promise<string[]> => {
    if (!grNumbers.length) return [];
    
    // Get current user
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("User not authenticated");
    
    const { data, error } = await supabase
      .from("students")
      .select("gr_number")
      .in("gr_number", grNumbers)
      .eq("user_id", user.id);
      
    if (error) {
      console.error("Error checking duplicate GR numbers:", error);
      return [];
    }
    
    return data.map(student => student.gr_number);
  };

  const batchAddStudentsMutation = useMutation({
    mutationFn: async (students: Omit<Student, "id" | "created_at" | "email" | "parent_name" | "parent_contact" | "class">[]) => {
      setImporting(true);
      try {
        const grNumbers = students.map(student => student.gr_number);
        const existingGRNumbers = await checkDuplicateGRNumbers(grNumbers);
        
        if (existingGRNumbers.length > 0) {
          throw new Error(`The following GR numbers already exist in your account: ${existingGRNumbers.join(", ")}`);
        }
        
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) throw new Error("User not authenticated");
        
        const studentsWithUserId = students.map(student => ({
          ...student,
          user_id: user.id
        }));
        
        const { data, error } = await supabase
          .from("students")
          .insert(studentsWithUserId)
          .select();
          
        if (error) throw error;
        return data;
      } finally {
        setImporting(false);
      }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["students"] });
      onClose();
      resetState();
      toast.success(`${data.length} students added successfully`);
    },
    onError: (error) => {
      toast.error("Failed to add students: " + error.message);
    },
  });

  const resetState = () => {
    setCsvFile(null);
    setCsvData([]);
    setCsvHeaders([]);
    setFieldMapping([]);
    setCsvPreview([]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const autoMapFields = (headers: string[]): CsvMappingField[] => {
    return headers.map(header => {
      const lowerHeader = header.toLowerCase();
      
      if (lowerHeader.includes('name')) {
        return { csvHeader: header, studentField: "name" };
      } else if (lowerHeader.includes('gr') || lowerHeader === 'gr_number') {
        return { csvHeader: header, studentField: "gr_number" };
      } else if (lowerHeader.includes('roll') || lowerHeader === 'roll_number') {
        return { csvHeader: header, studentField: "roll_number" };
      } else if (lowerHeader.includes('year')) {
        return { csvHeader: header, studentField: "year" };
      } else if (lowerHeader.includes('dept') || lowerHeader === 'department') {
        return { csvHeader: header, studentField: "department" };
      } else if (lowerHeader.includes('percentage') || lowerHeader === 'overall_percentage') {
        return { csvHeader: header, studentField: "overall_percentage" };
      } else {
        return { csvHeader: header, studentField: "" };
      }
    });
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
          
          const mappedFields = autoMapFields(headers);
          setFieldMapping(mappedFields);
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

    const studentsToAdd = csvData.map(row => {
      const studentObj: Record<string, any> = {};
      
      fieldMapping.forEach(mapping => {
        if (mapping.studentField) {
          const value = row[mapping.csvHeader];
          
          if (mapping.studentField === "year" && value) {
            studentObj[mapping.studentField] = parseInt(value);
          } else if (mapping.studentField === "overall_percentage" && value) {
            studentObj[mapping.studentField] = parseFloat(value);
          } else {
            studentObj[mapping.studentField] = value || null;
          }
        }
      });
      
      return studentObj as Omit<Student, "id" | "created_at" | "email" | "parent_name" | "parent_contact" | "class">;
    });

    batchAddStudentsMutation.mutate(studentsToAdd);
  };

  return (
    <div className="space-y-4">
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
              onClick={resetState}
            >
              Change File
            </Button>
          </div>
          
          <div className="space-y-2">
            <h3 className="text-sm font-medium">Map CSV Fields to Student Data</h3>
            <p className="text-xs text-gray-500 mb-2">
              Required fields: Name, GR Number, Department (Auto-mapped based on your CSV headers)
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
                        <SelectItem value="skip">-- Skip this field --</SelectItem>
                        <SelectItem value="name">Name *</SelectItem>
                        <SelectItem value="gr_number">GR Number *</SelectItem>
                        <SelectItem value="roll_number">Roll Number</SelectItem>
                        <SelectItem value="year">Year</SelectItem>
                        <SelectItem value="department">Department *</SelectItem>
                        <SelectItem value="overall_percentage">Overall Percentage</SelectItem>
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
              onClick={onClose}
            >
              Cancel
            </Button>
            <Button 
              type="button"
              onClick={handleImportCsv}
              disabled={!csvFile || !csvData.length || importing}
            >
              {importing ? "Importing..." : "Import Students"}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
