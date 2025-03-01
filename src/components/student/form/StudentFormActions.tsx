
import { Button } from "@/components/ui/button";

interface StudentFormActionsProps {
  isEditing: boolean;
  onClose: () => void;
}

export default function StudentFormActions({ isEditing, onClose }: StudentFormActionsProps) {
  return (
    <div className="flex justify-end space-x-2">
      <Button
        type="button"
        variant="outline"
        onClick={onClose}
      >
        Cancel
      </Button>
      <Button type="submit">
        {isEditing ? "Update" : "Add"} Student
      </Button>
    </div>
  );
}
