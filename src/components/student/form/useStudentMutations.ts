
import { Student } from "@/types/dashboard";
import { useCreateStudent } from "./mutations/useCreateStudent";
import { useUpdateStudent } from "./mutations/useUpdateStudent";
import { useDeleteStudent } from "./mutations/useDeleteStudent";

export type StudentUpdateData = Omit<Partial<Student>, 'created_at'> & { id: string };

export const useStudentMutations = () => {
  const { isLoading: isCreating, createStudentMutation } = useCreateStudent();
  const { isLoading: isUpdating, updateStudentMutation } = useUpdateStudent();
  const deleteStudent = useDeleteStudent();
  const isDeleting = deleteStudent.isPending;

  const isLoading = isCreating || isUpdating || isDeleting;

  return {
    isLoading,
    createStudentMutation,
    updateStudentMutation,
    deleteStudentMutation: deleteStudent.mutate,
  };
};

export default useStudentMutations;
