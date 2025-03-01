
import { useState } from "react";
import { 
  Card, 
  CardContent,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { 
  Table, 
  TableHeader, 
  TableRow, 
  TableHead, 
  TableBody, 
  TableCell 
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { FileText, Upload, FolderOpen } from "lucide-react";
import { Subject } from "@/types/dashboard";

interface SubjectSelectorProps {
  subjects: Subject[];
  onSelectSubject: (subject: Subject) => void;
}

export function SubjectSelector({ subjects, onSelectSubject }: SubjectSelectorProps) {
  if (subjects.length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-muted-foreground mb-4">No subjects found. Please add subjects first.</p>
        <Button variant="outline" onClick={() => window.location.href = "/dashboard/subjects"}>
          <Plus className="mr-2 h-4 w-4" />
          Add Subjects
        </Button>
      </div>
    );
  }

  return (
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
        {subjects.map((subject) => (
          <TableRow key={subject.id}>
            <TableCell className="font-medium">{subject.name}</TableCell>
            <TableCell>{subject.subject_code}</TableCell>
            <TableCell>{subject.semester}</TableCell>
            <TableCell>
              <Button
                variant="outline"
                size="sm"
                onClick={() => onSelectSubject(subject)}
              >
                <Upload className="mr-2 h-4 w-4" />
                Manage Files
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
