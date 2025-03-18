
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Student } from "@/types/dashboard";

interface StudentInfoCardProps {
  student: Student & { classes?: { name: string } | null };
}

export function StudentInfoCard({ student }: StudentInfoCardProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Basic Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <p className="text-sm text-muted-foreground">GR Number</p>
            <p className="font-medium">{student.gr_number}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Roll Number</p>
            <p className="font-medium">{student.roll_number || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Year</p>
            <p className="font-medium">{student.year || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Class</p>
            <p className="font-medium">{student.classes?.name || student.class || "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Department</p>
            <p className="font-medium">{student.department}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Overall Percentage</p>
            <p className="font-medium">{student.overall_percentage ? `${student.overall_percentage}%` : "-"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Email</p>
            <p className="font-medium">{student.email || "-"}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
