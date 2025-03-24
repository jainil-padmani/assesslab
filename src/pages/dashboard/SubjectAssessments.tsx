
import React from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { fetchSubjectAssessments } from "@/utils/assessment/assessmentManager";
import { ArrowLeft, Calendar, Clock, Link, Plus, QrCode, Users } from "lucide-react";
import { format } from "date-fns";

const SubjectAssessments = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  
  const { data: assessments, isLoading, error } = useQuery({
    queryKey: ["subject-assessments", subjectId],
    queryFn: () => fetchSubjectAssessments(subjectId as string),
    enabled: !!subjectId
  });
  
  // Also fetch the subject details
  const { data: subjectDetails } = useQuery({
    queryKey: ["subject-detail", subjectId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('subjects')
        .select('name, subject_code')
        .eq('id', subjectId)
        .single();
        
      if (error) throw error;
      return data;
    },
    enabled: !!subjectId
  });
  
  const handleCreateNew = () => {
    navigate(`/dashboard/assessments/create?subject=${subjectId}`);
  };
  
  const handleBackClick = () => {
    navigate("/dashboard/assessments");
  };
  
  const handleAssessmentClick = (assessmentId: string) => {
    navigate(`/dashboard/assessments/detail/${assessmentId}`);
  };
  
  // Format date function
  const formatDate = (dateString: string) => {
    if (!dateString) return "Not set";
    try {
      return format(new Date(dateString), "MMM dd, yyyy");
    } catch (e) {
      return "Invalid date";
    }
  };
  
  // Get assessment status badge
  const getStatusBadge = (status: string, dueDate?: string) => {
    const now = new Date();
    const due = dueDate ? new Date(dueDate) : null;
    
    if (status === "draft") {
      return <Badge variant="outline">Draft</Badge>;
    } else if (status === "published") {
      if (due && due < now) {
        return <Badge variant="secondary">Closed</Badge>;
      }
      return <Badge variant="default">Active</Badge>;
    } else {
      return <Badge variant="outline">{status}</Badge>;
    }
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex items-center mb-6">
          <Button variant="ghost" onClick={handleBackClick} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <h1 className="text-2xl font-bold">Loading Assessments...</h1>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="border shadow-sm">
              <CardHeader>
                <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-1/2"></div>
              </CardHeader>
              <CardContent>
                <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
                <div className="h-4 bg-gray-200 rounded w-2/3"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center">
            <Button variant="ghost" onClick={handleBackClick} className="mr-4">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <h1 className="text-2xl font-bold">Subject Assessments</h1>
          </div>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardHeader>
            <CardTitle className="text-red-600">Error Loading Assessments</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading the assessments. Please try again later.</p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" onClick={() => window.location.reload()}>
              Retry
            </Button>
          </CardFooter>
        </Card>
      </div>
    );
  }
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center">
          <Button variant="ghost" onClick={handleBackClick} className="mr-4">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold">{subjectDetails?.name} Assessments</h1>
            <p className="text-muted-foreground">{subjectDetails?.subject_code}</p>
          </div>
        </div>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Assessment
        </Button>
      </div>
      
      {assessments && assessments.length > 0 ? (
        <div className="space-y-4">
          {assessments.map((assessment) => (
            <Card 
              key={assessment.id} 
              className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => handleAssessmentClick(assessment.id)}
            >
              <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                  <CardTitle>{assessment.title}</CardTitle>
                  {getStatusBadge(assessment.status, assessment.due_date)}
                </div>
                <CardDescription>
                  {assessment.instructions ? (
                    assessment.instructions.substring(0, 100) + (assessment.instructions.length > 100 ? '...' : '')
                  ) : (
                    "No instructions provided"
                  )}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div className="flex items-center">
                    <Calendar className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>Due: {formatDate(assessment.due_date)}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {assessment.options?.time_limit_enabled 
                        ? `${assessment.options.time_limit_minutes} minutes` 
                        : "No time limit"}
                    </span>
                  </div>
                  <div className="flex items-center">
                    <Users className="h-4 w-4 mr-2 text-muted-foreground" />
                    <span>
                      {assessment.assign_to?.length 
                        ? `${assessment.assign_to.length} students assigned` 
                        : "Open to all"}
                    </span>
                  </div>
                </div>
              </CardContent>
              <CardFooter className="flex justify-between">
                <Button variant="outline" size="sm" className="flex items-center" onClick={(e) => {
                  e.stopPropagation();
                  // Open share dialog or copy link
                  navigator.clipboard.writeText(
                    `${window.location.origin}/dashboard/assessments/take/${assessment.id}`
                  );
                }}>
                  <Link className="h-4 w-4 mr-2" />
                  Copy Link
                </Button>
                <Button variant="outline" size="sm" className="flex items-center" onClick={(e) => {
                  e.stopPropagation();
                  // Show QR code
                }}>
                  <QrCode className="h-4 w-4 mr-2" />
                  QR Code
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <CardHeader>
            <CardTitle>No Assessments Found</CardTitle>
            <CardDescription>
              This subject doesn't have any assessments yet
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center py-6">
            <p className="mb-4">Create your first assessment to get started</p>
            <Button onClick={handleCreateNew}>
              <Plus className="mr-2 h-4 w-4" />
              Create Assessment
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default SubjectAssessments;
