
export interface UploadedFile {
  id: string;
  file_name: string;
  file_type: string;
  file_size: number;
  document_type: 'question_paper' | 'answer_key' | 'answer_sheet' | 'study_material';
  document_url: string;
  created_at: string;
  subject_id?: string;
  subject_name?: string;
}

export interface FileUploadState {
  files: File[];
  subjectId: string | null;
  topic: string;
}

export interface FilesListProps {
  uploadedFiles: UploadedFile[];
  currentUserId: string;
  onDeleteFile: (fileGroup: UploadedFile) => Promise<void>;
  viewMode: 'grid' | 'list';
}
