import i18n from "i18next";
import { initReactI18next } from "react-i18next";

const resources = {
  en: {
    translation: {
      appTitle: "Norskkurs Placement Tests",
      appSubtitle: "Check your Norwegian level from A1 to B2",
      selectTest: "Choose a test to begin",
      questions: "questions",
      estimated: "Estimated time",
      start: "Start",
      yourName: "Your name (optional)",
      yourEmail: "Email (optional)",
      submit: "Submit answers",
      resultTitle: "Your result",
      correct: "Correct",
      incorrect: "Incorrect",
      score: "Score",
      percent: "Percent",
      reviewTitle: "Answer review",
      yourAnswer: "Your answer",
      rightAnswer: "Correct answer(s)",
      explanation: "Explanation",
      restart: "Change test",
      emptyState: "Answers will appear here after you start a test.",
      language: "Language",
      level: "Level",
      answerPlaceholder: "Type your answer",
      loading: "Loading...",
      levelLabel: {
        A1: "A1 — Beginner",
        A2: "A2 — Elementary",
        B1: "B1 — Intermediate",
        B2: "B2 — Upper intermediate",
      },
    },
  },
  nb: {
    translation: {
      appTitle: "Norskkurs nivåtester",
      appSubtitle: "Sjekk norsknivået ditt fra A1 til B2",
      selectTest: "Velg en test for å starte",
      questions: "oppgaver",
      estimated: "Anslått tid",
      start: "Start",
      yourName: "Navn (valgfritt)",
      yourEmail: "E‑post (valgfritt)",
      submit: "Send svar",
      resultTitle: "Resultatet ditt",
      correct: "Riktige",
      incorrect: "Feil",
      score: "Poeng",
      percent: "Prosent",
      reviewTitle: "Gjennomgang",
      yourAnswer: "Ditt svar",
      rightAnswer: "Riktig svar",
      explanation: "Forklaring",
      restart: "Bytt test",
      emptyState: "Svar dukker opp her etter du starter en test.",
      language: "Språk",
      level: "Nivå",
      answerPlaceholder: "Skriv svaret ditt",
      loading: "Laster...",
      levelLabel: {
        A1: "A1 — Nybegynner",
        A2: "A2 — Grunnleggende",
        B1: "B1 — Mellomnivå",
        B2: "B2 — Høyere mellomnivå",
      },
    },
  },
};

i18n.use(initReactI18next).init({
  resources,
  lng: "en",
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
