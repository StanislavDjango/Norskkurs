import axios from "axios";
import type { AnswerPayload, ProfileInfo, SubmissionResponse, Test, TestDetail } from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "http://localhost:8001/api/",
  withCredentials: true,
});

export const fetchTests = async (params?: { student_email?: string }): Promise<Test[]> => {
  const res = await api.get<Test[]>("tests/", { params });
  return res.data;
};

export const fetchTestDetail = async (
  slug: string,
  params?: { student_email?: string },
): Promise<TestDetail> => {
  const res = await api.get<TestDetail>(`tests/${slug}/`, { params });
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

export const fetchProfile = async (): Promise<ProfileInfo> => {
  const res = await api.get<ProfileInfo>("profile/me/");
  return res.data;
};

export const logoutProfile = async (): Promise<void> => {
  await api.post("profile/logout/");
};
