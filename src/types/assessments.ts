
export enum EvaluationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

export interface TestAnswerSheet {
  id: string;
  student_id: string;
  subject_id: string;
  test_id: string;
  answer_sheet_url?: string | null;
  text_content?: string | null;
  zip_url?: string | null;
  created_at: string;
}

export interface EvaluationAnswer {
  question_no: number;
  question: string;
  answer: string;
  score: [number, number]; // [assigned_score, total_score]
  remarks: string;
  confidence: number;
}

export interface EvaluationSummary {
  totalScore: [number, number]; // [assigned_score, total_score]
  percentage: number;
}

export interface EvaluationData {
  student_name: string;
  roll_no: string;
  class: string;
  subject: string;
  test_id: string;
  answers: EvaluationAnswer[];
  summary: EvaluationSummary;
  text?: string;
  isOcrProcessed?: boolean;
  zipProcessed?: boolean;
  zip_url?: string;
  answer_sheet_url?: string;
}

export interface PaperEvaluation {
  id: string;
  test_id: string;
  student_id: string;
  subject_id: string;
  evaluation_data: EvaluationData;
  status: EvaluationStatus;
  created_at: string;
  updated_at: string;
}
