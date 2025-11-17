import axios from "axios";
import type { AnswerPayload, SubmissionResponse, Test, TestDetail } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/",
});

export const fetchTests = async (): Promise<Test[]> => {
  const res = await api.get<Test[]>("tests/");
  return res.data;
};

export const fetchTestDetail = async (slug: string): Promise<TestDetail> => {
  const res = await api.get<TestDetail>(`tests/${slug}/`);
  return res.data;
};

export const submitTest = async (
  slug: string,
  answers: AnswerPayload[],
  profile: { name?: string; email?: string; locale?: string },
): Promise<SubmissionResponse> => {
  const res = await api.post<SubmissionResponse>(`tests/${slug}/submit/`, {
    answers,
    ...profile,
  });
  return res.data;
};
