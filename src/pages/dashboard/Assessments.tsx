
import React from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Book, Plus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Subject } from "@/types/dashboard";
import { toast } from "sonner";

export default function Assessments() {
  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        throw new Error("You must be logged in to view subjects");
      }
      
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      
      if (error) {
        toast.error("Failed to load subjects");
        throw error;
      }
      
      return data as Subject[];
    }
  });

  if (isLoading) {
    return <div className="flex items-center justify-center h-64">Loading subjects...</div>;
  }

  return (
    <div className="container mx-auto">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold">Assessments</h1>
          <p className="text-gray-600 mt-2">Create and manage assessments for your subjects</p>
        </div>
        <Button asChild>
          <Link to="/dashboard/assessments/create">
            <Plus className="mr-2 h-4 w-4" /> Create Assessment
          </Link>
        </Button>
      </div>

      {subjects && subjects.length > 0 ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {subjects.map((subject) => (
            <Link key={subject.id} to={`/dashboard/assessments/subject/${subject.id}`}>
              <Card className="h-full hover:shadow-md transition-all cursor-pointer">
                <CardHeader className="pb-3">
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-md bg-primary/10 flex items-center justify-center">
                      <Book className="h-5 w-5 text-primary" />
                    </div>
                    <CardTitle className="text-xl">{subject.name}</CardTitle>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-gray-500">
                    Subject Code: {subject.subject_code}
                  </p>
                  <p className="text-sm text-gray-500">
                    Semester: {subject.semester}
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <p className="text-lg text-gray-500">No subjects found. Add subjects first to create assessments.</p>
          <Button asChild className="mt-4">
            <Link to="/dashboard/subjects">Manage Subjects</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
