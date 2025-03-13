
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { 
  Card, 
  CardHeader, 
  CardTitle, 
  CardDescription, 
  CardContent, 
  CardFooter 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sparkles, History, File, Save } from "lucide-react";

export default function PaperGeneration() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("create");

  const handleNavigation = (path: string) => {
    navigate(path);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-bold">Paper Generation</h1>
          <p className="text-muted-foreground">
            Generate, manage, and export question papers
          </p>
        </div>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-[400px]">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="create" onClick={() => handleNavigation("/dashboard/paper-generation/create")}>
              Create
            </TabsTrigger>
            <TabsTrigger value="history" onClick={() => handleNavigation("/dashboard/paper-generation/history")}>
              History
            </TabsTrigger>
            <TabsTrigger value="saved" onClick={() => handleNavigation("/dashboard/paper-generation/saved")}>
              Saved Questions
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Sparkles className="mr-2 h-5 w-5 text-blue-500" />
              Create Question Paper
            </CardTitle>
            <CardDescription>
              Generate question papers with AI using your subject's course outcomes
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Quickly create customized question papers with the power of AI. Set your parameters
              and generate questions that match your course outcomes.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/dashboard/paper-generation/create")} className="w-full">
              Create New Paper
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <History className="mr-2 h-5 w-5 text-purple-500" />
              Paper History
            </CardTitle>
            <CardDescription>
              Access and manage all your previously generated question papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Review, download and share all your generated papers. Organize them by subject,
              topic, and date for easy retrieval.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/dashboard/paper-generation/history")} variant="outline" className="w-full">
              View Paper History
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Save className="mr-2 h-5 w-5 text-green-500" />
              Saved Questions
            </CardTitle>
            <CardDescription>
              Access your saved question sets for future use
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Browse and reuse questions from your question bank. Combine saved questions 
              to create new papers with minimal effort.
            </p>
          </CardContent>
          <CardFooter>
            <Button onClick={() => navigate("/dashboard/paper-generation/saved")} variant="outline" className="w-full">
              View Saved Questions
            </Button>
          </CardFooter>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <File className="mr-2 h-5 w-5 text-amber-500" />
              Paper Templates
            </CardTitle>
            <CardDescription>
              Create and use templates for consistently formatted papers
            </CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm">
              Design and save paper templates with your institution's branding and preferred
              formatting for consistent, professional-looking papers.
            </p>
          </CardContent>
          <CardFooter>
            <Button variant="outline" className="w-full">
              Coming Soon
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
