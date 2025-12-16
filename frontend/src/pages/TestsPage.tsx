import React, { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { Level, ProfileInfo, Stream } from "../types";

type Props = {
  auth: ProfileInfo | null;
  isTeacher: boolean;
  renderAuthFields: () => React.ReactNode;
  stream: Stream;
  currentLevel: Level;
  studentEmail: string;
  setStudentEmail: (email: string) => void;
  levelLabel: (level: string) => string;
  profile: { name: string; email: string };
  setProfile: React.Dispatch<React.SetStateAction<{ name: string; email: string }>>;
};

type Locale = "en" | "nb" | "ru";

type LocalizedText = {
  en: string;
  nb: string;
  ru: string;
};

type QuestionType = "single" | "fill" | "order";

type DemoQuestionBase = {
  id: string;
  type: QuestionType;
  prompt: LocalizedText;
  explanation: LocalizedText;
  points: number;
};

type SingleQuestion = DemoQuestionBase & {
  type: "single";
  options: Array<{ id: string; text: string }>;
  correctOptionId: string;
};

type FillQuestion = DemoQuestionBase & {
  type: "fill";
  placeholder: LocalizedText;
  accepted: string[];
  correctDisplay: string;
};

type OrderQuestion = DemoQuestionBase & {
  type: "order";
  tokens: Array<{ id: string; text: string }>;
  correctSentence: string;
  correctDisplay: string;
};

type DemoQuestion = SingleQuestion | FillQuestion | OrderQuestion;

type DemoAnswer =
  | { kind: "single"; selectedId: string | null; checked: boolean; isCorrect: boolean | null }
  | { kind: "fill"; text: string; checked: boolean; isCorrect: boolean | null }
  | { kind: "order"; tokenIds: string[]; checked: boolean; isCorrect: boolean | null };

type Phase = "intro" | "running" | "result";

type DemoTestPack = {
  id: string;
  title: LocalizedText;
  subtitle: LocalizedText;
  stream: Stream;
  level: Level;
  questions: DemoQuestion[];
};

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

const pickLocale = (language: string): Locale => {
  if (language.startsWith("ru")) return "ru";
  if (language.startsWith("nb") || language.startsWith("no") || language.startsWith("nn")) return "nb";
  return "en";
};

const pickText = (value: LocalizedText, locale: Locale) => value[locale] || value.en;

const foldNorwegianChars = (value: string) => value.replace(/å/g, "aa").replace(/ø/g, "o").replace(/æ/g, "ae");

const makeTokens = (questionId: string, words: string[]) => {
  return words.map((text, idx) => ({ id: `${questionId}:${idx}`, text }));
};

const orderTextFrom = (question: OrderQuestion, tokenIds: string[]) => {
  const map = new Map(question.tokens.map((t) => [t.id, t.text] as const));
  return tokenIds.map((id) => map.get(id) || "").join(" ").trim();
};

const normalize = (value: string) => {
  return foldNorwegianChars(
    value
      .trim()
      .replace(/\s+/g, " ")
      .replace(/[.?!…,:;]+$/g, "")
      .toLowerCase(),
  );
};

const buildDemoQuestions = (stream: Stream, level: Level): DemoQuestion[] => {
  const isNn = stream === "nynorsk";
  const I = isNn ? "Eg" : "Jeg";
  const AM_CALLED = isNn ? "heiter" : "heter";
  const FROM = isNn ? "frå" : "fra";
  const COFFEE = isNn ? "kaffi" : "kaffe";
  const LIVE = isNn ? "bur" : "bor";
  const WHERE = isNn ? "Kvar" : "Hvor";
  const WHAT = isNn ? "Kva" : "Hva";
  const NEG = isNn ? "ikkje" : "ikke";
  const HOME = isNn ? "heime" : "hjemme";
  const COSTS = isNn ? "kostar" : "koster";
  const BOOK_ART = isNn ? "ei" : "en";
  const AGREE = isNn ? "einig" : "enig";

  const questionsA1: DemoQuestion[] = [
    {
      id: "q1",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose how to say “Hello!” in Norwegian.",
        nb: "Velg hvordan du sier «Hei!» på norsk.",
        ru: "Выберите, как сказать «Здравствуйте!» по-норвежски.",
      },
      options: [
        { id: "a", text: "Hei!" },
        { id: "b", text: "Takk!" },
        { id: "c", text: "Unnskyld!" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“Hei!” is the most common neutral greeting.",
        nb: "«Hei!» er den vanligste nøytrale hilsenen.",
        ru: "«Hei!» — самое частое нейтральное приветствие.",
      },
    },
    {
      id: "q2",
      type: "single",
      points: 1,
      prompt: {
        en: "Pick the correct word order for: “My name is Ole.”",
        nb: "Velg riktig ordstilling for: «Jeg heter Ole.»",
        ru: "Выберите правильный порядок слов: «Меня зовут Оле».",
      },
      options: [
        { id: "a", text: `${I} Ole ${AM_CALLED}.` },
        { id: "b", text: `${I} ${AM_CALLED} Ole.` },
        { id: "c", text: `${AM_CALLED} ${I} Ole.` },
      ],
      correctOptionId: "b",
      explanation: {
        en: `In a neutral sentence: ${I} ${AM_CALLED} Ole.`,
        nb: `I en nøytral setning: ${I} ${AM_CALLED} Ole.`,
        ru: `В нейтральном предложении: ${I} ${AM_CALLED} Ole.`,
      },
    },
    {
      id: "q3",
      type: "fill",
      points: 1,
      prompt: {
        en: `Fill the blank: ${I} ___ ${FROM} Russland.`,
        nb: `Заполните: ${I} ___ ${FROM} Russland.`,
        ru: `Заполните пропуск: ${I} ___ ${FROM} Russland.`,
      },
      placeholder: {
        en: "Type the missing word…",
        nb: "Skriv inn ordet…",
        ru: "Введите слово…",
      },
      accepted: ["kommer"],
      correctDisplay: "kommer",
      explanation: {
        en: "“å komme fra …” = “to come from …”.",
        nb: "«å komme fra …» betyr «быть из …».",
        ru: "«å komme fra …» = «быть из …» (букв. «приходить из»).",
      },
    },
    {
      id: "q4",
      type: "fill",
      points: 1,
      prompt: {
        en: "Write the number 7 in Norwegian (both variants are ok).",
        nb: "Skriv tallet 7 på norsk (begge variantene er ok).",
        ru: "Напишите число 7 по-норвежски (подойдут оба варианта).",
      },
      placeholder: {
        en: "sju / syv",
        nb: "sju / syv",
        ru: "sju / syv",
      },
      accepted: ["sju", "syv"],
      correctDisplay: "sju / syv",
      explanation: {
        en: "Both “sju” and “syv” are used in Bokmål; “sju” is very common.",
        nb: "Både «sju» og «syv» brukes i bokmål; «sju» er veldig vanlig.",
        ru: "В букмоле используются оба варианта: «sju» и «syv» (часто — «sju»).",
      },
    },
    {
      id: "q5",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange the words into a polite café sentence.",
        nb: "Sett ordene i riktig rekkefølge (høflig setning i kafé).",
        ru: "Перетащите слова и соберите вежливую фразу в кафе.",
      },
      tokens: makeTokens(
        "q5",
        isNn ? ["Kan", "eg", "få", "ein", COFFEE + ",", "takk?"] : ["Kan", "jeg", "få", "en", COFFEE + ",", "takk?"],
      ),
      correctSentence: isNn ? `Kan eg få ein ${COFFEE}, takk?` : `Kan jeg få en ${COFFEE}, takk?`,
      correctDisplay: isNn ? `Kan eg få ein ${COFFEE}, takk?` : `Kan jeg få en ${COFFEE}, takk?`,
      explanation: {
        en: "This is a classic polite request in a café.",
        nb: "Dette er en klassisk høflig bestilling på kafé.",
        ru: "Это классическая вежливая просьба в кафе.",
      },
    },
    {
      id: "q6",
      type: "single",
      points: 1,
      prompt: {
        en: `Choose the correct past form: “Yesterday ___ I at work.”`,
        nb: "Velg riktig fortidsform: «I går ___ jeg på jobb.»",
        ru: "Выберите правильную форму прошедшего: «Вчера я был(а) на работе».",
      },
      options: [
        { id: "a", text: "er" },
        { id: "b", text: "var" },
        { id: "c", text: "har vært" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "Past of “å være” is “var”.",
        nb: "Preteritum av «å være» er «var».",
        ru: "Прошедшее время глагола «å være» — «var».",
      },
    },
    {
      id: "q7",
      type: "single",
      points: 1,
      prompt: {
        en: "Pick the best meaning of “å ha det bra”.",
        nb: "Velg best betydning av «å ha det bra».",
        ru: "Выберите лучший перевод «å ha det bra».",
      },
      options: [
        { id: "a", text: "to have food" },
        { id: "b", text: "to be well / to feel good" },
        { id: "c", text: "to be late" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "Literally “to have it good” → “to be well”.",
        nb: "Bokstavelig «ha det bra» → «ha det fint / være bra».",
        ru: "Буквально «иметь это хорошо» → «быть в порядке / чувствовать себя хорошо».",
      },
    },
    {
      id: "q8",
      type: "fill",
      points: 1,
      prompt: {
        en: "Say “thank you” in Norwegian.",
        nb: "Skriv «takk» på norsk.",
        ru: "Напишите «спасибо» по-норвежски.",
      },
      placeholder: {
        en: "takk / tusen takk",
        nb: "takk / tusen takk",
        ru: "takk / tusen takk",
      },
      accepted: ["takk", "tusen takk"],
      correctDisplay: "takk",
      explanation: {
        en: "“tusen takk” = “thank you very much”.",
        nb: "«tusen takk» = «tusen takk» (veldig høflig).",
        ru: "«tusen takk» = «большое спасибо».",
      },
    },
    {
      id: "q9",
      type: "single",
      points: 1,
      prompt: {
        en: "Pick the correct question: “What is your name?”",
        nb: "Velg riktig spørsmål: «Hva heter du?»",
        ru: "Выберите правильный вопрос: «Как тебя зовут?»",
      },
      options: [
        { id: "a", text: `${WHAT} ${AM_CALLED} du?` },
        { id: "b", text: `${WHERE} ${AM_CALLED} du?` },
        { id: "c", text: `${WHERE} ${LIVE} du?` },
      ],
      correctOptionId: "a",
      explanation: {
        en: `Use ${WHAT} + ${AM_CALLED}: “${WHAT} ${AM_CALLED} du?”`,
        nb: `Bruk ${WHAT} + ${AM_CALLED}: «${WHAT} ${AM_CALLED} du?»`,
        ru: `Нужно ${WHAT} + ${AM_CALLED}: «${WHAT} ${AM_CALLED} du?»`,
      },
    },
    {
      id: "q10",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange the words into a simple sentence: “I live in Oslo.”",
        nb: "Sett ordene i riktig rekkefølge: «Jeg bor i Oslo.»",
        ru: "Соберите предложение: «Я живу в Осло».",
      },
      tokens: makeTokens("q10", [I, LIVE, "i", "Oslo."]),
      correctSentence: `${I} ${LIVE} i Oslo.`,
      correctDisplay: `${I} ${LIVE} i Oslo.`,
      explanation: {
        en: "Basic word order: subject + verb + place.",
        nb: "Grunnordstilling: subjekt + verb + sted.",
        ru: "Базовый порядок слов: подлежащее + глагол + место.",
      },
    },
    {
      id: "q11",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the correct word for “yes”.",
        nb: "Velg riktig ord for «ja».",
        ru: "Выберите правильное слово для «да».",
      },
      options: [
        { id: "a", text: "ja" },
        { id: "b", text: "nei" },
        { id: "c", text: "ikke" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“ja” = yes.",
        nb: "«ja» = ja.",
        ru: "«ja» = «да».",
      },
    },
    {
      id: "q12",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the correct word for “no”.",
        nb: "Velg riktig ord for «nei».",
        ru: "Выберите правильное слово для «нет».",
      },
      options: [
        { id: "a", text: "ja" },
        { id: "b", text: "nei" },
        { id: "c", text: "takk" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“nei” = no.",
        nb: "«nei» = nei.",
        ru: "«nei» = «нет».",
      },
    },
    {
      id: "q13",
      type: "fill",
      points: 1,
      prompt: {
        en: "Write the number 3 in Norwegian.",
        nb: "Skriv tallet 3 på norsk.",
        ru: "Напишите число 3 по-норвежски.",
      },
      placeholder: { en: "tre", nb: "tre", ru: "tre" },
      accepted: ["tre"],
      correctDisplay: "tre",
      explanation: {
        en: "3 = tre.",
        nb: "3 = tre.",
        ru: "3 = tre.",
      },
    },
    {
      id: "q14",
      type: "single",
      points: 1,
      prompt: {
        en: "Pick the correct question word for place.",
        nb: "Velg riktig spørreord for sted.",
        ru: "Выберите вопросительное слово для места.",
      },
      options: [
        { id: "a", text: WHAT },
        { id: "b", text: WHERE },
        { id: "c", text: "Når" },
      ],
      correctOptionId: "b",
      explanation: {
        en: `${WHERE} = where.`,
        nb: `«${WHERE}» spør om sted.`,
        ru: `«${WHERE}» = «где».`,
      },
    },
    {
      id: "q15",
      type: "fill",
      points: 1,
      prompt: {
        en: `Fill the missing verb: ${I} ___ en student.`,
        nb: `Fyll inn verbet: ${I} ___ en student.`,
        ru: `Вставьте глагол: ${I} ___ en student.`,
      },
      placeholder: { en: "er", nb: "er", ru: "er" },
      accepted: ["er"],
      correctDisplay: "er",
      explanation: {
        en: "Present of “å være” is “er”.",
        nb: "Presens av «å være» er «er».",
        ru: "Настоящее «å være» — «er».",
      },
    },
    {
      id: "q16",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the most natural reply: “Takk!”",
        nb: "Velg best svar: «Takk!»",
        ru: "Выберите лучший ответ: «Takk!»",
      },
      options: [
        { id: "a", text: "Vær så god!" },
        { id: "b", text: "Ha det!" },
        { id: "c", text: "Hvor bor du?" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“Vær så god!” is a common reply to “Takk!”.",
        nb: "«Vær så god!» er et vanlig svar på «Takk!».",
        ru: "«Vær så god!» — обычный ответ на «Takk!».",
      },
    },
    {
      id: "q17",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange a simple question: “Where do you live?”",
        nb: `Sett sammen spørsmålet: «${WHERE} ${LIVE} du?»`,
        ru: `Соберите вопрос: «Где ты живёшь?»`,
      },
      tokens: makeTokens("q17", [WHERE, LIVE, "du?"]),
      correctSentence: `${WHERE} ${LIVE} du`,
      correctDisplay: `${WHERE} ${LIVE} du?`,
      explanation: {
        en: "Basic A1 question about place.",
        nb: "Grunnleggende A1-spørsmål om sted.",
        ru: "Базовый вопрос уровня A1 о месте.",
      },
    },
    {
      id: "q18",
      type: "single",
      points: 1,
      prompt: {
        en: "Pick the correct word for “goodbye”.",
        nb: "Velg riktig ord for «пока / до свидания».",
        ru: "Выберите слово для «пока / до свидания».",
      },
      options: [
        { id: "a", text: "Ha det!" },
        { id: "b", text: "Hei!" },
        { id: "c", text: "Takk!" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“Ha det!” is a common goodbye.",
        nb: "«Ha det!» er en vanlig avskjed.",
        ru: "«Ha det!» — частое «пока».",
      },
    },
    {
      id: "q19",
      type: "fill",
      points: 1,
      prompt: {
        en: "Type the Norwegian word for “coffee”.",
        nb: "Skriv ordet for kaffe.",
        ru: "Введите слово «кофе» по-норвежски.",
      },
      placeholder: { en: COFFEE, nb: COFFEE, ru: COFFEE },
      accepted: [COFFEE],
      correctDisplay: COFFEE,
      explanation: {
        en: `In this stream we use: ${COFFEE}.`,
        nb: `I denne retningen bruker vi: ${COFFEE}.`,
        ru: `В этом потоке: ${COFFEE}.`,
      },
    },
    {
      id: "q20",
      type: "single",
      points: 1,
      prompt: {
        en: "Dialogue: “Ha det!” Choose the best reply.",
        nb: "Dialog: «Ha det!» Velg best svar.",
        ru: "Диалог: «Ha det!» Выберите лучший ответ.",
      },
      options: [
        { id: "a", text: "Ha det bra!" },
        { id: "b", text: "Jeg heter Ole." },
        { id: "c", text: "Hvor bor du?" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“Ha det bra!” is a friendly goodbye reply.",
        nb: "«Ha det bra!» er et vennlig svar.",
        ru: "«Ha det bra!» — дружелюбный ответ.",
      },
    },
  ];

  const questionsA2: DemoQuestion[] = [
    {
      id: "q1",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best sentence for talking about your daily routine.",
        nb: "Velg setningen som passer best for daglig rutine.",
        ru: "Выберите предложение, которое лучше всего описывает распорядок дня.",
      },
      options: [
        { id: "a", text: `${I} står opp klokka sju.` },
        { id: "b", text: `${I} stå opp klokka sju.` },
        { id: "c", text: `${I} stå opp hver dag.` },
      ],
      correctOptionId: "a",
      explanation: {
        en: "The verb must be in present tense: “står opp”.",
        nb: "Verb må stå i presens: «står opp».",
        ru: "Глагол должен быть в настоящем времени: «står opp».",
      },
    },
    {
      id: "q2",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill in the verb: “After work I ___ dinner.”",
        nb: "Fyll inn verbet: «Etter jobb ___ jeg middag.»",
        ru: "Вставьте глагол: «После работы я ___ ужин».",
      },
      placeholder: {
        en: "lager / lagar",
        nb: "lager / lagar",
        ru: "lager / lagar",
      },
      accepted: isNn ? ["lagar"] : ["lager"],
      correctDisplay: isNn ? "lagar" : "lager",
      explanation: {
        en: "Bokmål uses “lager”, Nynorsk uses “lagar”.",
        nb: "I bokmål: «lager», i nynorsk: «lagar».",
        ru: "В букмоле — «lager», в нюнорске — «lagar».",
      },
    },
    {
      id: "q3",
      type: "single",
      points: 1,
      prompt: {
        en: "Which sentence has correct word order after an adverb?",
        nb: "Hvilken setning har riktig ordstilling etter et adverb?",
        ru: "В каком предложении правильный порядок слов после наречия?",
      },
      options: [
        { id: "a", text: "I dag jeg jobber hjemme." },
        { id: "b", text: "I dag jobber jeg hjemme." },
        { id: "c", text: "Jobber i dag jeg hjemme." },
      ],
      correctOptionId: "b",
      explanation: {
        en: "After the adverb “I dag” the verb must come next: “jobber jeg …”.",
        nb: "Etter «I dag» kommer verbet: «jobber jeg …».",
        ru: "После «I dag» должен идти глагол: «jobber jeg …».",
      },
    },
    {
      id: "q4",
      type: "order",
      points: 2,
      prompt: {
        en: "Make a sentence about what you like to do in your free time.",
        nb: "Sett sammen setningen om hva du liker å gjøre på fritida.",
        ru: "Соберите предложение о том, что вы любите делать в свободное время.",
      },
      tokens: makeTokens(
        "q4",
        isNn ? ["På", "fritida", "liker", "eg", "å", "gå", "tur."] : ["På", "fritida", "liker", "jeg", "å", "gå", "tur."],
      ),
      correctSentence: isNn ? "På fritida liker eg å gå tur." : "På fritida liker jeg å gå tur.",
      correctDisplay: isNn ? "På fritida liker eg å gå tur." : "På fritida liker jeg å gå tur.",
      explanation: {
        en: "Typical A2 sentence with “liker å …” + infinitive.",
        nb: "Typisk A2-setning med «liker å …» + infinitiv.",
        ru: "Типичное предложение уровня A2 с конструкцией «liker å …» + инфинитив.",
      },
    },
    {
      id: "q5",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the correct preposition with a weekday.",
        nb: "Velg riktig preposisjon med ukedag.",
        ru: "Выберите правильный предлог с днём недели.",
      },
      options: [
        { id: "a", text: "på mandag" },
        { id: "b", text: "i mandag" },
        { id: "c", text: "til mandag" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "In Norwegian you usually say “på mandag”.",
        nb: "På norsk sier man vanligvis «på mandag».",
        ru: "По‑норвежски обычно говорят «på mandag».",
      },
    },
    {
      id: "q6",
      type: "fill",
      points: 1,
      prompt: {
        en: `Fill the missing verb: I morgen ___ ${I.toLowerCase()} på jobb.`,
        nb: `Fyll inn verbet: I morgen ___ ${I.toLowerCase()} på jobb.`,
        ru: `Вставьте глагол: I morgen ___ ${I.toLowerCase()} på jobb.`,
      },
      placeholder: {
        en: "skal",
        nb: "skal",
        ru: "skal",
      },
      accepted: ["skal"],
      correctDisplay: "skal",
      explanation: {
        en: "“skal” is common for plans in the near future.",
        nb: "«skal» brukes ofte om planer i nær framtid.",
        ru: "«skal» часто используют для планов на ближайшее будущее.",
      },
    },
    {
      id: "q7",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the correct past tense: “I går ___ jeg til byen.”",
        nb: "Velg riktig preteritum: «I går ___ jeg til byen.»",
        ru: "Выберите прошедшее: «Вчера я ___ в город».",
      },
      options: [
        { id: "a", text: "går" },
        { id: "b", text: "gikk" },
        { id: "c", text: "har gått" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "Past of “å gå” is “gikk”.",
        nb: "Preteritum av «å gå» er «gikk».",
        ru: "Прошедшее время «å gå» — «gikk».",
      },
    },
    {
      id: "q8",
      type: "order",
      points: 2,
      prompt: {
        en: "Make a sentence with a time expression first.",
        nb: "Lag en setning med tidsuttrykk først.",
        ru: "Соберите предложение, где сначала стоит обстоятельство времени.",
      },
      tokens: makeTokens("q8", ["I", "går", "var", I.toLowerCase(), HOME + "."]),
      correctSentence: `I går var ${I.toLowerCase()} ${HOME}.`,
      correctDisplay: `I går var ${I.toLowerCase()} ${HOME}.`,
      explanation: {
        en: "When a time expression comes first, the verb often comes next.",
        nb: "Når tidsuttrykket står først, kommer verbet ofte rett etter.",
        ru: "Когда обстоятельство времени стоит первым, глагол обычно идёт сразу после.",
      },
    },
    {
      id: "q9",
      type: "fill",
      points: 1,
      prompt: {
        en: `Fill the negation: ${I} ___ liker fisk.`,
        nb: `Fyll inn nektelsen: ${I} ___ liker fisk.`,
        ru: `Вставьте отрицание: ${I} ___ liker fisk.`,
      },
      placeholder: {
        en: NEG,
        nb: NEG,
        ru: NEG,
      },
      accepted: [NEG],
      correctDisplay: NEG,
      explanation: {
        en: "Bokmål uses “ikke”, Nynorsk uses “ikkje”.",
        nb: "Bokmål: «ikke», nynorsk: «ikkje».",
        ru: "Букмол: «ikke», нюнорск: «ikkje».",
      },
    },
    {
      id: "q10",
      type: "single",
      points: 1,
      prompt: {
        en: "Dialogue: Ask about price. Choose the best question.",
        nb: "Dialog: Spør om pris. Velg best spørsmål.",
        ru: "Диалог: спросить цену. Выберите лучший вопрос.",
      },
      options: [
        { id: "a", text: `${WHAT} ${COSTS} det?` },
        { id: "b", text: `${WHERE} ${LIVE} du?` },
        { id: "c", text: `${WHAT} ${AM_CALLED} du?` },
      ],
      correctOptionId: "a",
      explanation: {
        en: `To ask the price: “${WHAT} ${COSTS} det?”`,
        nb: `For å spørre om pris: «${WHAT} ${COSTS} det?»`,
        ru: `Чтобы спросить цену: «${WHAT} ${COSTS} det?»`,
      },
    },
    {
      id: "q11",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best reply in a shop: “Kan jeg hjelpe deg?”",
        nb: "Velg best svar i en butikk: «Kan jeg hjelpe deg?»",
        ru: "Магазин: выберите лучший ответ на «Kan jeg hjelpe deg?»",
      },
      options: [
        { id: "a", text: "Ja, jeg ser bare." },
        { id: "b", text: "Jeg heter Ole." },
        { id: "c", text: "På mandag." },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“Jeg ser bare” = “I’m just looking”.",
        nb: "«Jeg ser bare» betyr «jeg bare ser».",
        ru: "«Jeg ser bare» = «я просто смотрю».",
      },
    },
    {
      id: "q12",
      type: "fill",
      points: 1,
      prompt: {
        en: `Fill the word: ${I} vil gjerne ___ en kaffe.`,
        nb: `Fyll inn ordet: ${I} vil gjerne ___ en kaffe.`,
        ru: `Вставьте слово: ${I} vil gjerne ___ en kaffe.`,
      },
      placeholder: { en: "ha", nb: "ha", ru: "ha" },
      accepted: ["ha"],
      correctDisplay: "ha",
      explanation: {
        en: "“vil gjerne ha …” is a polite way to order.",
        nb: "«vil gjerne ha …» er en høflig bestilling.",
        ru: "«vil gjerne ha …» — вежливая формула заказа.",
      },
    },
    {
      id: "q13",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the correct comparative: “stor → ___”.",
        nb: "Velg riktig komparativ: «stor → ___».",
        ru: "Выберите сравнительную степень: «stor → ___».",
      },
      options: [
        { id: "a", text: "storere" },
        { id: "b", text: "større" },
        { id: "c", text: "størst" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "stor → større → størst.",
        nb: "stor → større → størst.",
        ru: "stor → større → størst.",
      },
    },
    {
      id: "q14",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange the words into a sentence about plans.",
        nb: "Sett ordene i riktig rekkefølge (planer).",
        ru: "Соберите предложение о планах.",
      },
      tokens: makeTokens("q14", ["I", "morgen", "skal", I.toLowerCase(), "trene."]),
      correctSentence: `I morgen skal ${I.toLowerCase()} trene.`,
      correctDisplay: `I morgen skal ${I.toLowerCase()} trene.`,
      explanation: {
        en: "With time first, the verb comes next (inversion).",
        nb: "Med tidsuttrykk først kommer verbet (inversjon).",
        ru: "При обстоятельстве времени в начале идёт инверсия.",
      },
    },
    {
      id: "q15",
      type: "fill",
      points: 1,
      prompt: {
        en: `Fill the preposition: ${I} bor ___ Oslo.`,
        nb: `Fyll inn preposisjonen: ${I} bor ___ Oslo.`,
        ru: `Вставьте предлог: ${I} bor ___ Oslo.`,
      },
      placeholder: { en: "i", nb: "i", ru: "i" },
      accepted: ["i"],
      correctDisplay: "i",
      explanation: {
        en: "Cities use “i”: “i Oslo”.",
        nb: "Byer: «i Oslo».",
        ru: "Города: «i Oslo».",
      },
    },
    {
      id: "q16",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best meaning of “kanskje”.",
        nb: "Velg beste betydning av «kanskje».",
        ru: "Выберите лучший перевод слова «kanskje».",
      },
      options: [
        { id: "a", text: "maybe" },
        { id: "b", text: "always" },
        { id: "c", text: "never" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“kanskje” = maybe.",
        nb: "«kanskje» = maybe.",
        ru: "«kanskje» = «может быть».",
      },
    },
  ];

  const questionsB1: DemoQuestion[] = [
    {
      id: "q1",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best connector for a longer story.",
        nb: "Velg den beste bindeordet for en litt lengre tekst.",
        ru: "Выберите подходящий союз для более длинного рассказа.",
      },
      options: [
        { id: "a", text: "og" },
        { id: "b", text: "men" },
        { id: "c", text: "fordi" },
      ],
      correctOptionId: "c",
      explanation: {
        en: "“fordi” (“because”) introduces a reason – typical for B1 texts.",
        nb: "«fordi» innleder en grunn – typisk i B1-tekster.",
        ru: "«fordi» («потому что») вводит причину — типично для текстов уровня B1.",
      },
    },
    {
      id: "q2",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill in the subordinate clause: “I am happy because ___ I have good friends.”",
        nb: "Fullfør leddsetningen: «Jeg er glad fordi ___ jeg har gode venner.»",
        ru: "Дополните придаточное: «Я рад(а), потому что ___ у меня хорошие друзья».",
      },
      placeholder: {
        en: "…",
        nb: "…",
        ru: "…",
      },
      accepted: isNn ? ["at"] : ["at"],
      correctDisplay: "at",
      explanation: {
        en: "Subordinate clauses often start with “at”, “fordi”, “hvis”, “når”…",
        nb: "Leddsetninger kan starte med «at», «fordi», «hvis», «når» …",
        ru: "Придаточные часто начинаются с «at», «fordi», «hvis», «når» …",
      },
    },
    {
      id: "q3",
      type: "order",
      points: 2,
      prompt: {
        en: "Make a sentence with correct word order in a subordinate clause.",
        nb: "Sett ordene i riktig rekkefølge i en leddsetning.",
        ru: "Соберите предложение с правильным порядком слов в придаточном.",
      },
      tokens: makeTokens("q3", isNn ? ["fordi", "eg", "ikkje", "har", "tid", "i dag"] : ["fordi", "jeg", "ikke", "har", "tid", "i dag"]),
      correctSentence: isNn ? "fordi eg ikkje har tid i dag" : "fordi jeg ikke har tid i dag",
      correctDisplay: isNn ? "fordi eg ikkje har tid i dag" : "fordi jeg ikke har tid i dag",
      explanation: {
        en: "In subordinate clauses the verb comes right after the subject: “jeg ikke har …”.",
        nb: "I leddsetninger kommer verbet etter subjektet: «eg/jeg ikkje/ikke har …».",
        ru: "В придаточных глагол идёт сразу после подлежащего: «jeg ikke har …».",
      },
    },
    {
      id: "q4",
      type: "single",
      points: 1,
      prompt: {
        en: "Pick the best translation of “hverdag”.",
        nb: "Velg beste oversettelse av «hverdag».",
        ru: "Выберите лучший перевод слова «hverdag».",
      },
      options: [
        { id: "a", text: "weekend" },
        { id: "b", text: "weekday / everyday life" },
        { id: "c", text: "holiday" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“hverdag” means weekday or everyday life, not weekend.",
        nb: "«hverdag» betyr ukedag eller dagligliv, ikke helg.",
        ru: "«hverdag» — это будний день или повседневная жизнь, не выходной.",
      },
    },
    {
      id: "q5",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the sentence with correct word order after a time expression.",
        nb: "Velg setningen med riktig ordstilling etter et tidsuttrykk.",
        ru: "Выберите предложение с правильным порядком слов после обстоятельства времени.",
      },
      options: [
        { id: "a", text: "I går jeg kjøpte en bok." },
        { id: "b", text: "I går kjøpte jeg en bok." },
        { id: "c", text: "Jeg i går kjøpte en bok." },
      ],
      correctOptionId: "b",
      explanation: {
        en: "After “I går” the verb usually comes next: “kjøpte jeg …”.",
        nb: "Etter «I går» kommer verbet: «kjøpte jeg …».",
        ru: "После «I går» идёт глагол: «kjøpte jeg …».",
      },
    },
    {
      id: "q6",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill the relative word: “Mannen ___ bor her, er lærer.”",
        nb: "Fyll inn relativordet: «Mannen ___ bor her, er lærer.»",
        ru: "Вставьте относительное слово: «Mannen ___ bor her, er lærer.»",
      },
      placeholder: {
        en: "som",
        nb: "som",
        ru: "som",
      },
      accepted: ["som"],
      correctDisplay: "som",
      explanation: {
        en: "“som” is very common for relative clauses in Norwegian.",
        nb: "«som» brukes ofte i relative leddsetninger.",
        ru: "«som» часто используется в относительных придаточных.",
      },
    },
    {
      id: "q7",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the correct word order in a subordinate clause.",
        nb: "Velg riktig ordstilling i en leddsetning.",
        ru: "Выберите правильный порядок слов в придаточном предложении.",
      },
      options: [
        { id: "a", text: `fordi jeg ${NEG} har tid` },
        { id: "b", text: `fordi jeg har ${NEG} tid` },
        { id: "c", text: `fordi har jeg ${NEG} tid` },
      ],
      correctOptionId: "a",
      explanation: {
        en: `In subordinate clauses, negation comes before the verb: “jeg ${NEG} har …”.`,
        nb: `I leddsetninger står nektelsen før verbet: «jeg ${NEG} har …».`,
        ru: `В придаточных отрицание стоит перед глаголом: «jeg ${NEG} har …».`,
      },
    },
    {
      id: "q8",
      type: "order",
      points: 2,
      prompt: {
        en: "Build a sentence with inversion (verb after time expression).",
        nb: "Lag en setning med inversjon (verbet etter tidsuttrykket).",
        ru: "Соберите предложение с инверсией (после обстоятельства времени).",
      },
      tokens: makeTokens("q8", ["I", "går", "kjøpte", I.toLowerCase(), BOOK_ART, "bok."]),
      correctSentence: `I går kjøpte ${I.toLowerCase()} ${BOOK_ART} bok.`,
      correctDisplay: `I går kjøpte ${I.toLowerCase()} ${BOOK_ART} bok.`,
      explanation: {
        en: "This is a common pattern in Norwegian main clauses.",
        nb: "Dette er et vanlig mønster i norske helsetninger.",
        ru: "Это распространённый порядок слов в норвежских главных предложениях.",
      },
    },
    {
      id: "q9",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill the connector: “Jeg var syk, ___ kom jeg ikke.”",
        nb: "Fyll inn bindeordet: «Jeg var syk, ___ kom jeg ikke.»",
        ru: "Вставьте слово-связку: «Jeg var syk, ___ kom jeg ikke.»",
      },
      placeholder: {
        en: "derfor",
        nb: "derfor",
        ru: "derfor",
      },
      accepted: ["derfor"],
      correctDisplay: "derfor",
      explanation: {
        en: "“derfor” = “therefore / that’s why”.",
        nb: "«derfor» = «derfor / derfor».",
        ru: "«derfor» = «поэтому».",
      },
    },
    {
      id: "q10",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best sentence for politely disagreeing.",
        nb: "Velg den beste setningen for å si at du er uenig.",
        ru: "Выберите лучшую фразу для вежливого несогласия.",
      },
      options: [
        { id: "a", text: `Jeg er ${NEG} ${AGREE}.` },
        { id: "b", text: "Jeg liker kaffe." },
        { id: "c", text: "Hvor kommer du fra?" },
      ],
      correctOptionId: "a",
      explanation: {
        en: `A common polite phrase is “Jeg er ${NEG} ${AGREE}.”`,
        nb: `En vanlig frase er «Jeg er ${NEG} ${AGREE}.»`,
        ru: `Частая фраза: «Jeg er ${NEG} ${AGREE}.»`,
      },
    },
    {
      id: "q11",
      type: "fill",
      points: 1,
      prompt: {
        en: `Fill the participle: ${I} har ___ i Norge i to år. (to live)`,
        nb: `Fyll inn partisippet: ${I} har ___ i Norge i to år.`,
        ru: `Вставьте причастие: ${I} har ___ i Norge i to år.`,
      },
      placeholder: { en: "bodd", nb: "bodd", ru: "bodd" },
      accepted: ["bodd"],
      correctDisplay: "bodd",
      explanation: {
        en: "Present perfect: har + past participle (bodd).",
        nb: "Perfektum: har + perfektum partisipp (bodd).",
        ru: "Перфект: har + причастие прошедшего (bodd).",
      },
    },
    {
      id: "q12",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best sentence with correct word order.",
        nb: "Velg setningen med riktig ordstilling.",
        ru: "Выберите предложение с правильным порядком слов.",
      },
      options: [
        { id: "a", text: `Jeg vet ikke hvor ${I.toLowerCase()} ${LIVE}.` },
        { id: "b", text: `Jeg vet ikke hvor ${I.toLowerCase()} bor.` },
        { id: "c", text: `Jeg vet ikke hvor bor ${I.toLowerCase()}.` },
      ],
      correctOptionId: "b",
      explanation: {
        en: "In an indirect question we use normal word order: subject + verb.",
        nb: "I indirekte spørsmål bruker vi normal ordstilling: subjekt + verb.",
        ru: "В косвенном вопросе обычный порядок: подлежащее + глагол.",
      },
    },
    {
      id: "q13",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange the words into an indirect question.",
        nb: "Sett sammen et indirekte spørsmål.",
        ru: "Соберите косвенный вопрос.",
      },
      tokens: makeTokens("q13", ["Jeg", "vet", "ikke", WHAT.toLowerCase(), AM_CALLED, "han."]),
      correctSentence: `Jeg vet ikke ${WHAT.toLowerCase()} ${AM_CALLED} han.`,
      correctDisplay: `Jeg vet ikke ${WHAT.toLowerCase()} ${AM_CALLED} han.`,
      explanation: {
        en: "Indirect questions keep subject + verb order.",
        nb: "Indirekte spørsmål beholder subjekt + verb-orden.",
        ru: "В косвенных вопросах порядок подлежащее+глагол сохраняется.",
      },
    },
    {
      id: "q14",
      type: "single",
      points: 1,
      prompt: {
        en: "Pick the best meaning of “dessverre”.",
        nb: "Velg beste betydning av «dessverre».",
        ru: "Выберите лучший перевод «dessverre».",
      },
      options: [
        { id: "a", text: "unfortunately" },
        { id: "b", text: "surely" },
        { id: "c", text: "suddenly" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“dessverre” = unfortunately.",
        nb: "«dessverre» = unfortunately.",
        ru: "«dessverre» = «к сожалению».",
      },
    },
    {
      id: "q15",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill the connector: “___ det regner, går vi en tur.”",
        nb: "Fyll inn bindeordet: «___ det regner, går vi en tur.»",
        ru: "Вставьте связку: «___ det regner, går vi en tur.»",
      },
      placeholder: { en: "selv om", nb: "selv om", ru: "selv om" },
      accepted: ["selv om"],
      correctDisplay: "selv om",
      explanation: {
        en: "“selv om” = “even though”.",
        nb: "«selv om» = «even though».",
        ru: "«selv om» = «даже если / хотя».",
      },
    },
    {
      id: "q16",
      type: "single",
      points: 1,
      prompt: {
        en: "Dialogue: You are late. Choose the best sentence.",
        nb: "Dialog: Du kommer for sent. Velg best setning.",
        ru: "Диалог: вы опоздали. Выберите лучшую фразу.",
      },
      options: [
        { id: "a", text: "Unnskyld, jeg ble forsinket." },
        { id: "b", text: "Hei, jeg heter Ole." },
        { id: "c", text: "Hva koster det?" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "This is a natural B1 apology sentence.",
        nb: "Dette er en naturlig unnskyldning på B1.",
        ru: "Это естественная фраза извинения уровня B1.",
      },
    },
  ];

  const questionsB2: DemoQuestion[] = [
    {
      id: "q1",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the sentence with the most natural formal style.",
        nb: "Velg setningen som har mest naturlig formell stil.",
        ru: "Выберите предложение с наиболее естественным формальным стилем.",
      },
      options: [
        {
          id: "a",
          text: isNn
            ? "Eg vil gjerne søke på stillinga hos dykk."
            : "Jeg vil gjerne søke på stillingen hos dere.",
        },
        { id: "b", text: "Jeg vil ha jobb hos deg." },
        { id: "c", text: "Gi meg jobb, takk." },
      ],
      correctOptionId: "a",
      explanation: {
        en: "Polite modal “vil gjerne” + formal wording is typical in applications.",
        nb: "Høflig «vil gjerne» og formell formulering brukes i søknader.",
        ru: "В заявлении обычно используется «vil gjerne» и более формальная формулировка.",
      },
    },
    {
      id: "q2",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill in the participle: “The letter is ___ and ready to send.”",
        nb: "Fyll inn perfektum partisipp: «Brevet er ___ og klart til å sende.»",
        ru: "Дополните причастие прошедшего: «Письмо ___ и готово к отправке».",
      },
      placeholder: {
        en: "skrevet",
        nb: "skrevet",
        ru: "skrevet",
      },
      accepted: ["skrevet"],
      correctDisplay: "skrevet",
      explanation: {
        en: "From “å skrive” we get the participle “skrevet”.",
        nb: "Av «å skrive» får vi partisippet «skrevet».",
        ru: "От «å skrive» образуется причастие «skrevet».",
      },
    },
    {
      id: "q3",
      type: "order",
      points: 2,
      prompt: {
        en: "Build a sentence with an introductory clause (B2 style).",
        nb: "Sett sammen en setning med innledende ledd (B2-nivå).",
        ru: "Соберите предложение с вводной конструкцией (уровень B2).",
      },
      tokens: makeTokens(
        "q3",
        isNn
          ? ["Sjølv", "om", "veret", "er", "dårleg,", "vil", "eg", "gå", "på", "tur."]
          : ["Selv", "om", "været", "er", "dårlig,", "vil", "jeg", "gå", "på", "tur."],
      ),
      correctSentence: isNn
        ? "Sjølv om veret er dårleg, vil eg gå på tur."
        : "Selv om været er dårlig, vil jeg gå på tur.",
      correctDisplay: isNn
        ? "Sjølv om veret er dårleg, vil eg gå på tur."
        : "Selv om været er dårlig, vil jeg gå på tur.",
      explanation: {
        en: "“Selv om …” / “Sjølv om …” introduces a contrast; typical in B2 arguments.",
        nb: "«Selv om … / Sjølv om …» innleder motsetning – vanlig i B2-resonnement.",
        ru: "«Selv om … / Sjølv om …» вводит противопоставление — типично для B2‑текстов.",
      },
    },
    {
      id: "q4",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best connector meaning “however”.",
        nb: "Velg bindeordet som betyr «imidlertid / men likevel».",
        ru: "Выберите связку со значением «однако».",
      },
      options: [
        { id: "a", text: "derfor" },
        { id: "b", text: "imidlertid" },
        { id: "c", text: "fordi" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“imidlertid” is a formal connector meaning “however”.",
        nb: "«imidlertid» er et mer formelt bindeord for «men likevel».",
        ru: "«imidlertid» — более формальная связка со значением «однако».",
      },
    },
    {
      id: "q5",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill in the participle: “Det er ___ en beslutning.” (to make a decision)",
        nb: "Fyll inn partisippet: «Det er ___ en beslutning.»",
        ru: "Вставьте причастие: «Det er ___ en beslutning.»",
      },
      placeholder: {
        en: "tatt",
        nb: "tatt",
        ru: "tatt",
      },
      accepted: ["tatt"],
      correctDisplay: "tatt",
      explanation: {
        en: "“å ta en beslutning” → “Det er tatt en beslutning.”",
        nb: "«å ta en beslutning» → «Det er tatt en beslutning.»",
        ru: "«å ta en beslutning» → «Det er tatt en beslutning.»",
      },
    },
    {
      id: "q6",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the sentence with a natural formal tone.",
        nb: "Velg setningen som har en naturlig formell tone.",
        ru: "Выберите предложение с естественным формальным тоном.",
      },
      options: [
        { id: "a", text: "Kan du gi meg jobb, eller?" },
        { id: "b", text: isNn ? "Eg set pris på tilbakemeldinga." : "Jeg setter pris på tilbakemeldingen." },
        { id: "c", text: "Jeg vil ha det nå!" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“I appreciate the feedback” style is typical in formal communication.",
        nb: "«Jeg setter pris på …» er vanlig i formell kommunikasjon.",
        ru: "«Jeg setter pris på …» — типичная формула в формальной переписке.",
      },
    },
    {
      id: "q7",
      type: "order",
      points: 2,
      prompt: {
        en: "Build a sentence with an introductory word (B2 style).",
        nb: "Sett sammen en setning med innledningsord (B2-stil).",
        ru: "Соберите предложение с вводным словом (стиль B2).",
      },
      tokens: makeTokens("q7", ["Dessuten", "har", I.toLowerCase(), NEG, "tid", "i", "dag."]),
      correctSentence: `Dessuten har ${I.toLowerCase()} ${NEG} tid i dag.`,
      correctDisplay: `Dessuten har ${I.toLowerCase()} ${NEG} tid i dag.`,
      explanation: {
        en: "“Dessuten” (“besides”) helps you structure an argument.",
        nb: "«Dessuten» hjelper deg å strukturere et argument.",
        ru: "«Dessuten» («кроме того») помогает строить аргументацию.",
      },
    },
    {
      id: "q8",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill the connector: “Det regnet. ___ ble turen avlyst.”",
        nb: "Fyll inn bindeordet: «Det regnet. ___ ble turen avlyst.»",
        ru: "Вставьте связку: «Det regnet. ___ ble turen avlyst.»",
      },
      placeholder: {
        en: "derfor",
        nb: "derfor",
        ru: "derfor",
      },
      accepted: ["derfor"],
      correctDisplay: "derfor",
      explanation: {
        en: "Reason → result: “therefore”.",
        nb: "Årsak → resultat: «derfor».",
        ru: "Причина → результат: «поэтому» (derfor).",
      },
    },
    {
      id: "q9",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best phrasing for a formal email ending.",
        nb: "Velg beste formulering for avslutning i en formell e-post.",
        ru: "Выберите лучшую формулировку для завершения письма.",
      },
      options: [
        { id: "a", text: "Hade!" },
        { id: "b", text: "Med vennlig hilsen" },
        { id: "c", text: "Sees!" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“Med vennlig hilsen” is a standard formal closing.",
        nb: "«Med vennlig hilsen» er en standard formell avslutning.",
        ru: "«Med vennlig hilsen» — стандартное формальное завершение письма.",
      },
    },
    {
      id: "q10",
      type: "order",
      points: 2,
      prompt: {
        en: "Build a conditional sentence (B2).",
        nb: "Sett sammen en betingelsessetning (B2).",
        ru: "Соберите условное предложение (B2).",
      },
      tokens: makeTokens("q10", ["Hvis", I.toLowerCase(), "hadde", "tid,", "ville", I.toLowerCase(), "reise."]),
      correctSentence: `Hvis ${I.toLowerCase()} hadde tid, ville ${I.toLowerCase()} reise.`,
      correctDisplay: `Hvis ${I.toLowerCase()} hadde tid, ville ${I.toLowerCase()} reise.`,
      explanation: {
        en: "B2 often includes hypotheticals: “If I had time, I would …”.",
        nb: "På B2 bruker man ofte hypotetiske setninger: «Hvis … ville …».",
        ru: "На уровне B2 часто встречаются гипотетические конструкции: «Hvis … ville …».",
      },
    },
    {
      id: "q11",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the sentence with correct passive form.",
        nb: "Velg setningen med riktig passiv.",
        ru: "Выберите предложение с правильным пассивом.",
      },
      options: [
        { id: "a", text: "Rapporten ble skrive i går." },
        { id: "b", text: "Rapporten ble skrevet i går." },
        { id: "c", text: "Rapporten skrev i går." },
      ],
      correctOptionId: "b",
      explanation: {
        en: "Passive: ble + past participle (skrevet).",
        nb: "Passiv: ble + perfektum partisipp (skrevet).",
        ru: "Пассив: ble + причастие (skrevet).",
      },
    },
    {
      id: "q12",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill the connector meaning “nevertheless”: “Det er dyrt. ___ kjøper jeg det.”",
        nb: "Fyll inn bindeordet: «Det er dyrt. ___ kjøper jeg det.»",
        ru: "Вставьте связку «тем не менее»: «Det er dyrt. ___ kjøper jeg det.»",
      },
      placeholder: { en: "likevel", nb: "likevel", ru: "likevel" },
      accepted: ["likevel"],
      correctDisplay: "likevel",
      explanation: {
        en: "“likevel” = nevertheless.",
        nb: "«likevel» = «likevel / likevel».",
        ru: "«likevel» = «тем не менее / всё равно».",
      },
    },
    {
      id: "q13",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange a formal email sentence.",
        nb: "Sett sammen en formell setning i e-post.",
        ru: "Соберите формальную фразу для письма.",
      },
      tokens: makeTokens("q13", ["Jeg", "vil", "gjerne", "takke", "for", "tilbakemeldingen."]),
      correctSentence: "Jeg vil gjerne takke for tilbakemeldingen.",
      correctDisplay: "Jeg vil gjerne takke for tilbakemeldingen.",
      explanation: {
        en: "A polite phrase: “I would like to thank you for the feedback.”",
        nb: "Høflig frase for formell kommunikasjon.",
        ru: "Вежливая формула для формальной переписки.",
      },
    },
    {
      id: "q14",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best connector meaning “on the other hand”.",
        nb: "Velg bindeordet som betyr «derimot».",
        ru: "Выберите связку со значением «с другой стороны».",
      },
      options: [
        { id: "a", text: "derimot" },
        { id: "b", text: "fordi" },
        { id: "c", text: "derfor" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“derimot” is used to contrast two ideas.",
        nb: "«derimot» brukes for å kontrastere.",
        ru: "«derimot» — для противопоставления.",
      },
    },
    {
      id: "q15",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill the formal closing: “Med ___ hilsen”.",
        nb: "Fyll inn: «Med ___ hilsen».",
        ru: "Вставьте слово: «Med ___ hilsen».",
      },
      placeholder: { en: "vennlig", nb: "vennlig", ru: "vennlig" },
      accepted: ["vennlig"],
      correctDisplay: "vennlig",
      explanation: {
        en: "Standard closing: “Med vennlig hilsen”.",
        nb: "Standard avslutning: «Med vennlig hilsen».",
        ru: "Стандарт: «Med vennlig hilsen».",
      },
    },
    {
      id: "q16",
      type: "single",
      points: 1,
      prompt: {
        en: "Dialogue: You want to sound formal. Choose the best opening.",
        nb: "Dialog: Du vil være formell. Velg beste åpning.",
        ru: "Диалог: хотите звучать формально. Выберите лучшее начало письма.",
      },
      options: [
        { id: "a", text: "Hei! Hva skjer?" },
        { id: "b", text: "Jeg skriver til deg angående ..." },
        { id: "c", text: "Sees!" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“angående …” is a formal way to say “regarding …”.",
        nb: "«angående …» er formelt for «regarding …».",
        ru: "«angående …» = «касательно …» (формально).",
      },
    },
  ];

  // English stream: separate demo sets that practice basic English grammar
  // and vocabulary, while keeping the same UI and scoring.
  const questionsEnA1: DemoQuestion[] = [
    {
      id: "e1",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose a simple greeting in English.",
        nb: "Velg en enkel hilsen på engelsk.",
        ru: "Выберите простое английское приветствие.",
      },
      options: [
        { id: "a", text: "Hello!" },
        { id: "b", text: "Good night!" },
        { id: "c", text: "See you yesterday!" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“Hello!” is a neutral greeting you can use almost everywhere.",
        nb: "«Hello!» er en nøytral hilsen du kan bruke nesten overalt.",
        ru: "«Hello!» — нейтральное приветствие, которое подходит почти везде.",
      },
    },
    {
      id: "e2",
      type: "fill",
      points: 1,
      prompt: {
        en: 'Fill the blank: “I ___ from Spain.”',
        nb: "Fyll inn: «I ___ from Spain.»",
        ru: "Заполните пропуск: «I ___ from Spain.»",
      },
      placeholder: {
        en: "am",
        nb: "am",
        ru: "am",
      },
      accepted: ["am"],
      correctDisplay: "am",
      explanation: {
        en: "With “I” we use “am”: “I am …”.",
        nb: "Med «I» bruker vi «am»: «I am …».",
        ru: "С местоимением «I» используется глагол «am»: «I am …».",
      },
    },
    {
      id: "e3",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the sentence with correct verb form.",
        nb: "Velg setningen med riktig verbform.",
        ru: "Выберите предложение с правильной формой глагола.",
      },
      options: [
        { id: "a", text: "She live in Oslo." },
        { id: "b", text: "She lives in Oslo." },
        { id: "c", text: "She living in Oslo." },
      ],
      correctOptionId: "b",
      explanation: {
        en: "In he/she/it we add -s: “lives”.",
        nb: "I tredje person entall får verbet -s: «lives».",
        ru: "В 3‑ем лице ед. числа глагол получает окончание -s: «lives».",
      },
    },
    {
      id: "e4",
      type: "order",
      points: 2,
      prompt: {
        en: "Put the words in order to make a polite phrase.",
        nb: "Sett ordene i riktig rekkefølge til en høflig frase.",
        ru: "Расставьте слова, чтобы получить вежливую фразу.",
      },
      tokens: makeTokens("e4", ["Nice", "to", "meet", "you."]),
      correctSentence: "Nice to meet you.",
      correctDisplay: "Nice to meet you.",
      explanation: {
        en: "“Nice to meet you.” is a standard phrase when you meet someone for the first time.",
        nb: "«Nice to meet you.» brukes når du møter noen for første gang.",
        ru: "«Nice to meet you.» — стандартная фраза при первом знакомстве.",
      },
    },
    {
      id: "e5",
      type: "fill",
      points: 1,
      prompt: {
        en: 'Fill the blank: “You ___ my friend.”',
        nb: "Fyll inn: «You ___ my friend.»",
        ru: "Заполните: «You ___ my friend.»",
      },
      placeholder: { en: "are", nb: "are", ru: "are" },
      accepted: ["are"],
      correctDisplay: "are",
      explanation: {
        en: "With “you” we use “are”.",
        nb: "Med «you» bruker vi «are».",
        ru: "С «you» используется «are».",
      },
    },
    {
      id: "e6",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the correct negative sentence.",
        nb: "Velg riktig negativ setning.",
        ru: "Выберите правильное отрицательное предложение.",
      },
      options: [
        { id: "a", text: "I not like coffee." },
        { id: "b", text: "I don't like coffee." },
        { id: "c", text: "I doesn't like coffee." },
      ],
      correctOptionId: "b",
      explanation: {
        en: "With I/we/you/they we use “don't”.",
        nb: "Med I/we/you/they bruker vi «don't».",
        ru: "С I/we/you/they используется «don't».",
      },
    },
    {
      id: "e7",
      type: "single",
      points: 1,
      prompt: {
        en: 'Choose the correct preposition: “I live ___ Oslo.”',
        nb: "Velg riktig preposisjon: «I live ___ Oslo.»",
        ru: "Выберите предлог: «I live ___ Oslo.»",
      },
      options: [
        { id: "a", text: "in" },
        { id: "b", text: "on" },
        { id: "c", text: "at" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "Cities → “in”.",
        nb: "Byer → «in».",
        ru: "Города → «in».",
      },
    },
    {
      id: "e8",
      type: "fill",
      points: 1,
      prompt: {
        en: "Write the number 12 in English.",
        nb: "Skriv tallet 12 på engelsk.",
        ru: "Напишите число 12 по‑английски.",
      },
      placeholder: { en: "twelve", nb: "twelve", ru: "twelve" },
      accepted: ["twelve"],
      correctDisplay: "twelve",
      explanation: {
        en: "12 = twelve.",
        nb: "12 = twelve.",
        ru: "12 = twelve.",
      },
    },
    {
      id: "e9",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange the words into a sentence.",
        nb: "Sett ordene i riktig rekkefølge.",
        ru: "Соберите предложение.",
      },
      tokens: makeTokens("e9", ["I", "like", "coffee."]),
      correctSentence: "I like coffee.",
      correctDisplay: "I like coffee.",
      explanation: {
        en: "Basic word order: subject + verb + object.",
        nb: "Grunnordstilling: subjekt + verb + objekt.",
        ru: "Базовый порядок слов: подлежащее + глагол + дополнение.",
      },
    },
    {
      id: "e10",
      type: "single",
      points: 1,
      prompt: {
        en: "Dialogue: “How are you?” Choose the best reply.",
        nb: "Dialog: «How are you?» Velg best svar.",
        ru: "Диалог: «How are you?» Выберите лучший ответ.",
      },
      options: [
        { id: "a", text: "I'm fine, thanks." },
        { id: "b", text: "I from Spain." },
        { id: "c", text: "Yes, please." },
      ],
      correctOptionId: "a",
      explanation: {
        en: "A common polite reply is “I'm fine, thanks.”",
        nb: "Et vanlig svar er «I'm fine, thanks.»",
        ru: "Обычно отвечают: «I'm fine, thanks.»",
      },
    },
    {
      id: "e11",
      type: "single",
      points: 1,
      prompt: { en: "Choose the correct article: ___ apple.", nb: "Velg artikkel: ___ apple.", ru: "Выберите артикль: ___ apple." },
      options: [
        { id: "a", text: "a" },
        { id: "b", text: "an" },
        { id: "c", text: "the" },
      ],
      correctOptionId: "b",
      explanation: { en: "Before a vowel sound we use “an”.", nb: "Før vokallyd bruker vi «an».", ru: "Перед гласным звуком используется «an»." },
    },
    {
      id: "e12",
      type: "fill",
      points: 1,
      prompt: { en: 'Fill: “He ___ a teacher.”', nb: "Fyll inn: «He ___ a teacher.»", ru: "Заполните: «He ___ a teacher.»" },
      placeholder: { en: "is", nb: "is", ru: "is" },
      accepted: ["is"],
      correctDisplay: "is",
      explanation: { en: "He/she/it → “is”.", nb: "He/she/it → «is».", ru: "He/she/it → «is»." },
    },
    {
      id: "e13",
      type: "single",
      points: 1,
      prompt: { en: "Choose the correct plural.", nb: "Velg riktig flertall.", ru: "Выберите множественное число." },
      options: [
        { id: "a", text: "two book" },
        { id: "b", text: "two books" },
        { id: "c", text: "two bookes" },
      ],
      correctOptionId: "b",
      explanation: { en: "Regular plural: book → books.", nb: "Regelmessig flertall: book → books.", ru: "Обычное мн. число: book → books." },
    },
    {
      id: "e14",
      type: "order",
      points: 2,
      prompt: { en: "Arrange the sentence.", nb: "Sett sammen setningen.", ru: "Соберите предложение." },
      tokens: makeTokens("e14", ["Can", "I", "have", "a", "coffee,", "please?"]),
      correctSentence: "Can I have a coffee, please?",
      correctDisplay: "Can I have a coffee, please?",
      explanation: { en: "A polite café request.", nb: "En høflig bestilling.", ru: "Вежливый заказ в кафе." },
    },
    {
      id: "e15",
      type: "single",
      points: 1,
      prompt: { en: "Pick the correct question word: ___ are you from?", nb: "Velg spørreord: ___ are you from?", ru: "Выберите слово: ___ are you from?" },
      options: [
        { id: "a", text: "Where" },
        { id: "b", text: "When" },
        { id: "c", text: "Why" },
      ],
      correctOptionId: "a",
      explanation: { en: "“Where” asks about place.", nb: "«Where» spør om sted.", ru: "«Where» спрашивает о месте." },
    },
    {
      id: "e16",
      type: "fill",
      points: 1,
      prompt: { en: "Write the opposite of “big”.", nb: "Skriv motsatt av «big».", ru: "Напишите антоним к “big”." },
      placeholder: { en: "small", nb: "small", ru: "small" },
      accepted: ["small"],
      correctDisplay: "small",
      explanation: { en: "big ↔ small.", nb: "big ↔ small.", ru: "big ↔ small." },
    },
  ];

  const questionsEnA2: DemoQuestion[] = [
    {
      id: "eA2_1",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best sentence for talking about your daily routine.",
        nb: "Velg setningen som passer best for en daglig rutine.",
        ru: "Выберите предложение, которое лучше всего описывает распорядок дня.",
      },
      options: [
        { id: "a", text: "I get up at seven o'clock." },
        { id: "b", text: "I up get at seven o'clock." },
        { id: "c", text: "Get I up at seven o'clock." },
      ],
      correctOptionId: "a",
      explanation: {
        en: "Normal word order in English is subject + verb: “I get up …”.",
        nb: "Normal ordstilling på engelsk er subjekt + verb: «I get up …».",
        ru: "Обычный порядок слов в английском — подлежащее + сказуемое: «I get up …».",
      },
    },
    {
      id: "eA2_2",
      type: "fill",
      points: 1,
      prompt: {
        en: 'Fill in the verb: “After work I ___ dinner.”',
        nb: "Fyll inn verbet: «After work I ___ dinner.»",
        ru: "Вставьте глагол: «After work I ___ dinner.»",
      },
      placeholder: {
        en: "cook / make",
        nb: "cook / make",
        ru: "cook / make",
      },
      accepted: ["cook", "make"],
      correctDisplay: "cook / make",
      explanation: {
        en: "You can say “cook dinner” or “make dinner”.",
        nb: "På engelsk kan du si «cook dinner» eller «make dinner».",
        ru: "По‑английски можно сказать «cook dinner» или «make dinner».",
      },
    },
    {
      id: "eA2_3",
      type: "single",
      points: 1,
      prompt: {
        en: "Which sentence sounds most natural?",
        nb: "Hvilken setning høres mest naturlig ut?",
        ru: "Какое предложение звучит наиболее естественно?",
      },
      options: [
        { id: "a", text: "In the evening I usually read a book." },
        { id: "b", text: "Usually read I in the evening a book." },
        { id: "c", text: "I in evening usually read book." },
      ],
      correctOptionId: "a",
      explanation: {
        en: "Adverbs like “usually” normally go before the main verb: “I usually read …”.",
        nb: "Adverb som «usually» står ofte foran hovedverbet: «I usually read …».",
        ru: "Наречия типа «usually» обычно стоят перед смысловым глаголом: «I usually read …».",
      },
    },
    {
      id: "eA2_4",
      type: "order",
      points: 2,
      prompt: {
        en: "Make a sentence about your free time.",
        nb: "Sett sammen en setning om fritida.",
        ru: "Соберите предложение о свободном времени.",
      },
      tokens: makeTokens("eA2_4", ["On", "Sundays", "we", "like", "to", "go", "for", "a", "walk."]),
      correctSentence: "On Sundays we like to go for a walk.",
      correctDisplay: "On Sundays we like to go for a walk.",
      explanation: {
        en: "Time expression first, then subject + verb: “On Sundays we like …”.",
        nb: "Tidsuttrykk først, deretter subjekt + verb: «On Sundays we like …».",
        ru: "Сначала обстоятельство времени, затем подлежащее + сказуемое: «On Sundays we like …».",
      },
    },
    {
      id: "eA2_5",
      type: "single",
      points: 1,
      prompt: { en: "Choose the correct past tense.", nb: "Velg riktig fortid.", ru: "Выберите прошедшее время." },
      options: [
        { id: "a", text: "Yesterday I go to work." },
        { id: "b", text: "Yesterday I went to work." },
        { id: "c", text: "Yesterday I goed to work." },
      ],
      correctOptionId: "b",
      explanation: { en: "Past of “go” is “went”.", nb: "Fortid av «go» er «went».", ru: "Прошедшее от «go» — «went»." },
    },
    {
      id: "eA2_6",
      type: "fill",
      points: 1,
      prompt: { en: 'Fill in the preposition: “I start work ___ 9:00.”', nb: "Fyll inn: «I start work ___ 9:00.»", ru: "Заполните: «I start work ___ 9:00.»" },
      placeholder: { en: "at", nb: "at", ru: "at" },
      accepted: ["at"],
      correctDisplay: "at",
      explanation: { en: "We use “at” with clock times.", nb: "Vi bruker «at» med klokkeslett.", ru: "С временем на часах используется «at»." },
    },
    {
      id: "eA2_7",
      type: "single",
      points: 1,
      prompt: { en: "Choose the correct comparative.", nb: "Velg riktig komparativ.", ru: "Выберите сравнительную степень." },
      options: [
        { id: "a", text: "more big" },
        { id: "b", text: "bigger" },
        { id: "c", text: "biggest" },
      ],
      correctOptionId: "b",
      explanation: { en: "big → bigger → biggest.", nb: "big → bigger → biggest.", ru: "big → bigger → biggest." },
    },
    {
      id: "eA2_8",
      type: "fill",
      points: 1,
      prompt: { en: 'Fill the connector: “I stayed home ___ I was tired.”', nb: "Fyll inn: «I stayed home ___ I was tired.»", ru: "Заполните: «I stayed home ___ I was tired.»" },
      placeholder: { en: "because", nb: "because", ru: "because" },
      accepted: ["because"],
      correctDisplay: "because",
      explanation: { en: "“because” introduces a reason.", nb: "«because» introduserer en grunn.", ru: "«because» вводит причину." },
    },
    {
      id: "eA2_9",
      type: "order",
      points: 2,
      prompt: { en: "Arrange the sentence.", nb: "Sett sammen setningen.", ru: "Соберите предложение." },
      tokens: makeTokens("eA2_9", ["After", "work", "I", "usually", "read", "a", "book."]),
      correctSentence: "After work I usually read a book.",
      correctDisplay: "After work I usually read a book.",
      explanation: { en: "Adverb “usually” goes before the main verb.", nb: "Adverbet «usually» står ofte foran hovedverbet.", ru: "Наречие «usually» обычно стоит перед смысловым глаголом." },
    },
    {
      id: "eA2_10",
      type: "single",
      points: 1,
      prompt: { en: "Dialogue: “What would you like to drink?” Choose the best reply.", nb: "Dialog: Velg best svar.", ru: "Диалог: выберите лучший ответ." },
      options: [
        { id: "a", text: "I would like a coffee, please." },
        { id: "b", text: "Because it's sunny." },
        { id: "c", text: "At nine o'clock." },
      ],
      correctOptionId: "a",
      explanation: { en: "This is a polite order in a café.", nb: "Dette er en høflig bestilling.", ru: "Это вежливый заказ в кафе." },
    },
    {
      id: "eA2_11",
      type: "single",
      points: 1,
      prompt: { en: "Choose the correct sentence with “some”.", nb: "Velg riktig setning med «some».", ru: "Выберите предложение с «some»." },
      options: [
        { id: "a", text: "I have some time." },
        { id: "b", text: "I have a some time." },
        { id: "c", text: "I have some times." },
      ],
      correctOptionId: "a",
      explanation: { en: "“some” can be used with uncountable nouns like “time”.", nb: "«some» kan brukes med utellelige ord som «time».", ru: "«some» можно использовать с неисчисляемыми, например “time”." },
    },
    {
      id: "eA2_12",
      type: "fill",
      points: 1,
      prompt: { en: 'Fill the verb: “I ___ to the cinema last week.”', nb: "Fyll inn: «I ___ to the cinema last week.»", ru: "Заполните: «I ___ to the cinema last week.»" },
      placeholder: { en: "went", nb: "went", ru: "went" },
      accepted: ["went"],
      correctDisplay: "went",
      explanation: { en: "Past of “go” is “went”.", nb: "Fortid av «go» er «went».", ru: "Прошедшее от “go” — “went”." },
    },
    {
      id: "eA2_13",
      type: "single",
      points: 1,
      prompt: { en: "Choose the correct question.", nb: "Velg riktig spørsmål.", ru: "Выберите правильный вопрос." },
      options: [
        { id: "a", text: "Do you like coffee?" },
        { id: "b", text: "Like you coffee?" },
        { id: "c", text: "You do like coffee?" },
      ],
      correctOptionId: "a",
      explanation: { en: "In present simple questions we use do/does.", nb: "I spørsmål bruker vi do/does i presens.", ru: "В вопросах Present Simple используется do/does." },
    },
    {
      id: "eA2_14",
      type: "order",
      points: 2,
      prompt: { en: "Arrange the question.", nb: "Sett sammen spørsmålet.", ru: "Соберите вопрос." },
      tokens: makeTokens("eA2_14", ["Where", "do", "you", "work?"]),
      correctSentence: "Where do you work?",
      correctDisplay: "Where do you work?",
      explanation: { en: "Question word + do + subject + verb.", nb: "Spørreord + do + subjekt + verb.", ru: "Вопр. слово + do + подлежащее + глагол." },
    },
    {
      id: "eA2_15",
      type: "fill",
      points: 1,
      prompt: { en: 'Fill the preposition: “I’m good ___ languages.”', nb: "Fyll inn: «I’m good ___ languages.»", ru: "Заполните: «I’m good ___ languages.»" },
      placeholder: { en: "at", nb: "at", ru: "at" },
      accepted: ["at"],
      correctDisplay: "at",
      explanation: { en: "We say “good at …”.", nb: "Vi sier «good at …».", ru: "Говорят “good at …”." },
    },
    {
      id: "eA2_16",
      type: "single",
      points: 1,
      prompt: { en: "Dialogue: “Can you help me?” Choose the best reply.", nb: "Dialog: Velg best svar.", ru: "Диалог: выберите лучший ответ." },
      options: [
        { id: "a", text: "Sure, of course." },
        { id: "b", text: "At nine o'clock." },
        { id: "c", text: "Because I'm tired." },
      ],
      correctOptionId: "a",
      explanation: { en: "A friendly reply: “Sure, of course.”", nb: "Vennlig svar: «Sure, of course.»", ru: "Дружелюбный ответ: “Sure, of course.”" },
    },
  ];

  const questionsEnB1: DemoQuestion[] = [
    {
      id: "eB1_1",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best connector.",
        nb: "Velg det beste bindeordet.",
        ru: "Выберите подходящий союз.",
      },
      options: [
        { id: "a", text: "and" },
        { id: "b", text: "but" },
        { id: "c", text: "because" },
      ],
      correctOptionId: "c",
      explanation: {
        en: "In “I am happy because I have good friends.” we need the connector of reason.",
        nb: "I setningen «I am happy because I have good friends.» trenger vi en årsaksbindeord.",
        ru: "В предложении «I am happy because I have good friends.» нужен союз причины «because».",
      },
    },
    {
      id: "eB1_2",
      type: "fill",
      points: 1,
      prompt: {
        en: 'Fill in: “If it ___ tomorrow, we will stay at home.”',
        nb: "Fyll inn: «If it ___ tomorrow, we will stay at home.»",
        ru: "Дополните: «If it ___ tomorrow, we will stay at home.»",
      },
      placeholder: {
        en: "rains",
        nb: "rains",
        ru: "rains",
      },
      accepted: ["rains"],
      correctDisplay: "rains",
      explanation: {
        en: "In first conditional we use present simple after “if”: “If it rains …”.",
        nb: "I «first conditional» bruker vi presens etter «if»: «If it rains …».",
        ru: "В первом условном после «if» ставится Present Simple: «If it rains …».",
      },
    },
    {
      id: "eB1_3",
      type: "order",
      points: 2,
      prompt: {
        en: "Make a sentence with a contrast.",
        nb: "Sett sammen en setning med motsetning.",
        ru: "Соберите предложение с противопоставлением.",
      },
      tokens: makeTokens("eB1_3", ["Although", "it", "is", "late,", "I", "am", "not", "tired."]),
      correctSentence: "Although it is late, I am not tired.",
      correctDisplay: "Although it is late, I am not tired.",
      explanation: {
        en: "“Although …” introduces a contrast between two ideas.",
        nb: "«Although …» innleder en motsetning mellom to ideer.",
        ru: "«Although …» вводит противопоставление двух идей.",
      },
    },
    {
      id: "eB1_4",
      type: "single",
      points: 1,
      prompt: {
        en: "Pick the best meaning of “everyday life”.",
        nb: "Velg beste betydning av «everyday life».",
        ru: "Выберите лучший перевод выражения «everyday life».",
      },
      options: [
        { id: "a", text: "a holiday" },
        { id: "b", text: "normal life / daily routine" },
        { id: "c", text: "a party" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“everyday life” is about normal days, not special events.",
        nb: "«everyday life» handler om vanlige dager, ikke spesielle hendelser.",
        ru: "«everyday life» — это обычная, повседневная жизнь, а не праздники.",
      },
    },
    {
      id: "eB1_5",
      type: "fill",
      points: 1,
      prompt: {
        en: 'Fill in: “I ___ never been to Norway.”',
        nb: "Fyll inn: «I ___ never been to Norway.»",
        ru: "Заполните: «I ___ never been to Norway.»",
      },
      placeholder: { en: "have", nb: "have", ru: "have" },
      accepted: ["have"],
      correctDisplay: "have",
      explanation: {
        en: "Present perfect: “I have been …”.",
        nb: "Presens perfektum: «I have been …».",
        ru: "Present Perfect: «I have been …».",
      },
    },
    {
      id: "eB1_6",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the sentence with correct indirect question word order.",
        nb: "Velg setningen med riktig ordstilling i indirekte spørsmål.",
        ru: "Выберите предложение с правильным порядком слов в косвенном вопросе.",
      },
      options: [
        { id: "a", text: "I don't know where does he live." },
        { id: "b", text: "I don't know where he lives." },
        { id: "c", text: "I don't know where lives he." },
      ],
      correctOptionId: "b",
      explanation: {
        en: "In indirect questions we use normal word order: subject + verb.",
        nb: "I indirekte spørsmål bruker vi normal ordstilling: subjekt + verb.",
        ru: "В косвенных вопросах обычный порядок: подлежащее + глагол.",
      },
    },
    {
      id: "eB1_7",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange the sentence with a reason.",
        nb: "Sett sammen en setning med grunn.",
        ru: "Соберите предложение с причиной.",
      },
      tokens: makeTokens("eB1_7", ["Because", "I", "was", "tired,", "I", "went", "home."]),
      correctSentence: "Because I was tired, I went home.",
      correctDisplay: "Because I was tired, I went home.",
      explanation: {
        en: "“Because …” introduces the reason.",
        nb: "«Because …» introduserer grunnen.",
        ru: "«Because …» вводит причину.",
      },
    },
    {
      id: "eB1_8",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best advice sentence.",
        nb: "Velg den beste setningen for råd.",
        ru: "Выберите лучшее предложение с советом.",
      },
      options: [
        { id: "a", text: "You should see a doctor." },
        { id: "b", text: "You see a doctor yesterday." },
        { id: "c", text: "You must to see a doctor." },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“should” is used for advice.",
        nb: "«should» brukes for råd.",
        ru: "«should» используется для советов.",
      },
    },
    {
      id: "eB1_9",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill the connector: “It was raining. ___, we went for a walk.”",
        nb: "Fyll inn bindeordet: «It was raining. ___, we went for a walk.»",
        ru: "Вставьте связку: «It was raining. ___, we went for a walk.»",
      },
      placeholder: { en: "however", nb: "however", ru: "however" },
      accepted: ["however"],
      correctDisplay: "however",
      explanation: {
        en: "“however” shows contrast between two sentences.",
        nb: "«however» viser en kontrast.",
        ru: "«however» показывает противопоставление.",
      },
    },
    {
      id: "eB1_10",
      type: "single",
      points: 1,
      prompt: {
        en: "Dialogue: “Could you help me?” Choose the best reply.",
        nb: "Dialog: Velg best svar.",
        ru: "Диалог: выберите лучший ответ.",
      },
      options: [
        { id: "a", text: "Sure, no problem." },
        { id: "b", text: "Because I was tired." },
        { id: "c", text: "Where does he live?" },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“Sure, no problem.” is a friendly reply.",
        nb: "«Sure, no problem.» er et vennlig svar.",
        ru: "«Sure, no problem.» — дружелюбный ответ.",
      },
    },
    {
      id: "eB1_11",
      type: "single",
      points: 1,
      prompt: { en: "Choose the best meaning of “to figure out”.", nb: "Velg beste betydning av «to figure out».", ru: "Выберите лучший перевод «to figure out»." },
      options: [
        { id: "a", text: "to understand / to find an answer" },
        { id: "b", text: "to sleep" },
        { id: "c", text: "to forget" },
      ],
      correctOptionId: "a",
      explanation: { en: "“figure out” means understand/solve.", nb: "«figure out» betyr forstå/løse.", ru: "«figure out» = «разобраться / понять»." },
    },
    {
      id: "eB1_12",
      type: "fill",
      points: 1,
      prompt: { en: "Fill the tense: “I have ___ this movie before.”", nb: "Fyll inn: «I have ___ this movie before.»", ru: "Заполните: «I have ___ this movie before.»" },
      placeholder: { en: "seen", nb: "seen", ru: "seen" },
      accepted: ["seen"],
      correctDisplay: "seen",
      explanation: { en: "Present perfect: have + past participle (seen).", nb: "Presens perfektum: have + partisipp (seen).", ru: "Present Perfect: have + V3 (seen)." },
    },
    {
      id: "eB1_13",
      type: "single",
      points: 1,
      prompt: { en: "Choose the correct relative pronoun.", nb: "Velg riktig relativpronomen.", ru: "Выберите относительное местоимение." },
      options: [
        { id: "a", text: "The person which called me is my teacher." },
        { id: "b", text: "The person who called me is my teacher." },
        { id: "c", text: "The person where called me is my teacher." },
      ],
      correctOptionId: "b",
      explanation: { en: "For people we use “who”.", nb: "For personer bruker vi «who».", ru: "Для людей — «who»." },
    },
    {
      id: "eB1_14",
      type: "order",
      points: 2,
      prompt: { en: "Arrange the sentence with an indirect question.", nb: "Sett sammen setningen med indirekte spørsmål.", ru: "Соберите предложение с косвенным вопросом." },
      tokens: makeTokens("eB1_14", ["Can", "you", "tell", "me", "where", "he", "lives?"]),
      correctSentence: "Can you tell me where he lives?",
      correctDisplay: "Can you tell me where he lives?",
      explanation: { en: "Indirect question uses normal word order: he lives.", nb: "Indirekte spørsmål: normal ordstilling.", ru: "В косвенном вопросе обычный порядок слов." },
    },
    {
      id: "eB1_15",
      type: "fill",
      points: 1,
      prompt: { en: "Fill the connector: “I wanted to go, ___ I had to work.”", nb: "Fyll inn: «I wanted to go, ___ I had to work.»", ru: "Вставьте: «I wanted to go, ___ I had to work.»" },
      placeholder: { en: "but", nb: "but", ru: "but" },
      accepted: ["but"],
      correctDisplay: "but",
      explanation: { en: "“but” introduces contrast.", nb: "«but» innleder kontrast.", ru: "«but» вводит противопоставление." },
    },
    {
      id: "eB1_16",
      type: "single",
      points: 1,
      prompt: { en: "Dialogue: “I’m not sure.” Choose the best reply.", nb: "Dialog: Velg best svar.", ru: "Диалог: выберите лучший ответ." },
      options: [
        { id: "a", text: "No worries, take your time." },
        { id: "b", text: "Because it's raining." },
        { id: "c", text: "At nine o'clock." },
      ],
      correctOptionId: "a",
      explanation: { en: "A supportive reply: “No worries, take your time.”", nb: "Støttende svar.", ru: "Поддерживающий ответ." },
    },
  ];

  const questionsEnB2: DemoQuestion[] = [
    {
      id: "eB2_1",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the sentence with the most natural formal style.",
        nb: "Velg setningen som har mest naturlig formell stil.",
        ru: "Выберите предложение с наиболее естественным формальным стилем.",
      },
      options: [
        { id: "a", text: "I would like to apply for this position." },
        { id: "b", text: "Give me this job, please." },
        { id: "c", text: "I want this job now." },
      ],
      correctOptionId: "a",
      explanation: {
        en: "“I would like to …” sounds polite and formal in applications.",
        nb: "«I would like to …» høres høflig og formelt ut i søknader.",
        ru: "«I would like to …» — вежливая и формальная формула для заявлений.",
      },
    },
    {
      id: "eB2_2",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill in the participle: “The letter is ___ and ready to send.”",
        nb: "Fyll inn perfektum partisipp: «The letter is ___ and ready to send.»",
        ru: "Дополните причастие: «The letter is ___ and ready to send.»",
      },
      placeholder: {
        en: "written",
        nb: "written",
        ru: "written",
      },
      accepted: ["written"],
      correctDisplay: "written",
      explanation: {
        en: "From “to write” we get the participle “written”.",
        nb: "Av «to write» får vi partisippet «written».",
        ru: "От глагола «to write» образуется причастие «written».",
      },
    },
    {
      id: "eB2_3",
      type: "order",
      points: 2,
      prompt: {
        en: "Build a sentence with an introductory clause.",
        nb: "Sett sammen en setning med innledende ledd.",
        ru: "Соберите предложение с вводной частью.",
      },
      tokens: makeTokens(
        "eB2_3",
        ["Even", "though", "the", "weather", "is", "bad,", "I", "want", "to", "go", "for", "a", "walk."],
      ),
      correctSentence: "Even though the weather is bad, I want to go for a walk.",
      correctDisplay: "Even though the weather is bad, I want to go for a walk.",
      explanation: {
        en: "“Even though …” introduces a strong contrast, typical at B2 level.",
        nb: "«Even though …» introduserer en sterk motsetning, typisk på B2‑nivå.",
        ru: "«Even though …» передаёт сильное противопоставление, типично для уровня B2.",
      },
    },
    {
      id: "eB2_4",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best connector meaning “however”.",
        nb: "Velg bindeordet som betyr «however».",
        ru: "Выберите связку со значением «однако».",
      },
      options: [
        { id: "a", text: "therefore" },
        { id: "b", text: "however" },
        { id: "c", text: "because" },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“however” shows contrast between two sentences.",
        nb: "«however» viser kontrast.",
        ru: "«however» показывает противопоставление.",
      },
    },
    {
      id: "eB2_5",
      type: "fill",
      points: 1,
      prompt: {
        en: 'Fill the verb: “If I ___ time, I would travel more.”',
        nb: "Fyll inn verbet: «If I ___ time, I would travel more.»",
        ru: "Заполните: «If I ___ time, I would travel more.»",
      },
      placeholder: { en: "had", nb: "had", ru: "had" },
      accepted: ["had"],
      correctDisplay: "had",
      explanation: {
        en: "Second conditional uses past simple after “if”: “If I had …”.",
        nb: "«Second conditional» bruker fortid etter «if»: «If I had …».",
        ru: "Во 2‑м условном после «if» Past Simple: «If I had …».",
      },
    },
    {
      id: "eB2_6",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the most natural formal sentence.",
        nb: "Velg den mest naturlige formelle setningen.",
        ru: "Выберите наиболее естественное формальное предложение.",
      },
      options: [
        { id: "a", text: "I appreciate your feedback." },
        { id: "b", text: "Give me feedback now." },
        { id: "c", text: "Feedback is cool." },
      ],
      correctOptionId: "a",
      explanation: {
        en: "This is a polite formal phrasing for emails.",
        nb: "Dette er en høflig formell formulering i e-post.",
        ru: "Это вежливая формальная формулировка для писем.",
      },
    },
    {
      id: "eB2_7",
      type: "order",
      points: 2,
      prompt: {
        en: "Arrange the conditional sentence.",
        nb: "Sett sammen en betingelsessetning.",
        ru: "Соберите условное предложение.",
      },
      tokens: makeTokens("eB2_7", ["If", "I", "had", "time,", "I", "would", "travel."]),
      correctSentence: "If I had time, I would travel.",
      correctDisplay: "If I had time, I would travel.",
      explanation: {
        en: "B2 often includes hypotheticals: “If I had … I would …”.",
        nb: "På B2 øver man ofte på hypotetiske setninger.",
        ru: "На уровне B2 часто тренируют гипотетические конструкции.",
      },
    },
    {
      id: "eB2_8",
      type: "fill",
      points: 1,
      prompt: {
        en: "Fill a common formal closing for an email: “___ regards,”",
        nb: "Fyll inn en vanlig formell avslutning: «___ regards,»",
        ru: "Вставьте формальное завершение письма: «___ regards,»",
      },
      placeholder: { en: "Kind", nb: "Kind", ru: "Kind" },
      accepted: ["kind"],
      correctDisplay: "Kind",
      explanation: {
        en: "“Kind regards,” is a common formal closing.",
        nb: "«Kind regards,» er en vanlig formell avslutning.",
        ru: "«Kind regards,» — распространённое формальное завершение письма.",
      },
    },
    {
      id: "eB2_9",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the best sentence with “despite”.",
        nb: "Velg den beste setningen med «despite».",
        ru: "Выберите лучшее предложение с «despite».",
      },
      options: [
        { id: "a", text: "Despite it was raining, we went out." },
        { id: "b", text: "Despite the rain, we went out." },
        { id: "c", text: "Despite we went out, it was raining." },
      ],
      correctOptionId: "b",
      explanation: {
        en: "“Despite” is followed by a noun phrase: “Despite the rain …”.",
        nb: "Etter «despite» kommer ofte et substantivuttrykk.",
        ru: "После «despite» обычно идёт именная группа.",
      },
    },
    {
      id: "eB2_10",
      type: "single",
      points: 1,
      prompt: {
        en: "Choose the sentence with correct passive form.",
        nb: "Velg setningen med riktig passiv.",
        ru: "Выберите предложение с правильной формой пассива.",
      },
      options: [
        { id: "a", text: "The report was write yesterday." },
        { id: "b", text: "The report was written yesterday." },
        { id: "c", text: "The report written yesterday." },
      ],
      correctOptionId: "b",
      explanation: {
        en: "Passive: was + past participle (“written”).",
        nb: "Passiv: was + perfektum partisipp («written»).",
        ru: "Пассив: was + причастие прошедшего времени («written»).",
      },
    },
    {
      id: "eB2_11",
      type: "single",
      points: 1,
      prompt: { en: "Choose the best formal email closing.", nb: "Velg beste formelle avslutning.", ru: "Выберите лучшее формальное завершение письма." },
      options: [
        { id: "a", text: "See ya!" },
        { id: "b", text: "Kind regards," },
        { id: "c", text: "Bye-bye!" },
      ],
      correctOptionId: "b",
      explanation: { en: "“Kind regards,” is a standard formal closing.", nb: "«Kind regards,» er standard formelt.", ru: "«Kind regards,» — стандартное формальное завершение." },
    },
    {
      id: "eB2_12",
      type: "fill",
      points: 1,
      prompt: { en: 'Fill the verb: “It is important to ___ attention to details.”', nb: "Fyll inn: «… to ___ attention …»", ru: "Заполните: «… to ___ attention …»" },
      placeholder: { en: "pay", nb: "pay", ru: "pay" },
      accepted: ["pay"],
      correctDisplay: "pay",
      explanation: { en: "Collocation: pay attention.", nb: "Fast uttrykk: pay attention.", ru: "Устойчивое: pay attention." },
    },
    {
      id: "eB2_13",
      type: "single",
      points: 1,
      prompt: { en: "Choose the correct reported speech.", nb: "Velg riktig indirekte tale.", ru: "Выберите правильную косвенную речь." },
      options: [
        { id: "a", text: "He said that he is busy." },
        { id: "b", text: "He said that he was busy." },
        { id: "c", text: "He said that was he busy." },
      ],
      correctOptionId: "b",
      explanation: { en: "With past reporting verb, present often shifts to past: is → was.", nb: "Med fortid i rapportering skifter ofte is → was.", ru: "При сказуемом в прошедшем часто is → was." },
    },
    {
      id: "eB2_14",
      type: "order",
      points: 2,
      prompt: { en: "Arrange the sentence with contrast.", nb: "Sett sammen setningen med kontrast.", ru: "Соберите предложение с противопоставлением." },
      tokens: makeTokens("eB2_14", ["Although", "I", "was", "tired,", "I", "kept", "working."]),
      correctSentence: "Although I was tired, I kept working.",
      correctDisplay: "Although I was tired, I kept working.",
      explanation: { en: "Although introduces contrast.", nb: "Although introduserer kontrast.", ru: "Although вводит противопоставление." },
    },
    {
      id: "eB2_15",
      type: "fill",
      points: 1,
      prompt: { en: "Fill the modal: “You ___ have told me earlier.”", nb: "Fyll inn: «You ___ have told me earlier.»", ru: "Заполните: «You ___ have told me earlier.»" },
      placeholder: { en: "should", nb: "should", ru: "should" },
      accepted: ["should"],
      correctDisplay: "should",
      explanation: { en: "“should have + V3” expresses criticism/regret about the past.", nb: "«should have + V3» brukes om kritikk/angring i fortid.", ru: "«should have + V3» — упрёк/сожаление о прошлом." },
    },
    {
      id: "eB2_16",
      type: "single",
      points: 1,
      prompt: { en: "Choose the best sentence with “not only … but also …”.", nb: "Velg beste setning.", ru: "Выберите лучшее предложение." },
      options: [
        { id: "a", text: "Not only he studied, but also worked." },
        { id: "b", text: "He not only studied, but also worked." },
        { id: "c", text: "He studied, not only but also worked." },
      ],
      correctOptionId: "b",
      explanation: { en: "Correct placement: “He not only … but also …”.", nb: "Riktig plassering: «He not only … but also …».", ru: "Правильно: «He not only … but also …»." },
    },
  ];

  // For English stream use the dedicated English question sets.
  if (stream === "english") {
    if (level === "A2") return questionsEnA2;
    if (level === "B1") return questionsEnB1;
    if (level === "B2") return questionsEnB2;
    return questionsEnA1;
  }

  if (level === "A2") return questionsA2;
  if (level === "B1") return questionsB1;
  if (level === "B2") return questionsB2;
  return questionsA1;
};

const buildDemoPacks = (stream: Stream, level: Level): DemoTestPack[] => {
  const questions = buildDemoQuestions(stream, level);
  const seedFromString = (value: string) => {
    let h = 2166136261;
    for (let i = 0; i < value.length; i += 1) {
      h ^= value.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  };

  const mulberry32 = (seed: number) => {
    let t = seed >>> 0;
    return () => {
      t += 0x6d2b79f5;
      let x = Math.imul(t ^ (t >>> 15), 1 | t);
      x ^= x + Math.imul(x ^ (x >>> 7), 61 | x);
      return ((x ^ (x >>> 14)) >>> 0) / 4294967296;
    };
  };

  const shuffleWithSeed = <T,>(items: T[], seed: number) => {
    const rnd = mulberry32(seed);
    const next = [...items];
    for (let i = next.length - 1; i > 0; i -= 1) {
      const j = Math.floor(rnd() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  };

  const rotate = <T,>(items: T[], by: number) => {
    if (items.length === 0) return items;
    const n = ((by % items.length) + items.length) % items.length;
    return items.slice(n).concat(items.slice(0, n));
  };

  const variant = (packKey: string, base: DemoQuestion[], rotateBy: number) => {
    const rotated = rotate(base, rotateBy);
    const seed = seedFromString(`${stream}:${level}:${packKey}`);
    const withOptionShuffle = rotated.map((q) => {
      if (q.type !== "single") return q;
      return { ...q, options: shuffleWithSeed(q.options, seedFromString(`${seed}:${q.id}:opt`)) };
    });
    return shuffleWithSeed(withOptionShuffle, seedFromString(`${seed}:qorder`)).slice(0, 10);
  };

  const test1 = variant("test1", questions, 0);
  const test2 = variant("test2", questions, 3);
  const test3 = variant("test3", questions, 6);
  const test4 = variant("test4", questions, 9);

  return [
    {
      id: `${stream}-${level}-test-1`,
      title: { en: "Test 1", nb: "Test 1", ru: "Тест 1" },
      subtitle: { en: "Practice set A (10 questions).", nb: "Øvingssett A (10 oppgaver).", ru: "Набор A (10 вопросов)." },
      stream,
      level,
      questions: test1,
    },
    {
      id: `${stream}-${level}-test-2`,
      title: { en: "Test 2", nb: "Test 2", ru: "Тест 2" },
      subtitle: { en: "Practice set B (10 questions).", nb: "Øvingssett B (10 oppgaver).", ru: "Набор B (10 вопросов)." },
      stream,
      level,
      questions: test2,
    },
    {
      id: `${stream}-${level}-test-3`,
      title: { en: "Test 3", nb: "Test 3", ru: "Тест 3" },
      subtitle: { en: "Practice set C (10 questions).", nb: "Øvingssett C (10 oppgaver).", ru: "Набор C (10 вопросов)." },
      stream,
      level,
      questions: test3,
    },
    {
      id: `${stream}-${level}-test-4`,
      title: { en: "Test 4", nb: "Test 4", ru: "Тест 4" },
      subtitle: { en: "Practice set D (10 questions).", nb: "Øvingssett D (10 oppgaver).", ru: "Набор D (10 вопросов)." },
      stream,
      level,
      questions: test4,
    },
  ];
};

const initAnswersFor = (questions: DemoQuestion[]) => {
  const map = new Map<string, DemoAnswer>();
  questions.forEach((q) => {
    if (q.type === "single") {
      map.set(q.id, { kind: "single", selectedId: null, checked: false, isCorrect: null });
    } else if (q.type === "fill") {
      map.set(q.id, { kind: "fill", text: "", checked: false, isCorrect: null });
    } else {
      const tokenIds = q.tokens.map((t) => t.id);
      for (let i = tokenIds.length - 1; i > 0; i -= 1) {
        const j = Math.floor(Math.random() * (i + 1));
        [tokenIds[i], tokenIds[j]] = [tokenIds[j], tokenIds[i]];
      }
      map.set(q.id, { kind: "order", tokenIds, checked: false, isCorrect: null });
    }
  });
  return map;
};

const TestsPage: React.FC<Props> = (props) => {
  const { t, i18n } = useTranslation();
  const locale = useMemo(() => pickLocale(i18n.language), [i18n.language]);
  const packs = useMemo(() => buildDemoPacks(props.stream, props.currentLevel), [props.stream, props.currentLevel]);
  const [selectedPackId, setSelectedPackId] = useState<string>(() => packs[0]?.id || "");
  const selectedPack = useMemo(() => packs.find((p) => p.id === selectedPackId) || packs[0] || null, [packs, selectedPackId]);
  const questions = useMemo(() => selectedPack?.questions || [], [selectedPack]);

  const [phase, setPhase] = useState<Phase>("intro");
  const [activeIndex, setActiveIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, DemoAnswer>>(() => initAnswersFor(questions));
  const [draggingTokenId, setDraggingTokenId] = useState<string | null>(null);

  useEffect(() => {
    setSelectedPackId(packs[0]?.id || "");
    setPhase("intro");
    setActiveIndex(0);
    setDraggingTokenId(null);
  }, [packs]);

  useEffect(() => {
    setAnswers(initAnswersFor(questions));
    setActiveIndex(0);
    setDraggingTokenId(null);
  }, [questions]);

  const current = questions[activeIndex] || null;
  const currentAnswer = current ? answers.get(current.id) || null : null;

  const totalPoints = useMemo(() => questions.reduce((sum, q) => sum + q.points, 0), [questions]);
  const earnedPoints = useMemo(() => {
    let sum = 0;
    questions.forEach((q) => {
      const a = answers.get(q.id);
      if (!a || !a.checked || !a.isCorrect) return;
      sum += q.points;
    });
    return sum;
  }, [answers, questions]);

  const checkedCount = useMemo(() => {
    let count = 0;
    questions.forEach((q) => {
      const a = answers.get(q.id);
      if (a?.checked) count += 1;
    });
    return count;
  }, [answers, questions]);

  const percent = useMemo(() => {
    if (totalPoints === 0) return 0;
    return clamp(Math.round((earnedPoints / totalPoints) * 100), 0, 100);
  }, [earnedPoints, totalPoints]);

  const progressPct = useMemo(() => {
    if (questions.length === 0) return 0;
    return clamp(Math.round(((activeIndex + (phase === "result" ? 1 : 0)) / questions.length) * 100), 0, 100);
  }, [activeIndex, phase, questions.length]);

  const setAnswer = useCallback((questionId: string, next: DemoAnswer) => {
    setAnswers((prev) => {
      const map = new Map(prev);
      map.set(questionId, next);
      return map;
    });
  }, []);

  const canCheck = useMemo(() => {
    if (!current || !currentAnswer) return false;
    if (currentAnswer.checked) return false;
    if (current.type === "single") {
      return currentAnswer.kind === "single" && Boolean(currentAnswer.selectedId);
    }
    if (current.type === "fill") {
      return currentAnswer.kind === "fill" && currentAnswer.text.trim().length > 0;
    }
    return currentAnswer.kind === "order" && currentAnswer.tokenIds.length > 0;
  }, [current, currentAnswer]);

  const evaluate = useCallback(() => {
    if (!current || !currentAnswer) return;
    if (currentAnswer.checked) return;

    if (current.type === "single" && currentAnswer.kind === "single") {
      const ok = currentAnswer.selectedId === current.correctOptionId;
      setAnswer(current.id, { ...currentAnswer, checked: true, isCorrect: ok });
      return;
    }

    if (current.type === "fill" && currentAnswer.kind === "fill") {
      const typed = normalize(currentAnswer.text);
      const accepted = current.accepted.map((v) => normalize(v));
      const ok = accepted.includes(typed);
      setAnswer(current.id, { ...currentAnswer, checked: true, isCorrect: ok });
      return;
    }

    if (current.type === "order" && currentAnswer.kind === "order") {
      const attempt = normalize(orderTextFrom(current, currentAnswer.tokenIds));
      const ok = attempt === normalize(current.correctSentence);
      setAnswer(current.id, { ...currentAnswer, checked: true, isCorrect: ok });
    }
  }, [current, currentAnswer, setAnswer]);

  const goNext = useCallback(() => {
    if (!current) return;
    if (!currentAnswer?.checked) return;
    const nextIdx = activeIndex + 1;
    if (nextIdx >= questions.length) {
      setPhase("result");
      return;
    }
    setActiveIndex(nextIdx);
  }, [activeIndex, current, currentAnswer?.checked, questions.length]);

  useEffect(() => {
    if (phase !== "running") return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Enter") {
        e.preventDefault();
        if (canCheck) {
          evaluate();
          return;
        }
        if (currentAnswer?.checked) {
          goNext();
        }
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setPhase("intro");
        setActiveIndex(0);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [canCheck, currentAnswer?.checked, evaluate, goNext, phase]);

  const renderQuestionBody = () => {
    if (!current || !currentAnswer) return null;

    if (current.type === "single" && currentAnswer.kind === "single") {
      return (
        <div className="demo-test-options">
          {current.options.map((opt) => {
            const selected = currentAnswer.selectedId === opt.id;
            const checked = currentAnswer.checked;
            const correct = opt.id === current.correctOptionId;
            const showCorrect = checked && correct;
            const showWrong = checked && selected && !correct;
            return (
              <button
                key={opt.id}
                type="button"
                className={`demo-test-option ${selected ? "is-selected" : ""} ${showCorrect ? "is-correct" : ""} ${
                  showWrong ? "is-wrong" : ""
                }`}
                onClick={() => setAnswer(current.id, { ...currentAnswer, selectedId: opt.id })}
                disabled={currentAnswer.checked}
              >
                {opt.text}
              </button>
            );
          })}
        </div>
      );
    }

    if (current.type === "fill" && currentAnswer.kind === "fill") {
      return (
        <div className="demo-test-fill">
          <input
            value={currentAnswer.text}
            placeholder={pickText(current.placeholder, locale)}
            onChange={(e) => setAnswer(current.id, { ...currentAnswer, text: e.target.value })}
            disabled={currentAnswer.checked}
            autoComplete="off"
            spellCheck={false}
            inputMode="text"
          />
        </div>
      );
    }

    if (current.type === "order" && currentAnswer.kind === "order") {
      const onDropToIndex = (fromToken: string, toToken: string | null) => {
        const fromIdx = currentAnswer.tokenIds.findIndex((t) => t === fromToken);
        if (fromIdx === -1) return;
        const next = [...currentAnswer.tokenIds];
        const [tokenId] = next.splice(fromIdx, 1);

        if (!toToken) {
          next.push(tokenId);
        } else {
          const toIdx = next.findIndex((t) => t === toToken);
          if (toIdx === -1) next.push(tokenId);
          else next.splice(toIdx, 0, tokenId);
        }
        setAnswer(current.id, { ...currentAnswer, tokenIds: next });
      };

      return (
        <div
          className="demo-test-order"
          onDragOver={(e) => {
            if (currentAnswer.checked) return;
            e.preventDefault();
            e.dataTransfer.dropEffect = "move";
          }}
          onDrop={(e) => {
            if (currentAnswer.checked) return;
            e.preventDefault();
            const dragged = (() => {
              try {
                return e.dataTransfer.getData("text/plain");
              } catch {
                return "";
              }
            })();
            const token = dragged || draggingTokenId;
            if (!token) return;
            onDropToIndex(token, null);
            setDraggingTokenId(null);
          }}
        >
          <div className="demo-test-order-grid">
            {currentAnswer.tokenIds.map((tokenId) => {
              const token = current.tokens.find((t) => t.id === tokenId);
              return (
              <button
                key={tokenId}
                type="button"
                className="demo-test-chip"
                disabled={currentAnswer.checked}
                draggable={!currentAnswer.checked}
                onDragStart={(e) => {
                  setDraggingTokenId(tokenId);
                  try {
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", tokenId);
                  } catch {
                    // ignore
                  }
                }}
                onDragOver={(e) => {
                  if (currentAnswer.checked) return;
                  e.preventDefault();
                  e.dataTransfer.dropEffect = "move";
                }}
                onDrop={(e) => {
                  if (currentAnswer.checked) return;
                  e.preventDefault();
                  const dragged = (() => {
                    try {
                      return e.dataTransfer.getData("text/plain");
                    } catch {
                      return "";
                    }
                  })();
                  const from = dragged || draggingTokenId;
                  if (!from || from === tokenId) return;
                  onDropToIndex(from, tokenId);
                  setDraggingTokenId(null);
                }}
                onDragEnd={() => setDraggingTokenId(null)}
              >
                {token?.text || ""}
              </button>
            );
            })}
          </div>
          <p className="muted tiny demo-test-order-hint">{t("games.scrambleKeyboardHint", "Enter — check; Esc — exit.")}</p>
        </div>
      );
    }

    return null;
  };

  const renderFeedback = () => {
    if (!current || !currentAnswer?.checked) return null;
    const isCorrect = Boolean(currentAnswer.isCorrect);
    return (
      <div className={`demo-test-feedback ${isCorrect ? "is-correct" : "is-wrong"}`}>
        <div className="demo-test-feedback-title">
          {isCorrect ? t("correct") : t("incorrect")}
          <span className="demo-test-points">
            +{isCorrect ? current.points : 0}/{current.points}
          </span>
        </div>
        {!isCorrect && (
          <div className="demo-test-correct">
            <span className="muted tiny">{t("rightAnswer")}:</span>{" "}
            <strong>
              {current.type === "single"
                ? (current.options.find((o) => o.id === current.correctOptionId)?.text || "—")
                : current.type === "fill"
                  ? current.correctDisplay
                  : current.correctDisplay}
            </strong>
          </div>
        )}
        <p className="muted small">{pickText(current.explanation, locale)}</p>
      </div>
    );
  };

  const resultRows = useMemo(() => {
    return questions.map((q) => {
      const a = answers.get(q.id);
      const isCorrect = Boolean(a?.checked && a.isCorrect);
      let yourAnswer = "—";
      let correctAnswer = "—";
      if (q.type === "single") {
        const selectedId = a && a.kind === "single" ? a.selectedId : null;
        yourAnswer = selectedId ? q.options.find((o) => o.id === selectedId)?.text || "—" : "—";
        correctAnswer = q.options.find((o) => o.id === q.correctOptionId)?.text || "—";
      } else if (q.type === "fill") {
        yourAnswer = a && a.kind === "fill" ? a.text.trim() || "—" : "—";
        correctAnswer = q.correctDisplay;
      } else {
        yourAnswer = a && a.kind === "order" ? orderTextFrom(q, a.tokenIds) : "—";
        correctAnswer = q.correctDisplay;
      }
      return { id: q.id, type: q.type, isCorrect, points: q.points, yourAnswer, correctAnswer };
    });
  }, [answers, questions]);

  return (
    <div className="layout single-panel">
      <main className="panel demo-test">
        <div className="demo-test-hero">
          <div>
            <h2>{t("testsDemo.title", "Demo test")}</h2>
            <p className="muted">{t("testsDemo.subtitle", "A beautiful example test — practical and interactive.")}</p>
          </div>
          <div className="demo-test-hero-meta">
            <span className="badge">{props.levelLabel(props.currentLevel)}</span>
            <span className="badge">
              {props.stream === "bokmaal"
                ? t("streamLabels.bokmaal", "Bokmål")
                : props.stream === "nynorsk"
                  ? t("streamLabels.nynorsk", "Nynorsk")
                  : t("streamLabels.english", "English")}
            </span>
          </div>
        </div>

        <div className="demo-test-progress">
          <div className="demo-test-progress-bar" aria-hidden="true">
            <div className="demo-test-progress-fill" style={{ width: `${phase === "intro" ? 0 : progressPct}%` }} />
          </div>
          <div className="demo-test-progress-meta muted tiny">
            {phase === "intro"
              ? t("testsDemo.progressIntro", "Ready to start")
              : phase === "result"
                ? t("testsDemo.progressDone", "Finished")
                : t("testsDemo.progressRunning", { current: activeIndex + 1, total: questions.length })}
          </div>
        </div>

        {phase === "intro" && (
          <div className="demo-test-intro card info">
            <p className="muted">{t("selectTest", "Choose a test to begin")}</p>
            <div className="demo-test-pack-list">
              {packs.map((pack) => {
                const isSelected = pack.id === selectedPack?.id;
                return (
                  <button
                    key={pack.id}
                    type="button"
                    className={`demo-test-pack-card ${isSelected ? "is-selected" : ""}`}
                    onClick={() => setSelectedPackId(pack.id)}
                  >
                    <div className="demo-test-pack-card-head">
                      <strong>{pickText(pack.title, locale)}</strong>
                      <span className="badge">
                        {pack.questions.length} {t("questions")}
                      </span>
                    </div>
                    <div className="muted small">{pickText(pack.subtitle, locale)}</div>
                  </button>
                );
              })}
            </div>

            <div className="summary-grid demo-test-intro-grid">
              <div>
                <span className="label">{t("testsDemo.question", "Question")}</span>
                <strong>
                  {selectedPack ? pickText(selectedPack.title, locale) : "—"}
                </strong>
              </div>
              <div>
                <span className="label">{t("testsDemo.points", "Points")}</span>
                <strong>{totalPoints}</strong>
              </div>
            </div>

            <div className="inline-actions">
              <button type="button" className="ghost" onClick={() => setPhase("running")} disabled={!selectedPack}>
                {t("testsDemo.start", "Start")}
              </button>
            </div>
          </div>
        )}

        {phase === "running" && current && currentAnswer && (
          <div className="demo-test-body">
            <div className="demo-test-toprow">
              <div className="demo-test-counter">
                <span className="muted tiny">{t("testsDemo.question", "Question")}</span>
                <strong>
                  {activeIndex + 1}/{questions.length}
                </strong>
              </div>
              <div className="demo-test-score">
                <span className="muted tiny">{t("score")}</span>
                <strong>
                  {earnedPoints}/{totalPoints}
                </strong>
              </div>
            </div>

            <div className={`demo-test-card ${currentAnswer.checked ? (currentAnswer.isCorrect ? "is-correct" : "is-wrong") : ""}`}>
              <div className="demo-test-card-header">
                <span className="badge">{current.type.toUpperCase()}</span>
                <span className="muted tiny">
                  {t("testsDemo.points", "Points")}: {current.points}
                </span>
              </div>
              <h3 className="demo-test-prompt">{pickText(current.prompt, locale)}</h3>

              {renderQuestionBody()}

              <div className="demo-test-actions">
                <button type="button" className="ghost" onClick={() => setPhase("intro")}>
                  {t("testsDemo.changeTest", "Change test")}
                </button>
                <div className="demo-test-actions-right">
                  {!currentAnswer.checked ? (
                    <button type="button" className="ghost" onClick={evaluate} disabled={!canCheck}>
                      {t("testsDemo.check", "Check")}
                    </button>
                  ) : (
                    <button type="button" className="ghost" onClick={goNext}>
                      {activeIndex + 1 >= questions.length ? t("testsDemo.finish", "Finish") : t("testsDemo.next", "Next")}
                    </button>
                  )}
                </div>
              </div>

              {renderFeedback()}
            </div>

            <p className="muted tiny">
              {t("testsDemo.keyboardHint", "Enter checks / next · Esc exits")}
            </p>
          </div>
        )}

        {phase === "result" && (
          <div className="demo-test-result">
            <div className="demo-test-result-header">
              <h3>{t("testsDemo.resultsTitle", "Results")}</h3>
              <div className="demo-test-result-badges">
                <span className="badge">{percent}%</span>
                <span className="badge">
                  {earnedPoints}/{totalPoints}
                </span>
              </div>
            </div>

            <div className="summary-grid demo-test-result-grid">
              <div>
                <span className="label">{t("testsDemo.questionsChecked", "Answered")}</span>
                <strong>{checkedCount}</strong>
              </div>
              <div>
                <span className="label">{t("percent")}</span>
                <strong>{percent}%</strong>
              </div>
              <div>
                <span className="label">{t("score")}</span>
                <strong>
                  {earnedPoints}/{totalPoints}
                </strong>
              </div>
              <div>
                <span className="label">{t("testsDemo.levelHint", "Suggested")}</span>
                <strong>{props.levelLabel(props.currentLevel)}</strong>
              </div>
            </div>

            <div className="demo-test-review">
              <h4>{t("testsDemo.reviewTitle", "Review")}</h4>
              <div className="demo-test-review-list">
                {resultRows.map((row, idx) => (
                  <div key={row.id} className={`demo-test-review-row ${row.isCorrect ? "is-correct" : "is-wrong"}`}>
                    <div className="demo-test-review-row-head">
                      <span className="muted tiny">
                        {t("testsDemo.question", "Question")} {idx + 1} · {row.type.toUpperCase()} · {row.points}p
                      </span>
                      <strong>{row.isCorrect ? t("correct") : t("incorrect")}</strong>
                    </div>
                    <div className="demo-test-review-row-body">
                      <div>
                        <span className="label">{t("yourAnswer")}</span>
                        <div className="demo-test-review-text">{row.yourAnswer || "—"}</div>
                      </div>
                      <div>
                        <span className="label">{t("rightAnswer")}</span>
                        <div className="demo-test-review-text">{row.correctAnswer || "—"}</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="inline-actions">
              <button
                type="button"
                className="ghost"
                onClick={() => {
                  setAnswers(initAnswersFor(questions));
                  setActiveIndex(0);
                  setDraggingTokenId(null);
                  setPhase("running");
                }}
              >
                {t("testsDemo.tryAgain", "Try again")}
              </button>
              <button type="button" className="ghost" onClick={() => setPhase("intro")}>
                {t("testsDemo.back", "Back")}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
};

export default TestsPage;
