
import { Button } from "@/components/ui/button";

interface StudentFormActionsProps {
  isEditing: boolean;
  onClose: () => void;
  isSubmitting?: boolean;
}

export default function StudentFormActions({ isEditing, onClose, isSubmitting }: StudentFormActionsProps) {
  return (
    <div className="flex justify-end space-x-2 pt-4">
      <Button type="button" variant="outline" onClick={onClose}>
        Cancel
      </Button>
      <Button type="submit" disabled={isSubmitting}>
        {isSubmitting ? "Saving..." : isEditing ? "Update Student" : "Add Student"}
      </Button>
    </div>
  );
}
