
import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useTestFormData } from "@/hooks/useTestFormData";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import AssessmentForm from "@/components/assessment/AssessmentForm";
import { toast } from "sonner";

const CreateAssessment = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { subjects } = useTestFormData();
  
  const [selectedSubject, setSelectedSubject] = useState<string>("");
  
  // Check if subject is provided in the URL
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const subjectParam = params.get('subject');
    
    if (subjectParam) {
      setSelectedSubject(subjectParam);
    }
  }, [location.search]);
  
  const handleSubjectChange = (value: string) => {
    setSelectedSubject(value);
  };
  
  const handleAssessmentCreated = (assessmentId: string) => {
    toast.success("Assessment created successfully");
    navigate(`/dashboard/assessments/detail/${assessmentId}`);
  };
  
  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-2 mb-6">
        <Button 
          variant="ghost" 
          size="icon" 
          onClick={() => navigate("/dashboard/assessments")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <h1 className="text-2xl font-bold">Create Assessment</h1>
      </div>
      
      {!selectedSubject ? (
        <Card>
          <CardHeader>
            <CardTitle>Select Subject</CardTitle>
            <CardDescription>
              Choose a subject for this assessment
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4">
              <Select onValueChange={handleSubjectChange}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select Subject" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              {subjects.length === 0 && (
                <p className="text-muted-foreground text-center mt-4">
                  No subjects found. Please create a subject first.
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      ) : (
        <AssessmentForm 
          subjectId={selectedSubject} 
          onSubmit={handleAssessmentCreated}
        />
      )}
    </div>
  );
};

export default CreateAssessment;
