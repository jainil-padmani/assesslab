
import React from 'react';
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, FileCheck, FileUp, Trash2 } from "lucide-react";

export type UploadedFile = {
  id: string;
  subject_id: string;
  subject_name: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: null | string;
  created_at: string;
  user_id: string | null;
}

interface FilesListProps {
  uploadedFiles: UploadedFile[];
  currentUserId: string | null;
  onDeleteFile: (file: UploadedFile) => void;
}

const FilesList: React.FC<FilesListProps> = ({ 
  uploadedFiles, 
  currentUserId, 
  onDeleteFile 
}) => {
  if (uploadedFiles.length === 0) {
    return (
      <p className="text-center text-muted-foreground py-8">
        No files uploaded yet
      </p>
    );
  }

  return (
    <div className="space-y-6">
      {uploadedFiles.map((file, index) => (
        <Card key={index} className="overflow-hidden">
          <CardHeader className="bg-muted/50 py-3">
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="text-base">{file.topic}</CardTitle>
                <CardDescription>{file.subject_name}</CardDescription>
              </div>
              <div className="flex space-x-2">
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => onDeleteFile(file)}
                  disabled={file.user_id !== currentUserId}
                >
                  <Trash2 className="h-4 w-4 mr-1" />
                  Delete
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <a 
                href={file.question_paper_url} 
                target="_blank" 
                rel="noopener noreferrer"
                className="flex items-center p-3 border rounded-md hover:bg-muted/50 transition-colors"
              >
                <FilePlus className="h-5 w-5 mr-2 text-primary" />
                <div>
                  <div className="text-sm font-medium">Question Paper</div>
                  <div className="text-xs text-muted-foreground">View document</div>
                </div>
              </a>
              
              {file.answer_key_url && (
                <a 
                  href={file.answer_key_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <FileCheck className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Answer Key</div>
                    <div className="text-xs text-muted-foreground">View document</div>
                  </div>
                </a>
              )}
              
              {file.handwritten_paper_url && (
                <a 
                  href={file.handwritten_paper_url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="flex items-center p-3 border rounded-md hover:bg-muted/50 transition-colors"
                >
                  <FileUp className="h-5 w-5 mr-2 text-primary" />
                  <div>
                    <div className="text-sm font-medium">Handwritten Paper</div>
                    <div className="text-xs text-muted-foreground">View document</div>
                  </div>
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default FilesList;
