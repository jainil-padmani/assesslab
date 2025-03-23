
import React from "react";
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
import { ArrowLeft, Plus, Calendar, Users, QrCode } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Assessment } from "@/types/assessments";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";

export default function SubjectAssessments() {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();

  console.log("Current subjectId:", subjectId);

  const { data: subject, isLoading: isSubjectLoading } = useQuery({
    queryKey: ["subject", subjectId],
    queryFn: async () => {
      if (!subjectId) return null;
      
      console.log("Fetching subject details for:", subjectId);
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .eq("id", subjectId)
        .single();
      
      if (error) {
        console.error("Error fetching subject:", error);
        toast.error("Failed to load subject details");
        throw error;
      }
      
      console.log("Subject details:", data);
      return data;
    },
    enabled: !!subjectId,
  });

  const { data: assessments, isLoading: isAssessmentsLoading } = useQuery({
    queryKey: ["subjectAssessments", subjectId],
    queryFn: async () => {
      if (!subjectId) return [];
      
      console.log("Fetching assessments for subject:", subjectId);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to view assessments");
      }
      
      const { data, error } = await supabase
        .from("assessments")
        .select("*")
        .eq("subject_id", subjectId)
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      
      if (error) {
        console.error("Error fetching assessments:", error);
        toast.error("Failed to load assessments");
        throw error;
      }
      
      console.log("Assessments found:", data);
      return data as Assessment[];
    },
    enabled: !!subjectId,
  });

  if (isSubjectLoading || isAssessmentsLoading) {
    return <div className="container mx-auto mt-8">Loading...</div>;
  }

  if (!subject) {
    return (
      <div className="container mx-auto mt-8">
        <div className="text-center py-12">
          <h2 className="text-2xl font-bold mb-4">Subject Not Found</h2>
          <p className="mb-6">The subject you're looking for doesn't exist or you don't have access to it.</p>
          <Button onClick={() => navigate("/dashboard/assessments")}>
            Back to Subjects
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/dashboard/assessments")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Subjects
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">
            {subject?.name} Assessments
          </h1>
          <p className="text-gray-600 mt-2">
            Subject Code: {subject?.subject_code}
          </p>
        </div>
        <Button asChild>
          <Link to={`/dashboard/assessments/create/${subjectId}`}>
            <Plus className="mr-2 h-4 w-4" /> Create Assessment
          </Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Assessments</CardTitle>
          <CardDescription>
            Manage all assessments for {subject?.name}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {assessments && assessments.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead>Available From</TableHead>
                  <TableHead>Available Until</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {assessments.map((assessment) => (
                  <TableRow
                    key={assessment.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => navigate(`/dashboard/assessments/detail/${assessment.id}`)}
                  >
                    <TableCell className="font-medium">{assessment.title || "Untitled Assessment"}</TableCell>
                    <TableCell>
                      <Badge variant={assessment.status === 'published' ? 'success' : 'secondary'}>
                        {assessment.status === 'published' ? 'Published' : 'Draft'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {assessment.due_date 
                        ? format(new Date(assessment.due_date), "dd MMM yyyy") 
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {assessment.available_from 
                        ? format(new Date(assessment.available_from), "dd MMM yyyy") 
                        : "-"}
                    </TableCell>
                    <TableCell>
                      {assessment.available_until 
                        ? format(new Date(assessment.available_until), "dd MMM yyyy") 
                        : "-"}
                    </TableCell>
                    <TableCell className="text-right">
                      {assessment.status === 'published' && (
                        <Button 
                          variant="outline" 
                          size="icon"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/dashboard/assessments/detail/${assessment.id}?tab=share`);
                          }}
                        >
                          <QrCode className="h-4 w-4" />
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-8">
              <p className="text-gray-500">No assessments found for this subject</p>
              <Button
                variant="outline"
                className="mt-4"
                onClick={() => navigate(`/dashboard/assessments/create/${subjectId}`)}
              >
                <Plus className="mr-2 h-4 w-4" /> Create First Assessment
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
