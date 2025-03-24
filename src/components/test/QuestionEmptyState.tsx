
import React from "react";
import { Button } from "@/components/ui/button";
import { List, PlusCircle } from "lucide-react";

interface QuestionEmptyStateProps {
  onAddClick: () => void;
}

export function QuestionEmptyState({ onAddClick }: QuestionEmptyStateProps) {
  return (
    <div className="text-center py-12">
      <List className="h-12 w-12 mx-auto text-gray-400 mb-4" />
      <h3 className="text-lg font-medium mb-2">No Questions Added</h3>
      <p className="text-gray-500 max-w-md mx-auto mb-4">
        This test doesn't have any questions yet. Add questions manually or select from generated questions.
      </p>
      <Button onClick={onAddClick}>
        <PlusCircle className="h-4 w-4 mr-1" />
        Add First Question
      </Button>
    </div>
  );
}
