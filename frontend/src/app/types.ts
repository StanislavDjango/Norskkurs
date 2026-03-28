export type Section =
  | "profile"
  | "readings"
  | "materials"
  | "exercises"
  | "tests"
  | "homework"
  | "partsOfSpeech"
  | "expressions"
  | "myWords"
  | "games"
  | "glossary"
  | "contact";

export type ProfileDraft = {
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  learningLanguage: string;
  nativeLanguage: string;
};

export type AuthFormState = {
  name: string;
  email: string;
  password: string;
};

export type TestProfileDraft = {
  name: string;
  email: string;
};
