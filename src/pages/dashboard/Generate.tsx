import { useState, useEffect } from "react";
import DashboardLayout from "@/layouts/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { FileText, Settings, Upload, FileUp } from "lucide-react";

export default function Generate() {
  const [activeTab, setActiveTab] = useState("from-documents");
  const [documentContent, setDocumentContent] = useState("");
  const [prompt, setPrompt] = useState("");
  const [generatedContent, setGeneratedContent] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  const handleGenerateContent = async () => {
    setIsLoading(true);
    // Simulate API call
    await new Promise((resolve) => setTimeout(resolve, 1500));
    setGeneratedContent("This is the generated content based on your input.");
    setIsLoading(false);
  };

  return (
    <DashboardLayout>
      <div className="container mx-auto py-6 space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <FileText className="h-5 w-5 text-blue-600" />
              <CardTitle>Generate Content</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <Tabs defaultValue="from-documents" className="w-full">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-4">
                <TabsTrigger value="from-documents">
                  <FileText className="mr-2 h-4 w-4" />
                  From Documents
                </TabsTrigger>
                <TabsTrigger value="from-prompt">
                  <Settings className="mr-2 h-4 w-4" />
                  From Prompt
                </TabsTrigger>
                <TabsTrigger value="upload-file">
                  <Upload className="mr-2 h-4 w-4" />
                  Upload File
                </TabsTrigger>
                <TabsTrigger value="settings">
                  <FileUp className="mr-2 h-4 w-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
              <TabsContent value="from-documents" className="mt-6">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="document-content">Document Content</Label>
                    <Textarea
                      id="document-content"
                      placeholder="Enter document content here"
                      value={documentContent}
                      onChange={(e) => setDocumentContent(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button onClick={handleGenerateContent} disabled={isLoading}>
                      {isLoading ? "Generating..." : "Generate Content"}
                    </Button>
                  </div>
                  {generatedContent && (
                    <div>
                      <Label htmlFor="generated-content">Generated Content</Label>
                      <Textarea
                        id="generated-content"
                        readOnly
                        value={generatedContent}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="from-prompt" className="mt-6">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="prompt">Prompt</Label>
                    <Input
                      id="prompt"
                      placeholder="Enter your prompt here"
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                    />
                  </div>
                  <div>
                    <Button onClick={handleGenerateContent} disabled={isLoading}>
                      {isLoading ? "Generating..." : "Generate Content"}
                    </Button>
                  </div>
                  {generatedContent && (
                    <div>
                      <Label htmlFor="generated-content">Generated Content</Label>
                      <Textarea
                        id="generated-content"
                        readOnly
                        value={generatedContent}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="upload-file" className="mt-6">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="upload">Upload File</Label>
                    <Input type="file" id="upload" />
                  </div>
                  <div>
                    <Button onClick={handleGenerateContent} disabled={isLoading}>
                      {isLoading ? "Generating..." : "Generate Content"}
                    </Button>
                  </div>
                  {generatedContent && (
                    <div>
                      <Label htmlFor="generated-content">Generated Content</Label>
                      <Textarea
                        id="generated-content"
                        readOnly
                        value={generatedContent}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
              <TabsContent value="settings" className="mt-6">
                <div className="grid gap-4">
                  <div>
                    <Label htmlFor="settings">Settings</Label>
                    <Textarea id="settings" placeholder="Settings" />
                  </div>
                  <div>
                    <Button onClick={handleGenerateContent} disabled={isLoading}>
                      {isLoading ? "Generating..." : "Generate Content"}
                    </Button>
                  </div>
                  {generatedContent && (
                    <div>
                      <Label htmlFor="generated-content">Generated Content</Label>
                      <Textarea
                        id="generated-content"
                        readOnly
                        value={generatedContent}
                      />
                    </div>
                  )}
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}

function Label(props: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label
      htmlFor={props.htmlFor}
      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
    >
      {props.children}
    </label>
  );
}
