
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { useNavigate } from "react-router-dom";
import { FileText, Plus, History, ArrowRight } from "lucide-react";

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

      <Card className="border-2 border-primary/20 shadow-lg overflow-hidden">
        <CardHeader className="bg-primary/5 pb-4">
          <CardTitle className="text-xl font-bold">Create New Question Paper</CardTitle>
          <CardDescription>
            Start building a new question paper with sections, questions, and formatting
          </CardDescription>
        </CardHeader>
        <CardContent className="pt-6">
          <div className="flex flex-col md:flex-row gap-6">
            <div className="flex-1 space-y-4">
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium">1</div>
                <p className="font-medium">Add paper details (title, subject, duration)</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium">2</div>
                <p className="font-medium">Create sections with instructions</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium">3</div>
                <p className="font-medium">Add questions to each section</p>
              </div>
              <div className="flex items-center gap-3">
                <div className="bg-primary/10 rounded-full w-8 h-8 flex items-center justify-center text-primary font-medium">4</div>
                <p className="font-medium">Generate PDF and save your paper</p>
              </div>
            </div>
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <FileText className="h-24 w-24 mx-auto text-primary/40 mb-4" />
                <Button 
                  className="mt-4 gap-2" 
                  size="lg"
                  onClick={() => navigate("/dashboard/question-paper-builder/create")}
                >
                  Create Paper Now
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-between mt-8">
        <Button 
          variant="outline" 
          onClick={() => navigate("/dashboard/question-paper-builder/history")}
          className="px-5"
        >
          <History className="mr-2 h-4 w-4" />
          View Paper History
        </Button>
        <Button onClick={() => navigate("/dashboard/question-paper-builder/create")}>
          <Plus className="mr-2 h-4 w-4" />
          Create New Paper
        </Button>
      </div>
    </div>
  );
}
