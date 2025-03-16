
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, History } from "lucide-react";

export default function QuestionPaperBuilder() {
  const navigate = useNavigate();

  return (
    <div className="container mx-auto py-6 space-y-8">
      <div className="flex justify-between items-center">
        <div className="flex flex-col space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Set Question Paper</h1>
          <p className="text-muted-foreground">
            Create custom question papers with detailed format control and question selection
          </p>
        </div>
        <Button 
          onClick={() => navigate("/dashboard/question-paper-builder/history")}
          variant="outline"
        >
          <History className="mr-2 h-4 w-4" />
          Paper History
        </Button>
      </div>

      <div className="space-y-4 mt-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Create New Paper</CardTitle>
              <CardDescription>
                Create a new question paper with questions from your bank
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-28">
                <FileText className="h-12 w-12 text-muted-foreground" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => navigate("/dashboard/question-paper-builder/create")}>
                <Plus className="mr-2 h-4 w-4" />
                Create Paper
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-lg font-medium">Paper History</CardTitle>
              <CardDescription>
                View and manage your saved question papers
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-center h-28">
                <History className="h-12 w-12 text-muted-foreground" />
              </div>
            </CardContent>
            <CardFooter>
              <Button className="w-full" onClick={() => navigate("/dashboard/question-paper-builder/history")}>
                <History className="mr-2 h-4 w-4" />
                View History
              </Button>
            </CardFooter>
          </Card>
        </div>
        
        <div className="flex justify-end mb-4">
          <Button onClick={() => navigate("/dashboard/question-paper-builder/create")}>
            <Plus className="mr-2 h-4 w-4" />
            Create Paper
          </Button>
        </div>
        
        <div className="bg-card rounded-lg border p-6 flex flex-col items-center justify-center h-48 text-center">
          <FileText className="h-16 w-16 mb-4 text-muted-foreground" />
          <p className="text-muted-foreground">No question papers created yet</p>
          <Button
            variant="link"
            className="mt-2"
            onClick={() => navigate("/dashboard/question-paper-builder/create")}
          >
            Create your first question paper
          </Button>
        </div>
      </div>
    </div>
  );
}
