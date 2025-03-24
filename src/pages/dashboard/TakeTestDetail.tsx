
import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Clock, ArrowLeft, Save } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { TestAnswer } from "@/types/tests";
import { createAssessment, updateAssessment } from "@/utils/assessment/assessmentManager";

export default function TakeTestDetail() {
  const { testId } = useParams<{ testId: string }>();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<string>("");
  const [showSubmitDialog, setShowSubmitDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number | null>(null);
  const [existingAnswer, setExistingAnswer] = useState<TestAnswer | null>(null);

  // Get test details
  const { data: test, isLoading } = useQuery({
    queryKey: ["test-detail", testId],
    queryFn: async () => {
      if (!testId) return null;
      
      const { data, error } = await supabase
        .from("tests")
        .select(`
          id, 
          name, 
          test_date, 
          max_marks, 
          subject_id,
          subjects(name, subject_code),
          classes(name)
        `)
        .eq("id", testId)
        .single();
      
      if (error) {
        toast.error("Failed to load test details");
        throw error;
      }
      
      return data;
    },
    enabled: !!testId,
  });

  // Check for existing test answer
  useQuery({
    queryKey: ["existing-answer", testId],
    queryFn: async () => {
      if (!testId) return null;
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const { data, error } = await supabase
        .from("test_answers")
        .select("*")
        .eq("student_id", user.id)
        .eq("test_id", testId)
        .maybeSingle();
      
      if (error) {
        console.error("Error fetching existing answer:", error);
        return null;
      }
      
      if (data) {
        setExistingAnswer(data);
        if (data.text_content) {
          setAnswers(data.text_content);
        }
      }
      
      return data;
    },
    enabled: !!testId,
  });

  // Submit answer
  const handleSubmit = async () => {
    if (!test || !testId) return;
    
    try {
      setIsSubmitting(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const assessmentData = {
        student_id: user.id,
        subject_id: test.subject_id,
        test_id: testId,
        text_content: answers
      };
      
      if (existingAnswer) {
        await updateAssessment(existingAnswer.id, assessmentData);
      } else {
        await createAssessment(assessmentData);
      }
      
      toast.success("Test submitted successfully");
      setShowSubmitDialog(false);
      navigate("/dashboard/take-test");
    } catch (error) {
      console.error("Error submitting test:", error);
      toast.error("Failed to submit test");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleSaveDraft = async () => {
    if (!test || !testId) return;
    
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
      
      const assessmentData = {
        student_id: user.id,
        subject_id: test.subject_id,
        test_id: testId,
        text_content: answers
      };
      
      if (existingAnswer) {
        await updateAssessment(existingAnswer.id, assessmentData);
      } else {
        await createAssessment(assessmentData);
        // Get the created answer to update existingAnswer state
        const { data } = await supabase
          .from("test_answers")
          .select("*")
          .eq("student_id", user.id)
          .eq("test_id", testId)
          .single();
          
        if (data) setExistingAnswer(data);
      }
      
      toast.success("Draft saved successfully");
    } catch (error) {
      console.error("Error saving draft:", error);
      toast.error("Failed to save draft");
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading test...</div>;
  }

  if (!test) {
    return <div className="text-center py-12">Test not found</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="mb-6">
        <Button variant="outline" onClick={() => navigate("/dashboard/take-test")}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back to Tests
        </Button>
      </div>

      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">{test.name}</h1>
          <div className="flex flex-wrap gap-2 mt-2">
            <p className="text-gray-600">Subject: {test.subjects?.name}</p>
            <span className="text-gray-400">•</span>
            <p className="text-gray-600">Class: {test.classes?.name}</p>
            <span className="text-gray-400">•</span>
            <p className="text-gray-600">Max Marks: {test.max_marks}</p>
          </div>
        </div>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleSaveDraft}>
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button onClick={() => setShowSubmitDialog(true)}>
            Submit Test
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Answer Sheet</CardTitle>
        </CardHeader>
        <CardContent>
          <Textarea
            placeholder="Type your answers here..."
            className="min-h-[400px]"
            value={answers}
            onChange={(e) => setAnswers(e.target.value)}
          />
        </CardContent>
      </Card>

      <Dialog open={showSubmitDialog} onOpenChange={setShowSubmitDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Test</DialogTitle>
            <DialogDescription>
              Are you sure you want to submit your test? You cannot change your answers after submission.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setShowSubmitDialog(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button 
              onClick={handleSubmit}
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting..." : "Submit Test"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
