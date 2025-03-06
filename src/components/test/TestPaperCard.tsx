
import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FilePlus, FileCheck, FileUp, Trash2 } from "lucide-react";

interface TestFile {
  id: string;
  test_id: string;
  topic: string;
  question_paper_url: string;
  answer_key_url: string;
  handwritten_paper_url: string | null;
  created_at: string;
}

interface TestPaperCardProps {
  file: TestFile;
  onDelete: (file: TestFile) => void;
}

export function TestPaperCard({ file, onDelete }: TestPaperCardProps) {
  return (
    <Card className="overflow-hidden">
      <CardHeader className="bg-muted/50 py-3">
        <div className="flex justify-between items-center">
          <CardTitle className="text-base truncate" title={file.topic}>
            {file.topic}
          </CardTitle>
          <Button 
            variant="destructive" 
            size="sm" 
            onClick={() => onDelete(file)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-4">
        <div className="space-y-3">
          <a 
            href={file.question_paper_url} 
            target="_blank" 
            rel="noopener noreferrer"
            className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
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
              className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
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
              className="flex items-center p-2 border rounded-md hover:bg-muted/50 transition-colors"
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
  );
}
