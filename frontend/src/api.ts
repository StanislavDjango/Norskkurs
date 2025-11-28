import axios from "axios";
import type {
  AnswerPayload,
  Exercise,
  GlossaryTerm,
  GlossarySearchParams,
  Homework,
  Material,
  ProfileInfo,
  Reading,
  Stream,
  SubmissionResponse,
  Test,
  TestDetail,
  VerbEntry,
  Expression,
  Level,
} from "./types";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api/`,
  withCredentials: true,
});

type FilterParams = { student_email?: string; stream?: Stream; level?: Level };

export const fetchTests = async (params?: FilterParams): Promise<Test[]> => {
  const res = await api.get<Test[]>("tests/", { params });
  return res.data;
};

export const fetchTestDetail = async (
  slug: string,
  params?: FilterParams,
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

export const updateStreamLevel = async (payload: {
  email: string;
  stream?: Stream;
  level?: Level;
}): Promise<ProfileInfo> => {
  const res = await api.post<ProfileInfo>("profile/stream/", payload);
  return res.data;
};

export const fetchMaterials = async (params?: FilterParams): Promise<Material[]> => {
  const res = await api.get<Material[]>("materials/", { params });
  return res.data;
};

export const fetchHomework = async (params?: FilterParams): Promise<Homework[]> => {
  const res = await api.get<Homework[]>("homework/", { params });
  return res.data;
};

export const fetchExercises = async (params?: FilterParams): Promise<Exercise[]> => {
  const res = await api.get<Exercise[]>("exercises/", { params });
  return res.data;
};

export const fetchVerbs = async (params?: FilterParams): Promise<VerbEntry[]> => {
  const res = await api.get<VerbEntry[]>("verbs/", { params });
  return res.data;
};

export const fetchExpressions = async (params?: FilterParams): Promise<Expression[]> => {
  const res = await api.get<Expression[]>("expressions/", { params });
  return res.data;
};

export const fetchGlossary = async (params?: GlossarySearchParams): Promise<GlossaryTerm[]> => {
  const res = await api.get<GlossaryTerm[]>("glossary/", { params });
  return res.data;
};

export const fetchReadings = async (params?: FilterParams): Promise<Reading[]> => {
  const res = await api.get<Reading[]>("readings/", { params });
  return res.data;
};
