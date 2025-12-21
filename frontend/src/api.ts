import axios from "axios";
import type {
  AnswerPayload,
  Exercise,
  GlossaryTerm,
  GlossarySearchParams,
  Homework,
  Material,
  ProfileInfo,
  ProfileProgress,
  Reading,
  Stream,
  SubmissionResponse,
  Test,
  TestDetail,
  VerbEntry,
  Expression,
  Level,
} from "./types";

import { publishApiError, publishOffline } from "./apiStatus";
import { error as logError } from "./logger";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api/`,
  withCredentials: true,
});

type FilterParams = { student_email?: string; stream?: Stream; level?: Level };

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const isIdempotentMethod = (method?: string) => {
  const normalized = (method || "get").toLowerCase();
  return normalized === "get" || normalized === "head" || normalized === "options";
};

const shouldRetryError = (error: any) => {
  const status = error?.response?.status;
  if (typeof status === "number") return status === 429 || status >= 500;
  return true;
};

const normalizeApiErrorMessage = (error: any): string => {
  const responseData = error?.response?.data;
  if (responseData) {
    if (typeof responseData === "string") return responseData;
    if (typeof responseData.detail === "string") return responseData.detail;
    if (typeof responseData.error === "string") return responseData.error;
  }
  if (error?.message) return String(error.message);
  return "API error";
};

const publishErrorOnce = (
  error: any,
  method?: string,
  url?: string,
  retry?: () => Promise<unknown>,
  opts?: { silent?: boolean; silentStatuses?: number[]; reportAllErrors?: boolean },
) => {
  const status = error?.response?.status;
  if (opts?.silent) return;
  if (typeof status === "number" && opts?.silentStatuses?.includes(status)) return;
  if (!opts?.reportAllErrors) {
    if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) return;
  }
  const message = normalizeApiErrorMessage(error);
  if (!error?.response) publishOffline(true);
  logError("API error", { method, url, status, message, error });
  publishApiError({
    at: Date.now(),
    message,
    status: typeof status === "number" ? status : undefined,
    method,
    url,
    retry,
  });
};

type RequestConfig = {
  params?: unknown;
  retries?: number;
  silent?: boolean;
  silentStatuses?: number[];
  reportAllErrors?: boolean;
};

const rawRequestJson = async <T>(
  method: string,
  url: string,
  payload?: unknown,
  config?: RequestConfig,
): Promise<T> => {
  const res =
    method.toLowerCase() === "get"
      ? await api.get<T>(url, config)
      : await api.request<T>({
          method,
          url,
          data: payload,
          ...(config?.params ? { params: config.params } : {}),
        });
  publishOffline(false);
  return res.data;
};

const requestJson = async <T>(
  method: string,
  url: string,
  payload?: unknown,
  config?: RequestConfig,
): Promise<T> => {
  try {
    return await rawRequestJson<T>(method, url, payload, config);
  } catch (err) {
    publishErrorOnce(
      err,
      method,
      url,
      isIdempotentMethod(method) ? () => requestJson<T>(method, url, payload, config) : undefined,
      config,
    );
    throw err;
  }
};

const requestJsonWithRetry = async <T>(
  method: string,
  url: string,
  payload?: unknown,
  config?: RequestConfig,
): Promise<T> => {
  const retries = Math.max(0, config?.retries ?? 2);
  const retryable = isIdempotentMethod(method);
  let attempt = 0;
  while (true) {
    try {
      return await rawRequestJson<T>(method, url, payload, config);
    } catch (err) {
      attempt += 1;
      if (!retryable || attempt > retries || !shouldRetryError(err)) {
        publishErrorOnce(
          err,
          method,
          url,
          retryable ? () => requestJsonWithRetry<T>(method, url, payload, config) : undefined,
          config,
        );
        throw err;
      }
      const backoff = 350 * Math.pow(2, attempt - 1) + Math.floor(Math.random() * 150);
      await sleep(backoff);
    }
  }
};

export const fetchTests = async (params?: FilterParams): Promise<Test[]> => {
  return requestJsonWithRetry<Test[]>("get", "tests/", undefined, { params });
};

export const fetchTestDetail = async (
  slug: string,
  params?: FilterParams,
): Promise<TestDetail> => {
  return requestJsonWithRetry<TestDetail>("get", `tests/${slug}/`, undefined, { params });
};

export const submitTest = async (
  slug: string,
  answers: AnswerPayload[],
  profile: { name?: string; email?: string; locale?: string },
): Promise<SubmissionResponse> => {
  return requestJson<SubmissionResponse>("post", `tests/${slug}/submit/`, {
    answers,
    ...profile,
  });
};

export const fetchProfile = async (): Promise<ProfileInfo> => {
  return requestJsonWithRetry<ProfileInfo>("get", "profile/me/", undefined, { silentStatuses: [401, 403] });
};

export const logoutProfile = async (): Promise<void> => {
  await requestJson<void>("post", "profile/logout/");
};

export const updateProfile = async (payload: {
  name?: string;
  first_name?: string;
  last_name?: string;
  middle_name?: string;
  date_of_birth?: string;
  learning_language?: string;
  native_language?: string;
  vocab_favorites?: string[];
  expression_favorites?: number[];
}): Promise<ProfileInfo> => {
  return requestJson<ProfileInfo>("post", "profile/update/", payload);
};

export const registerProfile = async (payload: {
  email: string;
  password: string;
  name?: string;
}): Promise<ProfileInfo> => {
  return requestJson<ProfileInfo>("post", "profile/register/", payload);
};

export const loginProfile = async (payload: {
  identifier: string;
  password: string;
}): Promise<ProfileInfo> => {
  return requestJson<ProfileInfo>("post", "profile/login/", payload);
};

export const updateStreamLevel = async (payload: {
  email: string;
  stream?: Stream;
  level?: Level;
}): Promise<ProfileInfo> => {
  return requestJson<ProfileInfo>("post", "profile/stream/", payload);
};

export const fetchProfileProgress = async (params: {
  email: string;
}): Promise<ProfileProgress> => {
  return requestJsonWithRetry<ProfileProgress>("get", "profile/progress/", undefined, { params });
};

export const fetchMaterials = async (params?: FilterParams): Promise<Material[]> => {
  return requestJsonWithRetry<Material[]>("get", "materials/", undefined, { params });
};

export const fetchHomework = async (params?: FilterParams): Promise<Homework[]> => {
  return requestJsonWithRetry<Homework[]>("get", "homework/", undefined, { params });
};

export const fetchExercises = async (params?: FilterParams): Promise<Exercise[]> => {
  return requestJsonWithRetry<Exercise[]>("get", "exercises/", undefined, { params });
};

type VerbFilterParams = FilterParams & {
  part_of_speech?: string;
  tag?: string;
};

export const fetchVerbs = async (params?: VerbFilterParams): Promise<VerbEntry[]> => {
  return requestJsonWithRetry<VerbEntry[]>("get", "verbs/", undefined, { params });
};

export const fetchExpressions = async (params?: FilterParams): Promise<Expression[]> => {
  return requestJsonWithRetry<Expression[]>("get", "expressions/", undefined, { params });
};

export const fetchGlossary = async (params?: GlossarySearchParams): Promise<GlossaryTerm[]> => {
  return requestJsonWithRetry<GlossaryTerm[]>("get", "glossary/", undefined, { params });
};

export const fetchReadings = async (params?: FilterParams): Promise<Reading[]> => {
  return requestJsonWithRetry<Reading[]>("get", "readings/", undefined, { params });
};
