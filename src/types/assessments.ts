
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

// Adding the missing Assessment and AssessmentQuestion interfaces
export interface Assessment {
  id: string;
  title: string;
  instructions: string;
  options: {
    shuffleAnswers: boolean;
    timeLimit: {
      enabled: boolean;
      minutes: number;
    };
    allowMultipleAttempts: boolean;
    showResponses: boolean;
    showResponsesOnlyOnce: boolean;
    showCorrectAnswers: boolean;
    showCorrectAnswersAt: string | null;
    hideCorrectAnswersAt: string | null;
    showOneQuestionAtTime: boolean;
  };
  restrictions: {
    requireAccessCode: boolean;
    accessCode: string | null;
    filterIpAddresses: boolean;
    allowedIpAddresses: string[] | null;
  };
  assignTo: string[] | null;
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';
  options: any[]; // Can be refined further if needed
  correctAnswer: string;
  points: number;
  questionOrder: number;
  created_at: string;
}
