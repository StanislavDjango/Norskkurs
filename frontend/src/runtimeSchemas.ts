import { z } from "zod";

const levelSchema = z.enum(["A1", "A2", "B1", "B2"]);
const streamSchema = z.enum(["bokmaal", "nynorsk", "english"]);
const optionalLevelSchema = z.union([levelSchema, z.literal("")]);
const optionalStreamSchema = z.union([streamSchema, z.literal("")]);

export const profileInfoSchema = z.object({
  is_teacher: z.boolean(),
  is_authenticated: z.boolean(),
  username: z.string().optional(),
  display_name: z.string().optional(),
  stream: streamSchema.optional(),
  level: levelSchema.optional(),
  allow_stream_change: z.boolean().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
  middle_name: z.string().optional(),
  date_of_birth: z.string().nullable().optional(),
  learning_language: z.string().optional(),
  native_language: z.string().optional(),
  vocab_favorites: z.array(z.string()).optional(),
  expression_favorites: z.array(z.number()).optional(),
});

export const optionSchema = z.object({
  id: z.number(),
  text: z.string(),
  order: z.number(),
});

export const questionSchema = z.object({
  id: z.number(),
  text: z.string(),
  question_type: z.enum(["single", "fill"]),
  order: z.number(),
  options: z.array(optionSchema),
});

export const testSchema = z.object({
  id: z.number(),
  title: z.string(),
  slug: z.string(),
  description: z.string(),
  level: levelSchema,
  stream: streamSchema,
  estimated_minutes: z.number(),
  question_count: z.number(),
  question_mode: z.enum(["single", "fill", "mixed"]),
  is_restricted: z.boolean(),
});

export const testDetailSchema = testSchema.extend({
  questions: z.array(questionSchema),
});

export const userLexemeSchema = z.object({
  id: z.number(),
  source: z.enum(["glossary", "custom"]),
  kind: z.enum(["word", "sentence"]),
  glossary_term: z.number().nullable().optional(),
  concept_key: z.string(),
  text: z.string(),
  translation_en: z.string(),
  translation_ru: z.string(),
  translation_nb: z.string(),
  translation_nn: z.string(),
  example: z.string(),
  notes: z.string(),
  tags: z.array(z.string()),
  language: optionalStreamSchema,
  level: optionalLevelSchema,
  times_reviewed: z.number(),
  times_correct: z.number(),
  last_reviewed_at: z.string().nullable().optional(),
  is_archived: z.boolean(),
  created_at: z.string(),
  updated_at: z.string(),
});

export const paginatedUserLexemesSchema = z.object({
  count: z.number(),
  next: z.string().nullable(),
  previous: z.string().nullable(),
  results: z.array(userLexemeSchema),
});

export const readingSchema = z.object({
  id: z.number(),
  title: z.string(),
  title_en: z.string(),
  title_nb: z.string(),
  title_nn: z.string(),
  title_ru: z.string(),
  slug: z.string(),
  stream: streamSchema,
  level: levelSchema,
  body: z.string(),
  translation_en: z.string(),
  translation_nb: z.string(),
  translation_nn: z.string(),
  translation_ru: z.string(),
  tags: z.array(z.string()),
  created_at: z.string(),
});

export const testsSchema = z.array(testSchema);
export const readingsSchema = z.array(readingSchema);
