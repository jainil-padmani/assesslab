
import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { PenTool, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";

export default function TakeTest() {
  const { data: availableTests, isLoading } = useQuery({
    queryKey: ["available-tests"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to view tests");
      }
      
      const { data, error } = await supabase
        .from("tests")
        .select(`
          id, 
          name, 
          test_date, 
          max_marks,
          status,
          subjects(name, subject_code),
          classes(name)
        `)
        .order("test_date", { ascending: false });
      
      if (error) {
        toast.error("Failed to load available tests");
        throw error;
      }
      
      return data;
    }
  });

  const getStatusBadge = (status) => {
    if (!status || status === 'draft') {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-yellow-600 bg-yellow-50">
          <AlertCircle className="h-3 w-3" />
          Draft
        </Badge>
      );
    } else if (status === 'published') {
      return (
        <Badge variant="outline" className="flex items-center gap-1 text-green-600 bg-green-50">
          <CheckCircle className="h-3 w-3" />
          Published
        </Badge>
      );
    } else {
      return (
        <Badge variant="outline" className="flex items-center gap-1">
          {status}
        </Badge>
      );
    }
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading tests...</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Take Online Test</h1>
        <p className="text-gray-600 mt-2">
          Select a test to begin your assessment
        </p>
      </div>

      {availableTests && availableTests.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {availableTests.map((test) => (
            <Card key={test.id} className="hover:shadow-md transition-all">
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                      <PenTool className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{test.name}</CardTitle>
                  </div>
                  {getStatusBadge(test.status)}
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <p className="text-sm text-gray-500">Subject: {test.subjects?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Class: {test.classes?.name || 'N/A'}</p>
                    <p className="text-sm text-gray-500">Code: {test.subjects?.subject_code || 'N/A'}</p>
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center text-sm text-gray-500">
                      <Clock className="mr-1 h-4 w-4" />
                      <span>Max Marks: {test.max_marks}</span>
                    </div>
                  </div>
                  
                  <Separator />
                  
                  <Button asChild className="w-full" disabled={test.status !== 'published'}>
                    <Link to={`/dashboard/take-test/${test.id}`}>
                      {test.status === 'published' ? 'Start Test' : 'Not Available'}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="mx-auto h-24 w-24 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <PenTool className="h-12 w-12 text-primary" />
          </div>
          <h3 className="text-xl font-medium mb-2">No Tests Available</h3>
          <p className="text-gray-500 max-w-md mx-auto">
            There are currently no tests available for you to take. Please check back later or contact your instructor.
          </p>
        </div>
      )}
    </div>
  );
}
