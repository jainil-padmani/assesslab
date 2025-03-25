import React, { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FileText, Upload } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { uploadService } from "@/services/uploadService";
import type { Subject } from "@/types/dashboard";

interface SubjectInfoProps {
  subject: Subject;
  fetchSubjectData: () => Promise<void>;
}

export function SubjectInfo({ subject, fetchSubjectData }: SubjectInfoProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !subject.id) return;

    if (file.type !== 'application/pdf') {
      toast.error('Please upload a PDF file');
      return;
    }

    setIsUploading(true);
    try {
      const publicUrl = await uploadService.uploadFile(file, 'subjectFile');
      
      const { error: updateError } = await supabase
        .from('subjects')
        .update({ information_pdf_url: publicUrl })
        .eq('id', subject.id);

      if (updateError) throw updateError;

      toast.success('PDF uploaded successfully');
      fetchSubjectData();
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(error.message || 'Failed to upload PDF');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Subject Information</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="space-y-2">
            <p><strong>Subject Code:</strong> {subject.subject_code}</p>
            <p><strong>Semester:</strong> {subject.semester}</p>
          </div>
          
          <div className="space-y-2">
            <p className="text-sm font-medium">Subject Information PDF</p>
            {subject.information_pdf_url ? (
              <div className="flex items-center gap-2">
                <a 
                  href={subject.information_pdf_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 text-blue-600 hover:text-blue-800"
                >
                  <FileText className="h-4 w-4" />
                  View PDF
                </a>
              </div>
            ) : (
              <p className="text-sm text-gray-500">No PDF uploaded</p>
            )}
            
            <div className="mt-2">
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={handleFileUpload}
                className="hidden"
                id="pdf-upload"
                disabled={isUploading}
              />
              <label htmlFor="pdf-upload">
                <Button 
                  variant="outline" 
                  className="cursor-pointer" 
                  disabled={isUploading}
                  asChild
                >
                  <span>
                    <Upload className="h-4 w-4 mr-2" />
                    {isUploading ? 'Uploading...' : subject.information_pdf_url ? 'Change PDF' : 'Upload PDF'}
                  </span>
                </Button>
              </label>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
