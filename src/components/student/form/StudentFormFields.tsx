
import { useState } from "react";
import { Student } from "@/types/dashboard";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface StudentFormFieldsProps {
  student: Student | null;
  classes?: { id: string; name: string; department: string | null; year: number | null }[];
  isClassesLoading?: boolean;
  selectedYear: string;
  setSelectedYear: (year: string) => void;
  selectedDepartment: string;
  setSelectedDepartment: (department: string) => void;
}

export default function StudentFormFields({
  student,
  classes,
  isClassesLoading,
  selectedYear,
  setSelectedYear,
  selectedDepartment,
  setSelectedDepartment,
}: StudentFormFieldsProps) {
  // Generate years (from 2018 to current year + 4)
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: currentYear - 2018 + 5 }, (_, i) => 2018 + i);

  // Common departments
  const departments = ["Computer Science", "Information Technology", "Electronics", "Mechanical", "Civil", "Electrical", "Chemical", "Other"];

  // Filtered classes based on selected year
  const filteredClasses = selectedYear && classes
    ? classes.filter((cls) => cls.year === parseInt(selectedYear))
    : classes;

  return (
    <Tabs defaultValue="basic">
      <TabsList className="mb-4">
        <TabsTrigger value="basic">Basic Info</TabsTrigger>
        <TabsTrigger value="login">Login Credentials</TabsTrigger>
      </TabsList>
      
      <TabsContent value="basic">
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              name="name"
              required
              defaultValue={student?.name || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="gr_number">GR Number *</Label>
            <Input
              id="gr_number"
              name="gr_number"
              required
              defaultValue={student?.gr_number || ""}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="roll_number">Roll Number</Label>
            <Input
              id="roll_number"
              name="roll_number"
              defaultValue={student?.roll_number || ""}
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
              defaultValue={student?.class_id || undefined}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select a class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No class assigned</SelectItem>
                {filteredClasses?.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name} {cls.year ? `- Year ${cls.year}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
              defaultValue={student?.overall_percentage || ""}
            />
          </div>
        </div>
      </TabsContent>
      
      <TabsContent value="login">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="login_enabled" className="flex items-center space-x-2">
              <Checkbox 
                id="login_enabled" 
                name="login_enabled"
                defaultChecked={student?.login_enabled || false} 
              />
              <span>Enable login for this student</span>
            </Label>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="login_id">Login ID</Label>
            <div className="text-sm text-muted-foreground mb-1">
              By default, students will use their GR Number or Roll Number as login ID
            </div>
            <Select name="login_id_type" defaultValue={student?.login_id_type || "gr_number"}>
              <SelectTrigger>
                <SelectValue placeholder="Select login ID type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="gr_number">GR Number</SelectItem>
                <SelectItem value="roll_number">Roll Number</SelectItem>
                <SelectItem value="email">Email</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="student_email">Email</Label>
            <Input
              id="student_email"
              name="email"
              type="email"
              defaultValue={student?.email || ""}
              placeholder="Student's email address"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="student_password">Password</Label>
            <Input
              id="student_password"
              name="password"
              type="password"
              placeholder={student ? "Leave blank to keep current password" : "Set a password for the student"}
            />
            {student && (
              <div className="text-sm text-muted-foreground mt-1">
                Only enter a value if you want to change the student's password
              </div>
            )}
          </div>
        </div>
      </TabsContent>
    </Tabs>
  );
}
