import type { ProfileInfo } from "../types";
import { normalizeVocabId } from "../utils/lexemes";
import type { ProfileDraft } from "./types";

export const initialProfileDraft: ProfileDraft = {
  name: "",
  email: "",
  firstName: "",
  lastName: "",
  middleName: "",
  dateOfBirth: "",
  learningLanguage: "",
  nativeLanguage: "",
};

export const mergeProfileDraftFromInfo = (
  prev: ProfileDraft,
  info: ProfileInfo,
): ProfileDraft => ({
  ...prev,
  name: prev.name || info.display_name || prev.name,
  firstName: info.first_name || prev.firstName,
  lastName: info.last_name || prev.lastName,
  middleName: info.middle_name || prev.middleName,
  dateOfBirth: info.date_of_birth || prev.dateOfBirth,
  learningLanguage: info.learning_language || prev.learningLanguage,
  nativeLanguage: info.native_language || prev.nativeLanguage,
});

export const mergeVocabFavorites = (
  prev: string[],
  values: unknown,
): string[] => {
  const incoming = Array.isArray(values) ? values : [];
  const existing = new Set(prev.map((value) => normalizeVocabId(value)));
  incoming
    .map((value) => normalizeVocabId(String(value)))
    .forEach((value) => existing.add(value));
  return Array.from(existing);
};

export const mergeExpressionFavorites = (
  prev: number[],
  values: unknown,
): number[] => {
  const incoming = Array.isArray(values) ? values : [];
  const existing = new Set(prev);
  incoming
    .map((value) => Number(value))
    .filter((value) => !Number.isNaN(value))
    .forEach((value) => existing.add(value));
  return Array.from(existing);
};
