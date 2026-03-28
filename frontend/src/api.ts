import axios from "axios";
import type { ZodType } from "zod";
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
  OptionalLevel,
  OptionalStream,
  VerbEntry,
  Expression,
  Level,
  UserLexeme,
  LexemeSource,
  LexemeKind,
  PaginatedResponse,
  UserLexemeImportResult,
} from "./types";
import type { components, paths } from "./api-schema";
import {
  paginatedUserLexemesSchema,
  profileInfoSchema,
  readingSchema,
  readingsSchema,
  testDetailSchema,
  testsSchema,
  userLexemeSchema,
} from "./runtimeSchemas";

import { getApiErrorMessage, getApiErrorStatus } from "./apiError";
import { publishApiError, publishOffline } from "./apiStatus";
import { error as logError } from "./logger";

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || `${window.location.origin}/api/`,
  withCredentials: true,
});

type FilterParams = { student_email?: string; stream?: Stream; level?: Level };
type FlexibleLexemeLevel = OptionalLevel;
type FlexibleLexemeLanguage = OptionalStream;

// OpenAPI response helpers for typing API calls.
type ApiPaths = paths;
type ApiPath = keyof ApiPaths;
type ApiMethod<Path extends ApiPath> = keyof ApiPaths[Path];
type SchemaComponents = components["schemas"];
type ApiContent<Content> = Content extends { "application/json": infer Json }
  ? Json
  : Content extends { "application/vnd.oai.openapi+json": infer Json }
    ? Json
    : Content extends Record<string, infer Any>
      ? Any
      : never;
type ApiResponse<Path extends ApiPath, Method extends ApiMethod<Path>> =
  ApiPaths[Path][Method] extends { responses: infer Responses }
    ? Responses[keyof Responses] extends { content: infer Content }
      ? ApiContent<Content>
      : never
    : never;

type SchemaTest = SchemaComponents["TestList"];
type SchemaTestDetail = SchemaComponents["TestDetail"];
type SchemaQuestion = SchemaComponents["Question"];
type SchemaOption = SchemaComponents["Option"];
type SchemaMaterial = SchemaComponents["Material"];
type SchemaHomework = SchemaComponents["Homework"];
type SchemaExercise = SchemaComponents["Exercise"];
type SchemaVerbEntry = SchemaComponents["VerbEntry"];
type SchemaExpression = SchemaComponents["Expression"];
type SchemaGlossaryTerm = SchemaComponents["GlossaryTerm"];
type SchemaUserLexeme = SchemaComponents["UserLexeme"];
type SchemaReading = SchemaComponents["Reading"];

const asStringArray = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];

const asQuestionType = (value: unknown): TestDetail["questions"][number]["question_type"] =>
  value === "fill" ? "fill" : "single";

const asQuestionMode = (value: unknown): Test["question_mode"] =>
  value === "fill" || value === "mixed" ? value : "single";

const asStream = (value: unknown): Stream =>
  value === "nynorsk" || value === "english" ? value : "bokmaal";

const asLevel = (value: unknown): Level =>
  value === "A2" || value === "B1" || value === "B2" ? value : "A1";

const asLexemeKind = (value: unknown): LexemeKind =>
  value === "sentence" ? "sentence" : "word";

const asLexemeSource = (value: unknown): LexemeSource =>
  value === "custom" ? "custom" : "glossary";

const normalizeOption = (option: SchemaOption): TestDetail["questions"][number]["options"][number] => ({
  id: option.id,
  text: option.text,
  order: option.order ?? 0,
});

const normalizeQuestion = (question: SchemaQuestion): TestDetail["questions"][number] => ({
  id: question.id,
  text: question.text,
  question_type: asQuestionType(question.question_type),
  order: question.order ?? 0,
  options: question.options.map(normalizeOption),
});

const normalizeTest = (test: SchemaTest): Test => ({
  id: test.id,
  title: test.title,
  slug: test.slug,
  description: test.description ?? "",
  level: asLevel(test.level),
  stream: asStream(test.stream),
  estimated_minutes: test.estimated_minutes ?? 0,
  question_count: test.question_count,
  question_mode: asQuestionMode(test.question_mode),
  is_restricted: test.is_restricted,
});

const normalizeTestDetail = (test: SchemaTestDetail): TestDetail => ({
  ...normalizeTest(test),
  questions: test.questions.map(normalizeQuestion),
});

const normalizeMaterial = (material: SchemaMaterial): Material => ({
  id: material.id,
  title: material.title,
  stream: asStream(material.stream),
  level: asLevel(material.level),
  material_type: material.material_type ?? "text",
  body: material.body ?? "",
  url: material.url ?? "",
  tags: asStringArray(material.tags),
  assigned_to_email: material.assigned_to_email ?? null,
});

const normalizeHomework = (homework: SchemaHomework): Homework => ({
  id: homework.id,
  title: homework.title,
  stream: asStream(homework.stream),
  level: asLevel(homework.level),
  due_date: homework.due_date ?? null,
  instructions: homework.instructions,
  attachments: asStringArray(homework.attachments),
  status: homework.status,
  assigned_to_email: homework.assigned_to_email ?? null,
  student_submission: homework.student_submission ?? "",
  feedback: homework.feedback ?? "",
});

const normalizeExercise = (exercise: SchemaExercise): Exercise => ({
  id: exercise.id,
  title: exercise.title,
  stream: asStream(exercise.stream),
  level: asLevel(exercise.level),
  kind: exercise.kind ?? "quiz",
  prompt: exercise.prompt ?? "",
  tags: asStringArray(exercise.tags),
  estimated_minutes: exercise.estimated_minutes ?? 0,
});

const normalizeVerbEntry = (entry: SchemaVerbEntry): VerbEntry => ({
  id: entry.id,
  verb: entry.verb,
  stream: asStream(entry.stream),
  part_of_speech: entry.part_of_speech ?? "",
  infinitive: entry.infinitive,
  present: entry.present,
  past: entry.past,
  perfect: entry.perfect,
  examples_infinitive: entry.examples_infinitive ?? "",
  examples_present: entry.examples_present ?? "",
  examples_past: entry.examples_past ?? "",
  examples_perfect: entry.examples_perfect ?? "",
  translation_en: entry.translation_en ?? "",
  translation_ru: entry.translation_ru ?? "",
  translation_nb: entry.translation_nb ?? "",
  tags: asStringArray(entry.tags),
});

const normalizeExpression = (expression: SchemaExpression): Expression => ({
  id: expression.id,
  phrase: expression.phrase,
  meaning_en: expression.meaning_en ?? "",
  meaning_nb: expression.meaning_nb ?? "",
  meaning_nn: expression.meaning_nn ?? "",
  meaning_ru: expression.meaning_ru ?? "",
  example: expression.example ?? "",
  stream: asStream(expression.stream),
  tags: asStringArray(expression.tags),
});

const normalizeGlossaryTerm = (term: SchemaGlossaryTerm): GlossaryTerm => ({
  id: term.id,
  term: term.term,
  translation: term.translation ?? "",
  translation_en: term.translation_en ?? "",
  translation_ru: term.translation_ru ?? "",
  translation_nn: term.translation_nn ?? "",
  translation_nb: term.translation_nb ?? "",
  explanation: term.explanation ?? "",
  stream: asStream(term.stream),
  level: asLevel(term.level),
  tags: asStringArray(term.tags),
});

const normalizeUserLexeme = (lexeme: SchemaUserLexeme): UserLexeme => ({
  id: lexeme.id,
  source: asLexemeSource(lexeme.source),
  kind: asLexemeKind(lexeme.kind),
  glossary_term: lexeme.glossary_term ?? null,
  concept_key: lexeme.concept_key ?? "",
  text: lexeme.text ?? "",
  translation_en: lexeme.translation_en ?? "",
  translation_ru: lexeme.translation_ru ?? "",
  translation_nb: lexeme.translation_nb ?? "",
  translation_nn: lexeme.translation_nn ?? "",
  example: lexeme.example ?? "",
  notes: lexeme.notes ?? "",
  tags: asStringArray(lexeme.tags),
  language: lexeme.language ?? "",
  level: lexeme.level ?? "",
  times_reviewed: lexeme.times_reviewed,
  times_correct: lexeme.times_correct,
  last_reviewed_at: lexeme.last_reviewed_at ?? null,
  is_archived: lexeme.is_archived ?? false,
  created_at: lexeme.created_at,
  updated_at: lexeme.updated_at,
});

const normalizeReading = (reading: SchemaReading): Reading => ({
  id: reading.id,
  title: reading.title,
  title_en: reading.title_en ?? "",
  title_nb: reading.title_nb ?? "",
  title_nn: reading.title_nn ?? "",
  title_ru: reading.title_ru ?? "",
  slug: reading.slug,
  stream: asStream(reading.stream),
  level: asLevel(reading.level),
  body: reading.body,
  translation_en: reading.translation_en ?? "",
  translation_nb: reading.translation_nb ?? "",
  translation_nn: reading.translation_nn ?? "",
  translation_ru: reading.translation_ru ?? "",
  tags: asStringArray(reading.tags),
  created_at: reading.created_at,
});

const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

const parseValidated = <T>(
  parser: ZodType<T>,
  data: unknown,
  label: string,
): T => {
  const result = parser.safeParse(data);
  if (result.success) {
    return result.data;
  }

  const issues = result.error.issues
    .slice(0, 3)
    .map((issue) => `${issue.path.join(".") || "<root>"}: ${issue.message}`)
    .join("; ");
  const message = `${label} validation failed${issues ? `: ${issues}` : ""}`;
  logError("API runtime validation failed", { label, issues: result.error.issues });
  throw new Error(message);
};

const isIdempotentMethod = (method?: string) => {
  const normalized = (method || "get").toLowerCase();
  return normalized === "get" || normalized === "head" || normalized === "options";
};

const shouldRetryError = (error: unknown) => {
  const status = getApiErrorStatus(error);
  if (typeof status === "number") return status === 429 || status >= 500;
  return true;
};

const publishErrorOnce = (
  error: unknown,
  method?: string,
  url?: string,
  retry?: () => Promise<unknown>,
  opts?: { silent?: boolean; silentStatuses?: number[]; reportAllErrors?: boolean },
) => {
  const status = getApiErrorStatus(error);
  if (opts?.silent) return;
  if (typeof status === "number" && opts?.silentStatuses?.includes(status)) return;
  if (!opts?.reportAllErrors) {
    if (typeof status === "number" && status >= 400 && status < 500 && status !== 429) return;
  }
  const message = getApiErrorMessage(error);
  if (typeof status !== "number") publishOffline(true);
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
  } catch (err: unknown) {
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
    } catch (err: unknown) {
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

const requestBlob = async (
  url: string,
  config?: RequestConfig,
): Promise<{ blob: Blob; filename: string }> => {
  try {
    const res = await api.get(url, { responseType: "blob", ...(config || {}) });
    publishOffline(false);
    const disposition = res.headers?.["content-disposition"] as string | undefined;
    let filename = "user-lexemes.csv";
    if (disposition) {
      const match = disposition.match(/filename=\"?([^\";]+)\"?/i);
      if (match?.[1]) {
        filename = match[1];
      }
    }
    return { blob: res.data, filename };
  } catch (err: unknown) {
    publishErrorOnce(err, "get", url, undefined, config);
    throw err;
  }
};

export const fetchTests = async (params?: FilterParams): Promise<Test[]> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/tests/", "get">>(
    "get",
    "tests/",
    undefined,
    { params },
  );
  return parseValidated(testsSchema, data.map(normalizeTest), "tests");
};

export const fetchTestDetail = async (
  slug: string,
  params?: FilterParams,
): Promise<TestDetail> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/tests/{slug}/", "get">>(
    "get",
    `tests/${slug}/`,
    undefined,
    { params },
  );
  return parseValidated(testDetailSchema, normalizeTestDetail(data), "test detail");
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
  const data = await requestJsonWithRetry<ProfileInfo>("get", "profile/me/", undefined, {
    silentStatuses: [401, 403],
  });
  return parseValidated(profileInfoSchema, data, "profile");
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
  const data = await requestJson<ProfileInfo>("post", "profile/update/", payload);
  return parseValidated(profileInfoSchema, data, "profile update");
};

export const registerProfile = async (payload: {
  email: string;
  password: string;
  name?: string;
}): Promise<ProfileInfo> => {
  const data = await requestJson<ProfileInfo>("post", "profile/register/", payload);
  return parseValidated(profileInfoSchema, data, "profile register");
};

export const loginProfile = async (payload: {
  identifier: string;
  password: string;
}): Promise<ProfileInfo> => {
  const data = await requestJson<ProfileInfo>("post", "profile/login/", payload);
  return parseValidated(profileInfoSchema, data, "profile login");
};

export const updateStreamLevel = async (payload: {
  email: string;
  stream?: Stream;
  level?: Level;
}): Promise<ProfileInfo> => {
  const data = await requestJson<ProfileInfo>("post", "profile/stream/", payload);
  return parseValidated(profileInfoSchema, data, "profile stream");
};

export const fetchProfileProgress = async (params: {
  email: string;
}): Promise<ProfileProgress> => {
  return requestJsonWithRetry<ProfileProgress>("get", "profile/progress/", undefined, { params });
};

export const fetchMaterials = async (params?: FilterParams): Promise<Material[]> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/materials/", "get">>(
    "get",
    "materials/",
    undefined,
    { params },
  );
  return data.map(normalizeMaterial);
};

export const fetchHomework = async (params?: FilterParams): Promise<Homework[]> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/homework/", "get">>(
    "get",
    "homework/",
    undefined,
    { params },
  );
  return data.map(normalizeHomework);
};

export const fetchExercises = async (params?: FilterParams): Promise<Exercise[]> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/exercises/", "get">>(
    "get",
    "exercises/",
    undefined,
    { params },
  );
  return data.map(normalizeExercise);
};

type VerbFilterParams = FilterParams & {
  part_of_speech?: string;
  tag?: string;
};

export const fetchVerbs = async (params?: VerbFilterParams): Promise<VerbEntry[]> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/verbs/", "get">>(
    "get",
    "verbs/",
    undefined,
    { params },
  );
  return data.map(normalizeVerbEntry);
};

export const fetchExpressions = async (params?: FilterParams): Promise<Expression[]> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/expressions/", "get">>(
    "get",
    "expressions/",
    undefined,
    { params },
  );
  return data.map(normalizeExpression);
};

export const fetchGlossary = async (params?: GlossarySearchParams): Promise<GlossaryTerm[]> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/glossary/", "get">>(
    "get",
    "glossary/",
    undefined,
    { params },
  );
  return data.map(normalizeGlossaryTerm);
};

type UserLexemeListParams = {
  source?: LexemeSource;
  kind?: LexemeKind;
  level?: FlexibleLexemeLevel;
  language?: FlexibleLexemeLanguage;
  q?: string;
  tag?: string;
  archived?: boolean;
  page?: number;
  page_size?: number;
};

export const fetchUserLexemes = async (
  params?: UserLexemeListParams,
): Promise<PaginatedResponse<UserLexeme>> => {
  const normalizedParams: Record<string, unknown> = { ...(params || {}) };
  if (typeof normalizedParams.archived === "boolean") {
    normalizedParams.archived = normalizedParams.archived ? "true" : "false";
  }
  const data = await requestJsonWithRetry<ApiResponse<"/api/user-lexemes/", "get">>(
    "get",
    "user-lexemes/",
    undefined,
    {
      params: normalizedParams,
      silentStatuses: [401, 403],
    },
  );
  if (Array.isArray(data)) {
    return {
      count: data.length,
      next: null,
      previous: null,
      results: data.map(normalizeUserLexeme),
    };
  }
  return parseValidated(
    paginatedUserLexemesSchema,
    {
      count: data.count,
      next: data.next ?? null,
      previous: data.previous ?? null,
      results: data.results.map(normalizeUserLexeme),
    },
    "user lexemes",
  );
};

export const reviewUserLexeme = async (id: number, correct: boolean): Promise<UserLexeme> => {
  const data = await requestJson<ApiResponse<"/api/user-lexemes/{id}/review/", "post">>(
    "post",
    `user-lexemes/${id}/review/`,
    { correct },
  );
  return parseValidated(userLexemeSchema, normalizeUserLexeme(data), "user lexeme review");
};

export const createUserLexeme = async (
  payload: Partial<UserLexeme> & {
    text?: string;
    translation_en?: string;
    translation_ru?: string;
    translation_nb?: string;
    translation_nn?: string;
    language?: FlexibleLexemeLanguage;
    level?: FlexibleLexemeLevel;
    tags?: string[];
    source?: LexemeSource;
    kind?: LexemeKind;
  },
): Promise<UserLexeme> => {
  const data = await requestJson<ApiResponse<"/api/user-lexemes/", "post">>(
    "post",
    "user-lexemes/",
    payload,
  );
  return parseValidated(userLexemeSchema, normalizeUserLexeme(data), "user lexeme create");
};

export const updateUserLexeme = async (id: number, payload: Partial<UserLexeme>): Promise<UserLexeme> => {
  const data = await requestJson<ApiResponse<"/api/user-lexemes/{id}/", "patch">>(
    "patch",
    `user-lexemes/${id}/`,
    payload,
  );
  return parseValidated(userLexemeSchema, normalizeUserLexeme(data), "user lexeme update");
};

export const deleteUserLexeme = async (id: number): Promise<void> => {
  await requestJson<void>("delete", `user-lexemes/${id}/`);
};

export const toggleUserLexeme = async (payload: {
  concept_key?: string;
  glossary_term?: number;
  glossary_id?: number;
  term_id?: number;
  translation_en?: string;
  translation_ru?: string;
  translation_nb?: string;
  translation_nn?: string;
  text?: string;
  language?: FlexibleLexemeLanguage;
  level?: FlexibleLexemeLevel;
  kind?: LexemeKind;
}): Promise<{ is_favorite: boolean; lexeme?: UserLexeme }> => {
  return requestJson("post", "user-lexemes/toggle_favorite/", payload);
};

export const exportUserLexemesCsv = async (
  params?: UserLexemeListParams,
): Promise<{ blob: Blob; filename: string }> => {
  return requestBlob("user-lexemes/export_csv/", { params });
};

export const importUserLexemesCsv = async (
  file: File,
  options?: { update?: boolean },
): Promise<UserLexemeImportResult> => {
  const formData = new FormData();
  formData.append("file", file);
  if (options?.update) {
    formData.append("update", "true");
  }
  return requestJson<UserLexemeImportResult>("post", "user-lexemes/import_csv/", formData);
};

export const fetchReadings = async (params?: FilterParams): Promise<Reading[]> => {
  const data = await requestJsonWithRetry<ApiResponse<"/api/readings/", "get">>(
    "get",
    "readings/",
    undefined,
    { params },
  );
  return parseValidated(readingsSchema, data.map(normalizeReading), "readings");
};

export const __testables = {
  normalizeGlossaryTerm,
  normalizeMaterial,
  normalizeQuestion,
  normalizeReading,
  normalizeTest,
  normalizeTestDetail,
  normalizeUserLexeme,
  parseValidated,
  profileInfoSchema,
  readingSchema,
  testDetailSchema,
  testsSchema,
  userLexemeSchema,
};
