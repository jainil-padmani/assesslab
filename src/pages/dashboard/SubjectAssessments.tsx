
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft, Plus } from "lucide-react";
import { fetchAssessmentsBySubject } from "@/utils/assessment/assessmentService";
import { Assessment } from "@/types/assessments";
import AssessmentsList from "@/components/assessment/AssessmentsList";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

const SubjectAssessments = () => {
  const { subjectId } = useParams<{ subjectId: string }>();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [assessments, setAssessments] = useState<Assessment[]>([]);
  const [subjectName, setSubjectName] = useState("");
  
  useEffect(() => {
    if (subjectId) {
      fetchSubjectDetails();
      fetchAssessments();
    }
  }, [subjectId]);
  
  const fetchSubjectDetails = async () => {
    try {
      const { data, error } = await supabase
        .from('subjects')
        .select('name')
        .eq('id', subjectId)
        .maybeSingle();
      
      if (error) throw error;
      
      if (data) {
        setSubjectName(data.name);
      }
    } catch (error) {
      console.error("Error fetching subject details:", error);
      toast.error("Failed to load subject details");
    }
  };
  
  const fetchAssessments = async () => {
    if (!subjectId) return;
    
    try {
      setLoading(true);
      const data = await fetchAssessmentsBySubject(subjectId);
      setAssessments(data);
    } catch (error) {
      console.error("Error fetching assessments:", error);
      toast.error("Failed to load assessments");
    } finally {
      setLoading(false);
    }
  };
  
  const handleCreateNew = () => {
    navigate(`/dashboard/assessments/create?subject=${subjectId}`);
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
        <h1 className="text-2xl font-bold">{subjectName || "Subject"} Assessments</h1>
      </div>
      
      <div className="flex justify-between items-center mb-6">
        <p className="text-muted-foreground">
          Manage all assessments for {subjectName}
        </p>
        <Button onClick={handleCreateNew}>
          <Plus className="mr-2 h-4 w-4" />
          Create Assessment
        </Button>
      </div>
      
      <AssessmentsList 
        assessments={assessments} 
        loading={loading} 
        onCreateNew={handleCreateNew}
        subjectId={subjectId}
      />
    </div>
  );
};

export default SubjectAssessments;
