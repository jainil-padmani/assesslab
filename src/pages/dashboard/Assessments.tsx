
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { fetchSubjects } from "@/utils/assessment/assessmentManager";
import { Notebook, PenSquare, Plus } from "lucide-react";

const Assessments = () => {
  const navigate = useNavigate();
  
  const { data: subjects, isLoading, error } = useQuery({
    queryKey: ["subjects-for-assessments"],
    queryFn: fetchSubjects
  });
  
  const handleCreateNew = () => {
    navigate("/dashboard/assessments/create");
  };
  
  const handleSubjectClick = (subjectId: string) => {
    navigate(`/dashboard/assessments/subject/${subjectId}`);
  };
  
  if (isLoading) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Assessments</h1>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </div>
        <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3, 4, 5, 6].map((i) => (
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
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="container mx-auto p-4">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold">Assessments</h1>
          <Button onClick={handleCreateNew}>
            <Plus className="mr-2 h-4 w-4" />
            Create Assessment
          </Button>
        </div>
        <Card className="border-red-200 bg-red-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-red-600">Error Loading Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <p>There was a problem loading the subject list. Please try again later.</p>
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
        <h1 className="text-2xl font-bold">Assessments</h1>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Assessment
        </Button>
      </div>
      
      <Tabs defaultValue="all" className="w-full mb-6">
        <TabsList className="mb-4">
          <TabsTrigger value="all">All Subjects</TabsTrigger>
          <TabsTrigger value="recent">Recent Assessments</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all">
          <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
            {subjects && subjects.length > 0 ? (
              subjects.map((subject) => (
                <Card 
                  key={subject.id} 
                  className="border shadow-sm hover:shadow-md transition-shadow cursor-pointer"
                  onClick={() => handleSubjectClick(subject.id)}
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-lg">{subject.name}</CardTitle>
                      <Notebook className="h-5 w-5 text-muted-foreground" />
                    </div>
                    <CardDescription>{subject.subject_code}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground">
                      Click to view all assessments for this subject
                    </p>
                  </CardContent>
                  <CardFooter>
                    <Button variant="ghost" className="w-full" onClick={(e) => {
                      e.stopPropagation();
                      navigate(`/dashboard/assessments/create?subject=${subject.id}`);
                    }}>
                      <PenSquare className="h-4 w-4 mr-2" />
                      Create Assessment
                    </Button>
                  </CardFooter>
                </Card>
              ))
            ) : (
              <div className="col-span-3 text-center p-8">
                <p className="text-muted-foreground">No subjects found. Add subjects first to create assessments.</p>
                <Button variant="outline" className="mt-4" onClick={() => navigate("/dashboard/subjects")}>
                  Go to Subjects
                </Button>
              </div>
            )}
          </div>
        </TabsContent>
        
        <TabsContent value="recent">
          <Card>
            <CardHeader>
              <CardTitle>Recent Assessments</CardTitle>
              <CardDescription>
                View your recently created or modified assessments
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-center py-8">
                Recent assessments will appear here once you create them
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Assessments;
