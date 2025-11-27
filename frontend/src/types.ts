export type Level = "A1" | "A2" | "B1" | "B2";
export type Stream = "bokmaal" | "nynorsk" | "english";

export interface Test {
  id: number;
  title: string;
  slug: string;
  description: string;
  level: Level;
  stream: Stream;
  estimated_minutes: number;
  question_count: number;
  question_mode: "single" | "fill" | "mixed";
  is_restricted: boolean;
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
  review?: QuestionReview[];
}

export interface QuestionReview {
  question: number;
  order: number;
  text: string;
  question_type: Question["question_type"];
  selected_text: string | null;
  correct_answers: string[];
  is_correct: boolean;
  explanation: string;
}

export interface ProfileInfo {
  is_teacher: boolean;
  is_authenticated: boolean;
  username?: string;
  display_name?: string;
  stream?: Stream;
  level?: Level;
  allow_stream_change?: boolean;
}

export interface Material {
  id: number;
  title: string;
  stream: Stream;
  level: Level;
  material_type: "text" | "video" | "audio";
  body: string;
  url: string;
  tags: string[];
  assigned_to_email?: string | null;
}

export interface Homework {
  id: number;
  title: string;
  stream: Stream;
  level: Level;
  due_date?: string | null;
  instructions: string;
  attachments: string[];
  status: string;
  assigned_to_email?: string | null;
  student_submission?: string;
  feedback?: string;
}

export interface Exercise {
  id: number;
  title: string;
  stream: Stream;
  level: Level;
  kind: "quiz" | "dictation" | "flashcard";
  prompt: string;
  tags: string[];
  estimated_minutes: number;
}

export interface VerbEntry {
  id: number;
  verb: string;
  stream: Stream;
  infinitive: string;
  present: string;
  past: string;
  perfect: string;
  examples_infinitive: string;
  examples_present: string;
  examples_past: string;
  examples_perfect: string;
   translation_en: string;
   translation_ru: string;
   translation_nb: string;
  tags: string[];
}

export interface VerbTagOption {
  value: string;
  label: string;
}

export interface Expression {
  id: number;
  phrase: string;
  meaning: string;
  example: string;
  stream: Stream;
  tags: string[];
}

export interface GlossaryTerm {
  id: number;
  term: string;
  translation: string;
  explanation: string;
  stream: Stream;
  level: Level;
  tags: string[];
}
