
import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";

interface TextEditorDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  text: string;
  onTextChange: (text: string) => void;
  onSave: () => void;
  isSaving: boolean;
}

export function TextEditorDialog({
  open, 
  onOpenChange, 
  title,
  text,
  onTextChange,
  onSave,
  isSaving
}: TextEditorDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <Tabs defaultValue="edit" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="edit">Edit</TabsTrigger>
            <TabsTrigger value="preview">Preview</TabsTrigger>
          </TabsList>
          <TabsContent value="edit" className="mt-2">
            <Textarea 
              value={text} 
              onChange={(e) => onTextChange(e.target.value)}
              placeholder="Enter the text here..."
              className="h-[50vh] text-sm"
            />
          </TabsContent>
          <TabsContent value="preview" className="mt-2">
            <ScrollArea className="h-[50vh] w-full rounded-md border p-4 bg-muted/30 text-sm whitespace-pre-wrap">
              {text || "No preview available. Please enter some text."}
            </ScrollArea>
          </TabsContent>
        </Tabs>
        <DialogFooter>
          <Button
            variant="secondary"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={onSave}
            disabled={isSaving || !text.trim()}
          >
            {isSaving ? 'Saving...' : 'Save Text'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
