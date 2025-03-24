
export interface AssessmentOption {
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

export interface AssessmentRestriction {
  requireAccessCode: boolean;
  accessCode: string | null;
  filterIpAddresses: boolean;
  allowedIpAddresses: string[] | null;
}

export interface AssessmentQuestion {
  id: string;
  assessmentId: string;
  questionText: string;
  questionType: 'multiple_choice' | 'short_answer' | 'essay' | 'true_false';
  options: string[] | null;
  correctAnswer: string;
  points: number;
  questionOrder: number;
  createdAt: string;
}

export interface Assessment {
  id: string;
  title: string;
  instructions: string | null;
  options: AssessmentOption;
  restrictions: AssessmentRestriction;
  assignTo: string[] | null;
  dueDate: string | null;
  availableFrom: string | null;
  availableUntil: string | null;
  subjectId: string;
  createdBy: string;
  status: 'draft' | 'published' | 'archived';
  createdAt: string;
  questions?: AssessmentQuestion[];
}

export interface StudentAssessmentAnswer {
  questionId: string;
  answer: string;
  isCorrect?: boolean;
  points?: number;
}

export interface StudentAssessmentAttempt {
  id: string;
  assessmentId: string;
  studentId: string;
  answers: StudentAssessmentAnswer[];
  score: number;
  possibleScore: number;
  timeSpent: number;
  status: 'incomplete' | 'submitted' | 'graded';
  attemptNumber: number;
  submittedAt: string;
}
