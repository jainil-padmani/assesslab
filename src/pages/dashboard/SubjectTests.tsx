
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useParams, useNavigate, Link } from "react-router-dom";
import { format } from "date-fns";
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
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ArrowLeft, Plus, Calendar, Users } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Test } from "@/types/tests";
import { toast } from "sonner";
import { AddTestDialog } from "@/components/test/AddTestDialog";

export default function SubjectTests() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);

  const { data: subject } = useQuery({
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
      
      return data;
    },
    enabled: !!subjectId,
  });

  const { data: tests, isLoading } = useQuery({
    queryKey: ["subjectTests", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      const { data, error } = await supabase
        .from("tests")
        .select("*, classes(name)")
        .eq("subject_id", subjectId)
        .order("test_date", { ascending: false });
      
      if (error) {
        toast.error("Failed to load tests");
        throw error;
      }
      
      return data as (Test & { classes: { name: string } })[];
    },
    enabled: !!subjectId,
  });

  if (isLoading) {
    return <div className="container mx-auto mt-8">Loading...</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/dashboard/tests")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subjects
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {subject?.name} Tests
          </h1>
          <p className="text-gray-600 mt-2">
            Subject Code: {subject?.subject_code}
          </p>
        </div>
        <Button onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="mr-2 h-4 w-4" /> Add Test
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Tests</CardTitle>
          <CardDescription>
            Manage all tests for {subject?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {tests && tests.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Test Name</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Max Marks</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tests.map((test) => (
                  <TableRow
                    key={test.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/tests/detail/${test.id}`)}
                  >
                    <TableCell className="font-medium">{test.name}</TableCell>
                    <TableCell>{test.classes.name}</TableCell>
                    <TableCell>
                      {format(new Date(test.test_date), "dd MMM yyyy")}
                    </TableCell>
                    <TableCell>{test.max_marks}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No tests found for this subject</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => setIsAddDialogOpen(true)}
              >
                <Plus className="mr-2 h-4 w-4" /> Add First Test
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Add Test Dialog with pre-selected subject */}
      <AddTestDialog 
        open={isAddDialogOpen} 
        onOpenChange={setIsAddDialogOpen}
        defaultSubjectId={subjectId}
      />
    </div>
  );
}
