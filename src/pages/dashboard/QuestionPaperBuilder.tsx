
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, Settings, List } from "lucide-react";

export default function QuestionPaperBuilder() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex flex-col space-y-2">
        <h1 className="text-3xl font-bold tracking-tight">Set Question Paper</h1>
        <p className="text-muted-foreground">
          Create custom question papers with detailed format control and question selection
        </p>
      </div>

      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full md:w-[400px] grid-cols-2">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="formats">Paper Formats</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="space-y-4 mt-6">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Create New Paper Format</CardTitle>
                <CardDescription>
                  Define a new structure for your question papers
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-28">
                  <Settings className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => navigate("/dashboard/question-paper-builder/create")}>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Format
                </Button>
              </CardFooter>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-lg font-medium">Browse Paper Formats</CardTitle>
                <CardDescription>
                  View and manage your saved paper formats
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center h-28">
                  <List className="h-12 w-12 text-muted-foreground" />
                </div>
              </CardContent>
              <CardFooter>
                <Button className="w-full" onClick={() => navigate("/dashboard/question-paper-builder/formats")}>
                  <List className="mr-2 h-4 w-4" />
                  View Formats
                </Button>
              </CardFooter>
            </Card>
          </div>
        </TabsContent>
        
        <TabsContent value="formats" className="space-y-4 mt-6">
          <div className="flex justify-end mb-4">
            <Button onClick={() => navigate("/dashboard/question-paper-builder/create")}>
              <Plus className="mr-2 h-4 w-4" />
              Create Format
            </Button>
          </div>
          
          <div className="bg-card rounded-lg border p-6 flex flex-col items-center justify-center h-48 text-center">
            <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
            <p className="text-muted-foreground">No paper formats created yet</p>
            <Button
              variant="link"
              className="mt-2"
              onClick={() => navigate("/dashboard/question-paper-builder/create")}
            >
              Create your first paper format
            </Button>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
