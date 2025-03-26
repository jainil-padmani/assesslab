
// Define common types used across mappers
export interface TestFileMap {
  [key: string]: {
    id: string;
    test_id: string;
    topic: string;
    question_paper_url: string;
    answer_key_url?: string;
    handwritten_paper_url?: string | null;
    created_at: string;
  }
}

export interface SubjectFileMap {
  [key: string]: {
    id: string;
    subject_id: string;
    topic: string;
    question_paper_url?: string;
    answer_key_url?: string;
    handwritten_paper_url?: string | null;
    created_at: string;
  }
}
