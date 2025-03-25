
import React from 'react';
import { Button } from "@/components/ui/button";
import { FileSearch, FileText } from "lucide-react";

interface OCRButtonProps {
  hasOcrText: boolean;
  isLoading: boolean;
  onClick: () => void;
}

export function OCRButton({ hasOcrText, isLoading, onClick }: OCRButtonProps) {
  if (hasOcrText) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={onClick}
      >
        <FileText className="h-4 w-4 mr-1" />
        OCR Text
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={isLoading}
    >
      <FileSearch className="h-4 w-4 mr-1" />
      {isLoading ? 'Processing...' : 'Extract Text'}
    </Button>
  );
}
