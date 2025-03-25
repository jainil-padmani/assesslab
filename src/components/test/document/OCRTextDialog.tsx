
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface OCRTextDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string | null;
}

export function OCRTextDialog({ open, onOpenChange, title, text }: OCRTextDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <ScrollArea className="h-[60vh] w-full rounded-md border p-4 bg-muted/30 text-sm whitespace-pre-wrap">
          {text || "No text available"}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
