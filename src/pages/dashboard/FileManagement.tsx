
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Plus, FolderOpen } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Subject } from "@/types/dashboard";
import { SubjectSelector } from "@/components/file-management/SubjectSelector";
import { FileUploadWizard } from "@/components/file-management/FileUploadWizard";

export default function FileManagement() {
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [showUploadWizard, setShowUploadWizard] = useState(false);

  // Fetch subjects
  const { data: subjects, isLoading } = useQuery({
    queryKey: ["subjects"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subjects")
        .select("*")
        .order("name");
      if (error) throw error;
      return data as Subject[];
    },
  });

  const handleStartUpload = (subject: Subject) => {
    setSelectedSubject(subject);
    setShowUploadWizard(true);
  };

  const handleCloseWizard = () => {
    setShowUploadWizard(false);
    setSelectedSubject(null);
  };

  if (isLoading) {
    return <div>Loading subjects...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">File Management</h1>
      </div>

      {showUploadWizard && selectedSubject ? (
        <FileUploadWizard subject={selectedSubject} onClose={handleCloseWizard} />
      ) : (
        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FolderOpen className="h-5 w-5 text-accent" />
                Subject Documents
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground mb-4">
                Select a subject to manage its documents or upload new files.
              </p>
              
              <SubjectSelector 
                subjects={subjects || []} 
                onSelectSubject={handleStartUpload} 
              />
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
