
import React, { useState } from "react";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

interface ContentUploadProps {
  selectedSubject: string;
  contentUrl: string;
  setContentUrl: (url: string) => void;
  extractedContent: string;
  setExtractedContent: (content: string) => void;
}

export function ContentUpload({
  selectedSubject,
  contentUrl,
  setContentUrl,
  extractedContent,
  setExtractedContent,
}: ContentUploadProps) {
  const [contentFile, setContentFile] = useState<File | null>(null);
  const [isGenerating, setIsGenerating] = useState<boolean>(false);

  const handleFileUpload = async (file: File) => {
    if (!file) return;
    if (!selectedSubject) {
      toast.error("Please select a subject first");
      return;
    }
    
    const fileExt = file.name.split('.').pop();
    const fileName = `content_${selectedSubject}_${Date.now()}.${fileExt}`;
    const filePath = `${fileName}`;
    
    try {
      const { error: uploadError, data } = await supabase.storage
        .from('files')
        .upload(filePath, file);
      
      if (uploadError) {
        toast.error(`Error uploading file: ${uploadError.message}`);
        return;
      }
      
      const { data: urlData } = await supabase.storage
        .from('files')
        .getPublicUrl(filePath);
      
      const fileUrl = urlData.publicUrl;
      setContentUrl(fileUrl);
      
      setIsGenerating(true);
      toast.info("Extracting content from file...");
      
      try {
        const extractResponse = await supabase.functions.invoke('extract-text', {
          body: { fileUrl, fileName: file.name }
        });
        
        if (extractResponse.error) {
          toast.error(`Error extracting text: ${extractResponse.error.message}`);
          return;
        }
        
        setExtractedContent(extractResponse.data.text);
        toast.success("Content extracted successfully");
      } catch (error) {
        console.error("Error extracting content:", error);
        toast.error("Failed to extract content from file");
      } finally {
        setIsGenerating(false);
      }
      
      toast.success(`File uploaded successfully`);
    } catch (error) {
      console.error(`Error uploading file:`, error);
      toast.error(`Failed to upload file`);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Chapter Material</CardTitle>
        <CardDescription>Upload content to generate questions from</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="content-file">Content Material (PDF/DOCX/TXT)</Label>
          <div className="flex items-center gap-2 mt-1">
            <Input
              id="content-file"
              type="file"
              accept=".pdf,.docx,.doc,.txt"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  setContentFile(e.target.files[0]);
                }
              }}
            />
            <Button
              size="sm"
              onClick={() => contentFile && handleFileUpload(contentFile)}
              disabled={!contentFile || isGenerating}
            >
              <Upload className="h-4 w-4 mr-1" />
              {isGenerating ? "Uploading..." : "Upload"}
            </Button>
          </div>
        </div>

        {extractedContent && (
          <div>
            <Label htmlFor="extracted-content">Extracted Content</Label>
            <Textarea
              id="extracted-content"
              value={extractedContent}
              onChange={(e) => setExtractedContent(e.target.value)}
              className="h-48 mt-1"
              placeholder="Content extracted from file..."
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
