export type Level = "A1" | "A2" | "B1" | "B2";

export interface Test {
  id: number;
  title: string;
  slug: string;
  description: string;
  level: Level;
  estimated_minutes: number;
  question_count: number;
}

export interface Option {
  id: number;
  text: string;
  order: number;
}

export interface Question {
  id: number;
  text: string;
  question_type: "single" | "fill";
  order: number;
  options: Option[];
}

export interface TestDetail extends Test {
  questions: Question[];
}

export interface AnswerPayload {
  question: number;
  selected_option?: number | null;
  text_response?: string | null;
}

export interface SubmissionSummary {
  score: number;
  total_questions: number;
  percent: number;
  correct: number;
  incorrect: number;
}

export interface SubmissionResponse {
  summary: SubmissionSummary;
  submission: {
    id: number;
    created_at: string;
    score: number;
    total_questions: number;
    percent: number;
  };
}
