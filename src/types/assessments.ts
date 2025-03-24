
export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';
  options?: string[];
  correctAnswer?: string;
  points: number;
  questionOrder?: number;
  created_at?: string;
  updated_at?: string;
}

export interface AssessmentOptions {
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
}

export interface AssessmentRestrictions {
  requireAccessCode: boolean;
  accessCode: string | null;
  filterIpAddresses: boolean;
  allowedIpAddresses: string[] | null;
}

export interface Assessment {
  id: string;
  title: string;
  instructions: string;
  options: AssessmentOptions;
  restrictions: AssessmentRestrictions;
  assignTo: string[] | null;
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  status: 'draft' | 'published' | 'archived';
  created_at: string;
  updated_at: string;
}

export enum EvaluationStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}
