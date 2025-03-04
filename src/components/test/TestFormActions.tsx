
import React from "react";
import { Button } from "@/components/ui/button";
import { DialogFooter } from "@/components/ui/dialog";

interface TestFormActionsProps {
  isSubmitting: boolean;
}

export function TestFormActions({ isSubmitting }: TestFormActionsProps) {
  return (
    <DialogFooter>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Adding..." : "Add Test"}
      </Button>
    </DialogFooter>
  );
}
