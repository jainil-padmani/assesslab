
import React from "react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Assessment } from "@/types/assessments";
import { formatDistanceToNow } from "date-fns";
import { Calendar, ClipboardList, Eye, PenSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

interface AssessmentsListProps {
  assessments: Assessment[];
  loading: boolean;
  onCreateNew?: (subjectId?: string) => void;
  subjectId?: string;
}

const AssessmentsList: React.FC<AssessmentsListProps> = ({ 
  assessments, 
  loading, 
  onCreateNew,
  subjectId
}) => {
  const navigate = useNavigate();
  
  if (loading) {
    return (
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3].map((i) => (
          <Card key={i} className="border shadow-sm animate-pulse">
            <CardHeader className="pb-2">
              <div className="h-6 bg-gray-200 rounded w-3/4 mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-1/2"></div>
            </CardHeader>
            <CardContent>
              <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
              <div className="h-4 bg-gray-200 rounded w-2/3"></div>
            </CardContent>
            <CardFooter>
              <div className="h-8 bg-gray-200 rounded w-full"></div>
            </CardFooter>
          </Card>
        ))}
      </div>
    );
  }
  
  if (assessments.length === 0) {
    return (
      <Card className="border shadow-sm">
        <CardHeader>
          <CardTitle>No Assessments</CardTitle>
          <CardDescription>There are no assessments for this subject yet</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            Create your first assessment to get started
          </p>
        </CardContent>
        <CardFooter>
          {onCreateNew && (
            <Button onClick={() => onCreateNew(subjectId)}>
              <PenSquare className="mr-2 h-4 w-4" />
              Create Assessment
            </Button>
          )}
        </CardFooter>
      </Card>
    );
  }
  
  // Helper function to determine badge variant based on status
  const getBadgeVariant = (status: string): "default" | "outline" | "secondary" => {
    switch (status) {
      case 'published':
        return 'secondary';
      case 'draft':
        return 'outline';
      case 'archived':
        return 'default';
      default:
        return 'secondary';
    }
  };
  
  return (
    <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {assessments.map((assessment) => (
        <Card 
          key={assessment.id} 
          className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
          onClick={() => navigate(`/dashboard/assessments/detail/${assessment.id}`)}
        >
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{assessment.title}</CardTitle>
              <Badge variant={getBadgeVariant(assessment.status)}>{assessment.status}</Badge>
            </div>
            <CardDescription className="flex items-center">
              <Calendar className="h-4 w-4 mr-1" />
              {assessment.createdAt ? (
                `Created ${formatDistanceToNow(new Date(assessment.createdAt), { addSuffix: true })}`
              ) : 'Recently created'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground line-clamp-2">
              {assessment.instructions || 'No instructions provided'}
            </p>
            {assessment.dueDate && (
              <p className="text-sm text-muted-foreground mt-2">
                Due {formatDistanceToNow(new Date(assessment.dueDate), { addSuffix: true })}
              </p>
            )}
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button 
              variant="ghost" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/assessments/take/${assessment.id}`);
              }}
            >
              <ClipboardList className="h-4 w-4 mr-2" />
              Take
            </Button>
            
            <Button 
              variant="outline" 
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                navigate(`/dashboard/assessments/detail/${assessment.id}`);
              }}
            >
              <Eye className="h-4 w-4 mr-2" />
              View
            </Button>
          </CardFooter>
        </Card>
      ))}
    </div>
  );
};

export default AssessmentsList;
