
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, Link, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow 
} from "@/components/ui/table";
import { format } from "date-fns";
import { CalendarDays, ArrowLeft, Plus, FileEdit, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Test } from "@/types/tests";
import { Subject } from "@/types/dashboard";
import { toast } from "sonner";

export default function SubjectTests() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  const { data: subject, isLoading: isSubjectLoading } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      if (!subjectId) return null;
      
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId)
        .single();
      
      if (error) {
        toast.error("Failed to load subject details");
        throw error;
      }
      
      return data as Subject;
    }
  });

  const { data: tests, isLoading: isTestsLoading } = useQuery({
    queryKey: ["tests", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from("tests")
        .select("*")
        .eq("subject_id", subjectId)
        .order("test_date", { ascending: false });
      
      if (error) {
        toast.error("Failed to load tests");
        throw error;
      }
      
      return data as Test[];
    },
    enabled: !!subjectId
  });

  const isLoading = isSubjectLoading || isTestsLoading;

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>;
  }

  if (!subject) {
    return <div className="text-center py-12">Subject not found</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate('/dashboard/tests')}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Subjects
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{subject.name} Tests</h1>
          <p className="text-gray-600 mt-2">
            Subject Code: {subject.subject_code} | Semester: {subject.semester}
          </p>
        </div>
        <Button onClick={() => navigate('/dashboard/tests', { state: { openAddDialog: true, defaultSubjectId: subjectId } })}>
          <Plus className="mr-2 h-4 w-4" /> Add Test
        </Button>
      </div>

      {tests && tests.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>All Tests</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Max Marks</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map(test => (
                  <TableRow key={test.id}>
                    <TableCell className="font-medium">
                      <Link 
                        to={`/dashboard/tests/detail/${test.id}`}
                        className="text-primary hover:underline"
                      >
                        {test.name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <CalendarDays className="h-4 w-4 text-muted-foreground" />
                        {format(new Date(test.test_date), 'dd MMM yyyy')}
                      </div>
                    </TableCell>
                    <TableCell>{test.max_marks}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/dashboard/tests/detail/${test.id}`)}
                        >
                          <FileEdit className="h-4 w-4" />
                        </Button>
                        <Button 
                          variant="outline" 
                          size="sm"
                          className="text-destructive hover:bg-destructive/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      ) : (
        <div className="text-center py-12 bg-muted/20 rounded-lg">
          <p className="text-lg text-gray-500 mb-4">No tests found for this subject.</p>
          <Button onClick={() => navigate('/dashboard/tests', { state: { openAddDialog: true, defaultSubjectId: subjectId } })}>
            <Plus className="mr-2 h-4 w-4" /> Create First Test
          </Button>
        </div>
      )}
    </div>
  );
}
