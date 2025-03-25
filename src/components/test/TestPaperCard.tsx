
import React from 'react';
import {
  Card,
  CardHeader,
  CardTitle,
  CardContent,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { DocumentSection } from './document/DocumentSection';
import { OCRTextDialog } from './document/OCRTextDialog';
import { TextEditorDialog } from './document/TextEditorDialog';
import { useOcrProcessing } from './document/useOcrProcessing';

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
  // Use the hook to manage OCR processing and text editing
  const ocr = useOcrProcessing({
    questionPaperUrl: file.question_paper_url,
    answerKeyUrl: file.answer_key_url
  });

  return (
    <>
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
          {/* Main content with responsive layout */}
          <div className="space-y-3">
            {/* Question Paper and Answer Key Side-by-Side on larger screens, stacked on mobile */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {/* Question Paper Section */}
              {file.question_paper_url && (
                <DocumentSection 
                  url={file.question_paper_url}
                  type="question"
                  hasOcrText={!!ocr.questionOcrText}
                  isLoadingOcr={ocr.loadingOcrQuestion}
                  onShowOcr={() => ocr.setShowOcrQuestionDialog(true)}
                  onStartEdit={ocr.startEditingQuestionText}
                  onProcessOcr={() => ocr.processOcr(file.question_paper_url, 'question')}
                />
              )}
              
              {/* Answer Key Section */}
              {file.answer_key_url && (
                <DocumentSection 
                  url={file.answer_key_url}
                  type="answer"
                  hasOcrText={!!ocr.answerOcrText}
                  isLoadingOcr={ocr.loadingOcrAnswer}
                  onShowOcr={() => ocr.setShowOcrAnswerDialog(true)}
                  onStartEdit={ocr.startEditingAnswerText}
                  onProcessOcr={() => ocr.processOcr(file.answer_key_url, 'answer')}
                />
              )}
            </div>
            
            {/* Handwritten Paper Section (Full Width) */}
            {file.handwritten_paper_url && (
              <DocumentSection 
                url={file.handwritten_paper_url} 
                type="handwritten"
                hasOcrText={false}
                isLoadingOcr={false}
                onShowOcr={() => {}}
                onStartEdit={() => {}}
                onProcessOcr={() => {}}
              />
            )}
          </div>
        </CardContent>
      </Card>

      {/* OCR Text Preview Dialog for Question Paper */}
      <OCRTextDialog 
        open={ocr.showOcrQuestionDialog}
        onOpenChange={ocr.setShowOcrQuestionDialog}
        title="Question Paper OCR Text"
        text={ocr.questionOcrText}
      />

      {/* OCR Text Preview Dialog for Answer Key */}
      <OCRTextDialog 
        open={ocr.showOcrAnswerDialog}
        onOpenChange={ocr.setShowOcrAnswerDialog}
        title="Answer Key OCR Text"
        text={ocr.answerOcrText}
      />

      {/* Text Entry Dialog for Question Paper */}
      <TextEditorDialog 
        open={ocr.editingQuestionText}
        onOpenChange={ocr.setEditingQuestionText}
        title="Enter Question Paper Text"
        text={ocr.newQuestionText}
        onTextChange={ocr.setNewQuestionText}
        onSave={ocr.handleSaveQuestionText}
        isSaving={ocr.savingQuestionText}
      />

      {/* Text Entry Dialog for Answer Key */}
      <TextEditorDialog 
        open={ocr.editingAnswerText}
        onOpenChange={ocr.setEditingAnswerText}
        title="Enter Answer Key Text"
        text={ocr.newAnswerText}
        onTextChange={ocr.setNewAnswerText}
        onSave={ocr.handleSaveAnswerText}
        isSaving={ocr.savingAnswerText}
      />
    </>
  );
}
