
import React from 'react';
import { Button } from "@/components/ui/button";
import { Edit } from "lucide-react";

interface EditButtonProps {
  onClick: () => void;
}

export function EditButton({ onClick }: EditButtonProps) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
    >
      <Edit className="h-4 w-4 mr-1" />
      Enter Text
    </Button>
  );
}
