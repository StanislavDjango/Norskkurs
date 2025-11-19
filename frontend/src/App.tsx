import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import Header from "./components/Header";
import Footer from "./components/Footer";

import {
  fetchExercises,
  fetchExpressions,
  fetchGlossary,
  fetchHomework,
  fetchMaterials,
  fetchProfile,
  fetchTestDetail,
  fetchTests,
  fetchVerbs,
  logoutProfile,
  submitTest,
  updateStreamLevel,
} from "./api";
import type {
  AnswerPayload,
  Exercise,
  Expression,
  GlossaryTerm,
  Homework,
  Material,
  Question,
  QuestionReview,
  ProfileInfo,
  Stream,
  SubmissionResponse,
  Test,
  TestDetail,
  Level,
  VerbEntry,
} from "./types";

const levelOrder: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };
const verbFormOrder = ["infinitive", "present", "past", "perfect"] as const;
type VerbForm = (typeof verbFormOrder)[number];
const alphabet = [
  "A",
  "B",
  "C",
  "D",
  "E",
  "F",
  "G",
  "H",
  "I",
  "J",
  "K",
  "L",
  "M",
  "N",
  "O",
  "P",
  "Q",
  "R",
  "S",
  "T",
  "U",
  "V",
  "W",
  "X",
  "Y",
  "Z",
  "Æ",
  "Ø",
  "Å",
];

type Section =
  | "dashboard"
  | "materials"
  | "exercises"
  | "tests"
  | "homework"
  | "verbs"
  | "expressions"
  | "glossary"
  | "contact";

const App = () => {
  const { t, i18n } = useTranslation();
  const [tests, setTests] = useState<Test[]>([]);
  const [selectedTest, setSelectedTest] = useState<TestDetail | null>(null);
  const [answers, setAnswers] = useState<Record<number, AnswerPayload>>({});
  const [summary, setSummary] = useState<SubmissionResponse["summary"] | null>(null);
  const [review, setReview] = useState<QuestionReview[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState({ name: "", email: "" });
  const [auth, setAuth] = useState<ProfileInfo | null>(null);
  const [filterMode, setFilterMode] = useState<"all" | "single" | "fill" | "mixed" | "exam">("all");
  const [filterLevel, setFilterLevel] = useState<"all" | Level>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);
  const [missingQuestions, setMissingQuestions] = useState<Set<number>>(new Set());
  const questionRefs = useRef<Record<number, HTMLDivElement | null>>({});
  const [studentEmail, setStudentEmail] = useState("");
  const [isTeacher, setIsTeacher] = useState(false);
  const [stream, setStream] = useState<Stream>(() => {
    const stored = localStorage.getItem("norskkurs_stream") as Stream | null;
    return stored || "bokmaal";
  });
  const [currentLevel, setCurrentLevel] = useState<Level>(() => {
    const stored = localStorage.getItem("norskkurs_level") as Level | null;
    return stored || "A1";
  });
  const [activeSection, setActiveSection] = useState<Section>("dashboard");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [verbs, setVerbs] = useState<VerbEntry[]>([]);
  const [expressions, setExpressions] = useState<Expression[]>([]);
  const [glossary, setGlossary] = useState<GlossaryTerm[]>([]);
  const [activeVerb, setActiveVerb] = useState<VerbEntry | null>(null);
  const [activeForm, setActiveForm] = useState<VerbForm>("infinitive");
  const [verbLetter, setVerbLetter] = useState<string>("all");
  const [verbTag, setVerbTag] = useState<string>("all");
  const [verbVisibleCount, setVerbVisibleCount] = useState<number>(15);
  const [verbView, setVerbView] = useState<"all" | "favorites">("all");
  const [verbFavorites, setVerbFavorites] = useState<number[]>(() => {
    try {
      const raw = localStorage.getItem("norskkurs_verb_favs");
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });
  const verbLoadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    localStorage.setItem("norskkurs_stream", stream);
  }, [stream]);

  useEffect(() => {
    localStorage.setItem("norskkurs_level", currentLevel);
    setFilterLevel(currentLevel);
  }, [currentLevel]);

  useEffect(() => {
    setVerbVisibleCount(15);
  }, [verbLetter, verbTag, verbView, verbs]);

  useEffect(() => {
    setVerbLetter("all");
  }, [verbTag, verbView]);

  useEffect(() => {
    localStorage.setItem("norskkurs_verb_favs", JSON.stringify(verbFavorites));
  }, [verbFavorites]);

  const filteredVerbs = useMemo(
    () =>
      verbs.filter((verb) => {
        const letterMatch =
          verbLetter === "all" ? true : getVerbStartingLetter(verb) === verbLetter;
        const tagMatch = verbTag === "all" ? true : (verb.tags || []).includes(verbTag);
        const viewMatch =
          verbView === "all" ? true : verbFavorites.includes(verb.id);
        return letterMatch && tagMatch && viewMatch;
      }),
    [verbs, verbLetter, verbTag, verbView, verbFavorites],
  );

  const verbTags = useMemo(() => {
    const set = new Set<string>();
    verbs.forEach((verb) => {
      (verb.tags || []).forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [verbs]);

  function getVerbStartingLetter(verb: VerbEntry): string {
    const base = (verb.present || verb.infinitive || verb.verb || "")
      .split("/")[0]
      .trim();
    const cleaned = base.replace(/^(a|to)\s+/i, "").trim();
    const match = cleaned.match(/[A-ZÆØÅ]/i);
    const letter = (match ? match[0] : cleaned.charAt(0) || verb.verb.charAt(0) || "A").toUpperCase();
    return letter;
  }


  useEffect(() => {
    const sentinel = verbLoadMoreRef.current;
    if (!sentinel) return undefined;
    if (filteredVerbs.length <= verbVisibleCount) return undefined;
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVerbVisibleCount((count) =>
              Math.min(count + 15, filteredVerbs.length),
            );
          }
        });
      },
      { root: null, threshold: 1 },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [filteredVerbs, verbVisibleCount]);

  useEffect(() => {
    const params = {
      student_email: studentEmail || undefined,
      stream,
      level: currentLevel,
    };
    fetchTests(params)
      .then((data) => setTests([...data].sort((a, b) => levelOrder[a.level] - levelOrder[b.level])))
      .catch(() => setError("Could not load tests"));
  }, [studentEmail, stream, currentLevel]);

  useEffect(() => {
    fetchProfile()
      .then((data) => {
        setAuth(data);
        setIsTeacher(data.is_teacher);
        if (data.stream) {
          setStream(data.stream);
          localStorage.setItem("norskkurs_stream", data.stream);
        }
        if (data.level) {
          setCurrentLevel(data.level);
          setFilterLevel(data.level);
          localStorage.setItem("norskkurs_level", data.level);
        }
      })
      .catch(() => {
        setAuth(null);
        setIsTeacher(false);
      });
  }, [studentEmail]);

  useEffect(() => {
    const params = {
      student_email: studentEmail || undefined,
      stream,
      level: currentLevel,
    };
    fetchMaterials(params).then(setMaterials).catch(() => setMaterials([]));
    fetchHomework(params).then(setHomework).catch(() => setHomework([]));
    fetchExercises(params).then(setExercises).catch(() => setExercises([]));
    fetchVerbs(params).then(setVerbs).catch(() => setVerbs([]));
    fetchExpressions(params).then(setExpressions).catch(() => setExpressions([]));
    fetchGlossary(params).then(setGlossary).catch(() => setGlossary([]));
  }, [stream, currentLevel, studentEmail]);

  const selectTest = async (slug: string) => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setReview([]);
    setMissingQuestions(new Set());
    try {
      const detail = await fetchTestDetail(slug, studentEmail ? { student_email: studentEmail } : undefined);
      setSelectedTest(detail);
      setAnswers(
        detail.questions.reduce<Record<number, AnswerPayload>>((acc, q) => {
          acc[q.id] = { question: q.id, selected_option: null, text_response: "" };
          return acc;
        }, {}),
      );
    } catch (e) {
      console.error(e);
      setError("Could not load test");
    } finally {
      setLoading(false);
    }
  };

  const persistStreamLevel = (payload: { stream?: Stream; level?: Level }) => {
    const emailForProfile = studentEmail || profile.email || auth?.username || "";
    if (!emailForProfile) return;
    updateStreamLevel({ email: emailForProfile, ...payload }).catch(() => null);
  };

  const handleStreamChange = (value: Stream) => {
    setStream(value);
    persistStreamLevel({ stream: value, level: currentLevel });
  };

  const handleLevelChange = (value: Level) => {
    setCurrentLevel(value);
    setFilterLevel(value);
    persistStreamLevel({ level: value, stream });
  };

  const handleSelectOption = (questionId: number, value: number | null) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { question: questionId }), selected_option: value },
    }));
    setMissingQuestions((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleTextChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { question: questionId }), text_response: value },
    }));
    setMissingQuestions((prev) => {
      const next = new Set(prev);
      next.delete(questionId);
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!selectedTest) return;
    const unanswered = new Set<number>();
    selectedTest.questions.forEach((q) => {
      const ans = answers[q.id];
      const hasAnswer =
        q.question_type === "single"
          ? !!ans?.selected_option
          : !!ans?.text_response && ans.text_response.trim().length > 0;
      if (!hasAnswer) unanswered.add(q.id);
    });
    if (unanswered.size > 0) {
      setMissingQuestions(unanswered);
      setError(t("allRequired"));
      const firstId = Array.from(unanswered)[0];
      const ref = questionRefs.current[firstId];
      if (ref) {
        ref.scrollIntoView({ behavior: "smooth", block: "center" });
        ref.classList.add("shake");
        setTimeout(() => ref.classList.remove("shake"), 800);
      }
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const payload: AnswerPayload[] = selectedTest.questions.map((q) => ({
        question: q.id,
        selected_option: answers[q.id]?.selected_option ?? null,
        text_response: answers[q.id]?.text_response ?? "",
      }));
      const res = await submitTest(selectedTest.slug, payload, {
        ...profile,
        locale: i18n.language,
      });
      setSummary(res.summary);
      setReview(res.review || []);
      setMissingQuestions(new Set());
    } catch (e) {
      console.error(e);
      setError("Could not submit answers");
    } finally {
      setLoading(false);
    }
  };

  const levelLabel = (level: string) => t(`levelLabel.${level}`);
  const streamLabel = (value: Stream) => {
    const labels: Record<Stream, string> = {
      bokmaal: t("streamLabels.bokmaal"),
      nynorsk: t("streamLabels.nynorsk"),
      english: t("streamLabels.english"),
    };
    return labels[value] || value;
  };

  const navItems = useMemo(
    () => [
      { key: "dashboard" as Section, label: t("nav.dashboard") },
      { key: "materials" as Section, label: t("nav.materials") },
      { key: "exercises" as Section, label: t("nav.exercises") },
      { key: "tests" as Section, label: t("nav.tests") },
      { key: "homework" as Section, label: t("nav.homework") },
      { key: "verbs" as Section, label: t("nav.verbs") },
      { key: "expressions" as Section, label: t("nav.expressions") },
      { key: "glossary" as Section, label: t("nav.glossary") },
      { key: "contact" as Section, label: t("nav.contact") },
    ],
    [t],
  );

  const questions = useMemo(() => selectedTest?.questions || [], [selectedTest]);

  const filteredTests = useMemo(() => {
    const term = search.trim().toLowerCase();
    return tests
      .filter((test) => {
        if (filterLevel !== "all" && test.level !== filterLevel) return false;
        switch (filterMode) {
          case "single":
            return test.question_mode === "single";
          case "fill":
            return test.question_mode === "fill";
          case "mixed":
            return test.question_mode === "mixed";
          case "exam":
            return ["B1", "B2"].includes(test.level) && test.question_mode !== "fill";
          default:
            return true;
        }
      })
      .filter((test) => {
        if (!term) return true;
        return (
          test.title.toLowerCase().includes(term) ||
          test.description.toLowerCase().includes(term) ||
          test.slug.toLowerCase().includes(term)
        );
      });
  }, [tests, filterMode, filterLevel, search]);

  const visibleTests = useMemo(() => filteredTests.slice(0, visibleCount), [filteredTests, visibleCount]);

  const handleLogout = async () => {
    try {
      await logoutProfile();
      setAuth(null);
      setIsTeacher(false);
    } catch (e) {
      console.error(e);
    }
  };


  const exampleFieldMap: Record<VerbForm, keyof Pick<VerbEntry, "examples_infinitive" | "examples_present" | "examples_past" | "examples_perfect">> = {
    infinitive: "examples_infinitive",
    present: "examples_present",
    past: "examples_past",
    perfect: "examples_perfect",
  };

  const getExamplesForForm = (verb: VerbEntry, form: VerbForm): string[] => {
    const field = exampleFieldMap[form];
    const lines = (verb[field] || "")
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean);
    return lines;
  };

  const renderSectionContent = () => {
    switch (activeSection) {
      case "dashboard":
        return (
          <>
            <h2>{t("nav.dashboard")}</h2>
            <div className="grid">
              <div className="card info">
                <p className="muted small">{t("currentStream")}</p>
                <h3>{streamLabel(stream)}</h3>
                <p className="muted small">{t("currentLevel")}: {levelLabel(currentLevel)}</p>
              </div>
              <div className="card">
                <p className="muted small">{t("summary.tests")}</p>
                <strong>{tests.length}</strong>
              </div>
              <div className="card">
                <p className="muted small">{t("summary.materials")}</p>
                <strong>{materials.length}</strong>
              </div>
              <div className="card">
                <p className="muted small">{t("summary.homework")}</p>
                <strong>{homework.length}</strong>
              </div>
            </div>
            <div className="card">
              <h3>{t("summary.quickStart")}</h3>
              <p className="muted">{t("summary.quickHint")}</p>
              <div className="pill-row">
                <button className="pill pill--active" onClick={() => setActiveSection("exercises")}>
                  {t("nav.exercises")}
                </button>
                <button className="pill pill--active" onClick={() => setActiveSection("tests")}>
                  {t("nav.tests")}
                </button>
                <button className="pill pill--active" onClick={() => setActiveSection("materials")}>
                  {t("nav.materials")}
                </button>
              </div>
            </div>
          </>
        );
      case "materials":
        return (
          <>
            <h2>{t("nav.materials")}</h2>
            {materials.length === 0 ? (
              <p className="muted">{t("emptyList")}</p>
            ) : (
              <div className="card-list">
                {materials.map((item) => (
                  <article key={item.id} className="card">
                    <div className="card-meta">
                      <span className="badge">{streamLabel(item.stream)}</span>
                      <span className="badge">{item.level}</span>
                      <span className="badge ghost">{item.material_type}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p className="muted small">{item.body || item.url}</p>
                    {item.url && (
                      <a href={item.url} target="_blank" rel="noreferrer noopener" className="ghost small">
                        {t("open")}
                      </a>
                    )}
                  </article>
                ))}
              </div>
            )}
          </>
        );
      case "exercises":
        return (
          <>
            <h2>{t("nav.exercises")}</h2>
            {exercises.length === 0 ? (
              <p className="muted">{t("emptyList")}</p>
            ) : (
              <div className="card-list">
                {exercises.map((item) => (
                  <article key={item.id} className="card">
                    <div className="card-meta">
                      <span className="badge">{item.kind}</span>
                      <span className="badge">{item.level}</span>
                      <span className="badge">{streamLabel(item.stream)}</span>
                    </div>
                    <h3>{item.title}</h3>
                    <p className="muted small">{item.prompt}</p>
                    <p className="muted small">{t("estimated")}: {item.estimated_minutes} min</p>
                  </article>
                ))}
              </div>
            )}
          </>
        );
      case "homework":
        return (
          <>
            <h2>{t("nav.homework")}</h2>
            {homework.length === 0 ? (
              <p className="muted">{t("emptyList")}</p>
            ) : (
              <div className="card-list">
                {homework.map((item) => (
                  <article key={item.id} className="card">
                    <div className="card-meta">
                      <span className="badge">{streamLabel(item.stream)}</span>
                      <span className="badge">{item.level}</span>
                      {item.due_date && <span className="badge ghost">{new Date(item.due_date).toLocaleDateString()}</span>}
                    </div>
                    <h3>{item.title}</h3>
                    <p className="muted small">{item.instructions}</p>
                    <p className="muted small">{t("status")}: {item.status}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        );
        case "verbs":
          return (
            <>
              <h2 className="sr-only">{t("nav.verbs")}</h2>
              {verbs.length === 0 ? (
                <p className="muted">{t("emptyList")}</p>
              ) : (
                <div className="verbs-board">
                  <div className="verbs-alphabet">
                    <button
                      type="button"
                      className={verbLetter === "all" ? "active" : ""}
                      onClick={() => setVerbLetter("all")}
                    >
                      {t("alphabetAll")}
                    </button>
                    {alphabet.map((letter) => {
                      const hasLetter = verbs.some((verb) => {
                        if (verbTag !== "all" && !(verb.tags || []).includes(verbTag)) {
                          return false;
                        }
                        return getVerbStartingLetter(verb) === letter;
                      });
                      return (
                        <button
                          key={letter}
                          type="button"
                          disabled={!hasLetter}
                          className={verbLetter === letter ? "active" : ""}
                          onClick={() => setVerbLetter(letter)}
                        >
                          {letter}
                        </button>
                      );
                    })}
                  </div>
                  {verbTags.length > 0 && (
                    <div className="verbs-tags">
                      <button
                        type="button"
                        className={verbTag === "all" ? "active" : ""}
                        onClick={() => setVerbTag("all")}
                      >
                        {t("tagAll")}
                      </button>
                      {verbTags.map((tag) => (
                        <button
                          key={tag}
                          type="button"
                          className={verbTag === tag ? "active" : ""}
                          onClick={() => setVerbTag(tag)}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>
                  )}
                  <div className="verbs-view-toggle">
                    <button
                      type="button"
                      className={verbView === "all" ? "active" : ""}
                      onClick={() => setVerbView("all")}
                    >
                      {t("verbTabs.all")}
                    </button>
                    <button
                      type="button"
                      className={verbView === "favorites" ? "active" : ""}
                      onClick={() => setVerbView("favorites")}
                      disabled={verbFavorites.length === 0}
                    >
                      {t("verbTabs.favorites")} ({verbFavorites.length})
                    </button>
                  </div>
                  <div className="verbs-board__header">
                    <span>{t("infinitive")}</span>
                    <span>{t("present")}</span>
                    <span>{t("past")}</span>
                    <span>{t("perfect")}</span>
                    <span>{t("showExample")}</span>
                  </div>
                  <div className="verbs-table">
                    {filteredVerbs.slice(0, verbVisibleCount).map((verb) => (
                      <div key={verb.id} className="verbs-row">
                        {verbFormOrder.map((formKey) => (
                          <div key={formKey} className="verbs-cell">
                            <strong>{verb[formKey]}</strong>
                          </div>
                        ))}
                        <div className="verbs-cta">
                          <button
                            type="button"
                            className={`verb-bookmark ${verbFavorites.includes(verb.id) ? "active" : ""}`}
                            onClick={() => {
                              setVerbFavorites((prev) =>
                                prev.includes(verb.id)
                                  ? prev.filter((id) => id !== verb.id)
                                  : [...prev, verb.id],
                              );
                            }}
                            aria-label={
                              verbFavorites.includes(verb.id)
                                ? t("removeFavorite")
                                : t("addFavorite")
                            }
                          >
                            {verbFavorites.includes(verb.id) ? "★" : "☆"}
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                                setActiveVerb(verb);
                                setActiveForm("infinitive");
                              }}
                            >
                              {t("showExample")}
                            </button>
                          </div>
                        </div>
                      ))}
                  </div>
                  {filteredVerbs.length > verbVisibleCount && (
                    <>
                      <div
                        className="verbs-sentinel"
                        ref={verbLoadMoreRef}
                        aria-hidden="true"
                        style={{ height: "2px" }}
                      />
                      <div className="load-more">
                        <button className="ghost" onClick={() => setVerbVisibleCount((count) => Math.min(count + 15, filteredVerbs.length))}>
                          {t("loadMore")}
                        </button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </>
          );
      case "expressions":
        return (
          <>
            <h2>{t("nav.expressions")}</h2>
            {expressions.length === 0 ? (
              <p className="muted">{t("emptyList")}</p>
            ) : (
              <div className="card-list">
                {expressions.map((expr) => (
                  <article key={expr.id} className="card">
                    <div className="card-meta">
                      <span className="badge">{streamLabel(expr.stream)}</span>
                    </div>
                    <h3>{expr.phrase}</h3>
                    <p className="muted small">{expr.meaning}</p>
                    <p className="muted small">{expr.example}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        );
      case "glossary":
        return (
          <>
            <h2>{t("nav.glossary")}</h2>
            {glossary.length === 0 ? (
              <p className="muted">{t("emptyList")}</p>
            ) : (
              <div className="card-list">
                {glossary.map((term) => (
                  <article key={term.id} className="card">
                    <div className="card-meta">
                      <span className="badge">{streamLabel(term.stream)}</span>
                      <span className="badge">{term.level}</span>
                    </div>
                    <h3>{term.term}</h3>
                    <p className="muted small">{term.translation}</p>
                    <p className="muted small">{term.explanation}</p>
                  </article>
                ))}
              </div>
            )}
          </>
        );
      case "contact":
        return (
          <div className="card">
            <h2>{t("nav.contact")}</h2>
            <p className="muted">{t("contactText")}</p>
            <ul className="muted">
              <li>{t("contactEmail")}: support@norskkurs.no</li>
              <li>{t("contactFaq")}</li>
            </ul>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="page">
      <Header
        auth={auth}
        isTeacher={isTeacher}
        onLogout={handleLogout}
        currentLang={i18n.language}
        changeLanguage={(l: string) => i18n.changeLanguage(l)}
        stream={stream}
        level={currentLevel}
        onChangeStream={handleStreamChange}
        onChangeLevel={handleLevelChange}
      />

      <div className="section-nav">
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`pill ${activeSection === item.key ? "pill--active" : ""}`}
            onClick={() => setActiveSection(item.key)}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="stream-banner">
        <div>
          <p className="muted small">{t("currentStream")}</p>
          <strong>{streamLabel(stream)}</strong>
        </div>
        <div>
          <p className="muted small">{t("currentLevel")}</p>
          <strong>{levelLabel(currentLevel)}</strong>
        </div>
      </div>

      {error && <div className="alert">{error}</div>}

      {activeSection === "tests" ? (
        <div className="layout">
          <aside className="panel">
            <h2>{t("selectTest")}</h2>
            <div className="search-row">
              <input
                type="email"
                placeholder="student@example.com"
                value={studentEmail}
                onChange={(e) => {
                  setStudentEmail(e.target.value.trim());
                }}
                onBlur={() => setVisibleCount(12)}
              />
            </div>
            <div className="search-row">
              <input
                type="search"
                placeholder={t("searchPlaceholder")}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setVisibleCount(12);
                }}
              />
            </div>
            <div className="filter-row level-row">
              {(["all", "A1", "A2", "B1", "B2"] as const).map((lvl) => (
                <button
                  key={lvl}
                  className={`pill ${filterLevel === lvl ? "pill--active" : ""}`}
                  onClick={() => {
                    setFilterLevel(lvl === "all" ? "all" : lvl);
                    setVisibleCount(12);
                  }}
                >
                  {lvl === "all" ? "All" : lvl}
                </button>
              ))}
            </div>
            <div className="filter-row">
              {(["all", "single", "fill", "mixed", "exam"] as const).map((mode) => (
                <button
                  key={mode}
                  className={`pill ${filterMode === mode ? "pill--active" : ""}`}
                  onClick={() => {
                    setFilterMode(mode);
                    setVisibleCount(12);
                  }}
                >
                  {t(`filters.${mode}`)}
                </button>
              ))}
            </div>
            <div className="test-list">
              {visibleTests.map((test) => (
                <button
                  key={test.slug}
                  className={`test-card ${selectedTest?.slug === test.slug ? "selected" : ""}`}
                  onClick={() => selectTest(test.slug)}
                >
                  <div className="test-card__title">
                    <span className="badge">{test.level}</span>
                    <span className={`mode mode-${test.question_mode}`}>{test.question_mode}</span>
                    <span>{test.title}</span>
                  </div>
                  <p className="muted small">{test.description}</p>
                  <div className="test-card__meta">
                    <span>
                      {test.question_count} {t("questions")}
                    </span>
                    <span>
                      {t("estimated")}: {test.estimated_minutes} min
                    </span>
                  </div>
                </button>
              ))}
              {visibleTests.length === 0 && (
                <div className="muted small">{t("noTests")}</div>
              )}
            </div>
            {visibleTests.length < filteredTests.length && (
              <div className="load-more">
                <span className="muted small">
                  Showing {visibleTests.length} of {filteredTests.length}
                </span>
                <button className="ghost" onClick={() => setVisibleCount((n) => n + 12)}>
                  Load more
                </button>
              </div>
            )}
          </aside>

          <main className="panel">
            {!selectedTest && <div className="placeholder">{t("emptyState")}</div>}

            {selectedTest && (
              <>
                <div className="test-header">
                  <div>
                    <p className="muted small">
                      {t("level")}: {levelLabel(selectedTest.level)}
                    </p>
                    <h2>{selectedTest.title}</h2>
                    <p className="muted">{selectedTest.description}</p>
                  </div>
                  {summary && (
                    <div className="summary">
                      <h3>{t("resultTitle")}</h3>
                      <div className="summary-grid">
                        <div>
                          <span className="label">{t("score")}</span>
                          <strong>
                            {summary.score}/{summary.total_questions}
                          </strong>
                        </div>
                        <div>
                          <span className="label">{t("percent")}</span>
                          <strong>{summary.percent}%</strong>
                        </div>
                        <div>
                          <span className="label">{t("correct")}</span>
                          <strong>{summary.correct}</strong>
                        </div>
                        <div>
                          <span className="label">{t("incorrect")}</span>
                          <strong>{summary.incorrect}</strong>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <section className="profile">
                  <div>
                    <label>{t("yourName")}</label>
                    <input
                      type="text"
                      value={profile.name}
                      onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label>{t("yourEmail")}</label>
                    <input
                      type="email"
                      value={profile.email}
                      onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))}
                    />
                  </div>
                </section>

                <section className="questions">
                  {questions.map((question) => (
                    <QuestionBlock
                      key={question.id}
                      ref={(el) => {
                        questionRefs.current[question.id] = el;
                      }}
                      question={question}
                      answer={answers[question.id]}
                      missing={missingQuestions.has(question.id)}
                      review={review.find((r) => r.question === question.id)}
                      onSelectOption={handleSelectOption}
                      onChangeText={handleTextChange}
                    />
                  ))}
                </section>

                <div className="actions">
                  <button onClick={() => setSelectedTest(null)} className="ghost">
                    {t("restart")}
                  </button>
                  <button disabled={loading} onClick={handleSubmit}>
                    {loading ? t("loading") : t("submit")}
                  </button>
                </div>

              </>
            )}
          </main>
        </div>
      ) : (
        <div className={`layout ${activeSection === "verbs" ? "full-width-panel" : "single-panel"}`}>
          <main className="panel">{renderSectionContent()}</main>
        </div>
      )}
      <Footer />
      {activeVerb && (
        <div className="verb-modal" role="dialog" aria-modal="true">
          <div className="verb-modal__backdrop" onClick={() => setActiveVerb(null)} />
          <div className="verb-modal__card">
            <header>
              <div>
                <p className="muted small">{streamLabel(stream)}</p>
                <h3>{activeVerb.verb}</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setActiveVerb(null);
                  setActiveForm("infinitive");
                }}
                aria-label={t("close")}
              >
                ×
              </button>
            </header>
            <div className="verb-modal__forms">
              {verbFormOrder.map((formKey) => (
                <button
                  key={formKey}
                  type="button"
                  className={formKey === activeForm ? "active-form" : ""}
                  onClick={() => setActiveForm(formKey)}
                >
                  <span>{t(`formTitles.${formKey}`)}</span>
                  <strong>{activeVerb[formKey]}</strong>
                </button>
              ))}
            </div>
            <div className="verb-modal__examples">
              <h4>{t(`formTitles.${activeForm}`)}</h4>
              {getExamplesForForm(activeVerb, activeForm).map((line, idx) => (
                <p key={idx}>{line}</p>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

type QuestionBlockProps = {
  question: Question;
  answer?: AnswerPayload;
  missing?: boolean;
  review?: QuestionReview;
  onSelectOption: (questionId: number, value: number | null) => void;
  onChangeText: (questionId: number, value: string) => void;
};

const QuestionBlock = React.forwardRef<HTMLDivElement, QuestionBlockProps>(
  ({ question, answer, missing, review, onSelectOption, onChangeText }, ref) => {
    const { t } = useTranslation();
    const statusClass = review ? (review.is_correct ? "good" : "bad") : missing ? "missing" : "";
    return (
      <article className={`question ${statusClass}`} ref={ref}>
        <div className="question-title">
          <span className="badge">{question.question_type === "single" ? "MCQ" : "Fill"}</span>
          <p>{question.text}</p>
        </div>
        {question.question_type === "single" ? (
          <div className="options">
            {question.options.map((opt) => (
              <label key={opt.id} className="option">
                <input
                  type="radio"
                  name={`q-${question.id}`}
                  value={opt.id}
                  checked={answer?.selected_option === opt.id}
                  onChange={() => onSelectOption(question.id, opt.id)}
                />
                <span>{opt.text}</span>
              </label>
            ))}
          </div>
        ) : (
          <input
            type="text"
            className="text-answer"
            placeholder={t("answerPlaceholder")}
            value={answer?.text_response || ""}
            onChange={(e) => onChangeText(question.id, e.target.value)}
          />
        )}
        {review && (
          <div className={`question-review ${review.is_correct ? "good" : "bad"}`}>
            <span className="badge">{review.is_correct ? t("correct") : t("incorrect")}</span>
            <div className="review-row inline">
              <span className="label">{t("yourAnswer")}:</span>
              <span className="answer-text">
                {review.selected_text && review.selected_text.trim() ? review.selected_text : "-"}
              </span>
            </div>
            <div className="review-row inline">
              <span className="label">{t("rightAnswer")}:</span>
              <span className="answer-text">
                {review.correct_answers.length ? review.correct_answers.join(", ") : "-"}
              </span>
            </div>
            {review.explanation && (
              <div className="review-row inline">
                <span className="label">{t("explanation")}:</span>
                <span className="answer-text">{review.explanation}</span>
              </div>
            )}
          </div>
        )}
        {missing && !review && (
          <div className="question-hint">{t("answerRequired")}</div>
        )}
      </article>
    );
  },
);

QuestionBlock.displayName = "QuestionBlock";

export default App;
