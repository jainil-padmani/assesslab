import { useState, useEffect } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { SubjectSelector } from "@/components/file-management/SubjectSelector";
import { FileUploadWizard } from "@/components/file-management/FileUploadWizard";
import { SubjectDocumentList } from "@/components/file-management/SubjectDocumentList";
import { Subject } from "@/types/dashboard";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Folders, Upload, BookOpen } from "lucide-react";

export default function FileManagement() {
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [selectedSubject, setSelectedSubject] = useState<Subject | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"subjects" | "upload" | "documents">("subjects");

  useEffect(() => {
    async function fetchSubjects() {
      try {
        const { data, error } = await supabase
          .from("subjects")
          .select("*")
          .order("name");
        
        if (error) throw error;
        
        setSubjects(data as Subject[]);
      } catch (error: any) {
        toast.error(`Error fetching subjects: ${error.message}`);
      } finally {
        setIsLoading(false);
      }
    }

    fetchSubjects();
  }, []);

  const handleSelectSubject = (subject: Subject) => {
    setSelectedSubject(subject);
    setView("documents");
  };

  const handleUploadClick = () => {
    if (selectedSubject) {
      setView("upload");
    }
  };

  const handleBackToSubjects = () => {
    setSelectedSubject(null);
    setView("subjects");
  };

  const handleCloseUpload = () => {
    setView("documents");
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-4">
        <Card>
          <CardHeader>
            <div className="flex justify-between items-center">
              <div className="flex items-center gap-2">
                <Folders className="h-5 w-5 text-accent" />
                <CardTitle>File Management</CardTitle>
              </div>
              {selectedSubject && view === "documents" && (
                <div className="flex items-center gap-2">
                  <div className="text-sm text-muted-foreground">
                    Managing files for: <span className="font-semibold text-foreground">{selectedSubject.name}</span>
                  </div>
                  <button
                    onClick={handleUploadClick}
                    className="flex items-center gap-1 px-3 py-1.5 bg-accent text-accent-foreground text-sm rounded-md hover:bg-accent/90"
                  >
                    <Upload className="h-4 w-4" />
                    Upload New
                  </button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8">Loading...</div>
            ) : view === "subjects" ? (
              <div className="space-y-6">
                <Tabs defaultValue="all" className="w-full">
                  <TabsList className="grid w-full md:w-auto grid-cols-1 md:grid-cols-3">
                    <TabsTrigger value="all" className="flex items-center gap-2">
                      <BookOpen className="h-4 w-4" />
                      All Subjects
                    </TabsTrigger>
                    <TabsTrigger value="recent" className="flex items-center gap-2">
                      <Folders className="h-4 w-4" />
                      Recently Updated
                    </TabsTrigger>
                    <TabsTrigger value="incomplete" className="flex items-center gap-2">
                      <Upload className="h-4 w-4" />
                      Incomplete Uploads
                    </TabsTrigger>
                  </TabsList>
                  <TabsContent value="all" className="mt-6">
                    <SubjectSelector subjects={subjects} onSelectSubject={handleSelectSubject} />
                  </TabsContent>
                  <TabsContent value="recent" className="mt-6">
                    <SubjectSelector
                      subjects={subjects.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()).slice(0, 5)} 
                      onSelectSubject={handleSelectSubject}
                    />
                  </TabsContent>
                  <TabsContent value="incomplete" className="mt-6">
                    <div className="text-center py-8 text-muted-foreground">
                      <p>This section will show subjects with incomplete document uploads.</p>
                      <p className="text-sm">Feature coming soon.</p>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            ) : view === "upload" && selectedSubject ? (
              <FileUploadWizard subject={selectedSubject} onClose={handleCloseUpload} />
            ) : view === "documents" && selectedSubject ? (
              <SubjectDocumentList subject={selectedSubject} onBackClick={handleBackToSubjects} />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
