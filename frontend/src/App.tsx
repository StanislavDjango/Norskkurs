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
  fetchReadings,
  fetchProfile,
  fetchTestDetail,
  fetchTests,
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
  Reading,
  Question,
  QuestionReview,
  ProfileInfo,
  Stream,
  SubmissionResponse,
  Test,
  TestDetail,
  Level,
} from "./types";
import VerbsPage from "./pages/VerbsPage";
import GlossaryPage from "./pages/GlossaryPage";

const levelOrder: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };

type Section =
  | "readings"
  | "materials"
  | "exercises"
  | "tests"
  | "homework"
  | "verbs"
  | "irregularVerbs"
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
  const [activeSection, setActiveSection] = useState<Section>("readings");
  const [materials, setMaterials] = useState<Material[]>([]);
  const [homework, setHomework] = useState<Homework[]>([]);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [expressions, setExpressions] = useState<Expression[]>([]);
  const [readings, setReadings] = useState<Reading[]>([]);
  const [openTranslations, setOpenTranslations] = useState<Set<number>>(new Set());
  const [isNavOpen, setIsNavOpen] = useState(false);
  const [readingLookup, setReadingLookup] = useState("");
  const [readingLookupResults, setReadingLookupResults] = useState<ReadingLookupRow[]>([]);
  const [readingLookupLoading, setReadingLookupLoading] = useState(false);
  const [readingLocales, setReadingLocales] = useState<Record<number, "nb" | "en" | "ru">>({});
  const [activeReading, setActiveReading] = useState<Reading | null>(null);

  useEffect(() => {
    localStorage.setItem("norskkurs_stream", stream);
  }, [stream]);

  useEffect(() => {
    localStorage.setItem("norskkurs_level", currentLevel);
    setFilterLevel(currentLevel);
  }, [currentLevel]);


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
    fetchExpressions(params).then(setExpressions).catch(() => setExpressions([]));
    fetchReadings(params)
      .then((data) => {
        setReadings(data);
        setOpenTranslations(new Set());
      })
      .catch(() => {
        setReadings([]);
        setOpenTranslations(new Set());
      });
  }, [stream, currentLevel, studentEmail]);

  useEffect(() => {
    const query = readingLookup.trim();
    if (!query) {
      setReadingLookupResults([]);
      setReadingLookupLoading(false);
      return;
    }
    let cancelled = false;
    setReadingLookupLoading(true);
    fetchGlossary({ q: query })
      .then((data) => {
        if (cancelled) return;
        setReadingLookupResults(buildReadingLookupRows(data));
      })
      .catch(() => {
        if (cancelled) return;
        setReadingLookupResults([]);
      })
      .finally(() => {
        if (cancelled) return;
        setReadingLookupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [readingLookup, stream]);

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
      { key: "readings" as Section, label: t("nav.readings") },
      { key: "materials" as Section, label: t("nav.materials") },
      { key: "exercises" as Section, label: t("nav.exercises") },
      { key: "tests" as Section, label: t("nav.tests") },
      { key: "homework" as Section, label: t("nav.homework") },
      { key: "verbs" as Section, label: t("nav.verbs") },
      { key: "irregularVerbs" as Section, label: t("nav.irregularVerbs", { defaultValue: "Irregular verbs" }) },
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


  const renderSectionContent = () => {
    switch (activeSection) {
      case "readings":
        return (
          <>
            <div className="readings-toolbar">
              <h2>{t("nav.readings")}</h2>
              <div className="readings-search">
                <label className="readings-search-label">
                  <span className="muted small">
                    {t("readings.lookupLabel")}
                  </span>
                  <input
                    type="search"
                    placeholder={t("glossarySearchPlaceholder")}
                    value={readingLookup}
                    onChange={(e) => setReadingLookup(e.target.value)}
                  />
                </label>
                {readingLookup.trim() && (
                  <div className="readings-search-results">
                    {readingLookupLoading ? (
                      <p className="muted small">{t("loading")}</p>
                    ) : (
                      readingLookupResults.slice(0, 5).map((row) => (
                        <div key={row.id} className="readings-search-result">
                          <strong>{row.term}</strong>
                          <span className="muted small">
                            {row.bokmaal && <span> · NB: {row.bokmaal}</span>}
                            {row.nynorsk && <span> · NN: {row.nynorsk}</span>}
                            {row.english && <span> · EN: {row.english}</span>}
                            {row.russian && <span> · RU: {row.russian}</span>}
                          </span>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
            {readings.length === 0 ? (
              <p className="muted">{t("readings.empty")}</p>
            ) : (
              <div className="card-list readings-list">
                {readings.map((item) => {
                  const isOpen = openTranslations.has(item.id);
                  const baseLocale = item.stream === "english" ? "ru" : "en";
                  const activeLocale = readingLocales[item.id] || baseLocale;
                  const enText = item.stream === "english" ? "" : item.translation;
                  const nbText = item.stream === "english" ? item.translation_nb : "";
                  const ruText = item.stream === "english" ? item.translation : "";
                  const currentText =
                    activeLocale === "ru"
                      ? ruText
                      : activeLocale === "nb"
                      ? nbText
                      : enText;
                  return (
                    <article key={item.id} className="card">
                      <div className="card-meta">
                        <span className="badge">{streamLabel(item.stream)}</span>
                        <span className="badge">{item.level}</span>
                        {item.tags && item.tags.length > 0 && (
                          <span className="badge ghost">{item.tags.join(", ")}</span>
                        )}
                      </div>
                      <h3>{item.title}</h3>
                      <div className="muted small">
                        {item.body.split(/\\n+/).map((para, idx) => (
                          <p key={idx}>{para}</p>
                        ))}
                      </div>
                      <div className="reading-actions">
                        <button
                          type="button"
                          className="pill"
                          onClick={() => setActiveReading(item)}
                        >
                          {t("readings.readButton")}
                        </button>
                        <button
                          type="button"
                          className="ghost"
                          onClick={() => {
                            setOpenTranslations((prev) => {
                              const next = new Set(prev);
                              if (next.has(item.id)) {
                                next.delete(item.id);
                              } else {
                                next.add(item.id);
                              }
                              return next;
                            });
                          }}
                        >
                          {isOpen ? t("readings.hideTranslation") : t("readings.showTranslation")}
                        </button>
                      </div>
                      {isOpen && (
                        <div className="reading-translation">
                          <div className="reading-translation-tabs">
                            {item.stream === "english" ? (
                              <>
                                <button
                                  type="button"
                                  className={activeLocale === "nb" ? "active" : ""}
                                  onClick={() =>
                                    setReadingLocales((prev) => ({
                                      ...prev,
                                      [item.id]: "nb",
                                    }))
                                  }
                                  disabled={!nbText}
                                >
                                  NB
                                </button>
                                <button
                                  type="button"
                                  className={activeLocale === "ru" ? "active" : ""}
                                  onClick={() =>
                                    setReadingLocales((prev) => ({
                                      ...prev,
                                      [item.id]: "ru",
                                    }))
                                  }
                                  disabled={!ruText}
                                >
                                  RU
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  className={activeLocale === "en" ? "active" : ""}
                                  onClick={() =>
                                    setReadingLocales((prev) => ({
                                      ...prev,
                                      [item.id]: "en",
                                    }))
                                  }
                                  disabled={!enText}
                                >
                                  EN
                                </button>
                                <button
                                  type="button"
                                  className={activeLocale === "ru" ? "active" : ""}
                                  onClick={() =>
                                    setReadingLocales((prev) => ({
                                      ...prev,
                                      [item.id]: "ru",
                                    }))
                                  }
                                  disabled={!ruText}
                                >
                                  RU
                                </button>
                              </>
                            )}
                          </div>
                          <div className="muted small">
                            {currentText
                              ? currentText.split(/\\n+/).map((para, idx) => <p key={idx}>{para}</p>)
                              : t("readings.translationNotAvailable")}
                          </div>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
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
            <section className="card">
              <h3>Mobile debug</h3>
              <p className="muted small">
                This block is rendered by React. If you see it on your phone,
                JavaScript is running.
              </p>
              <p className="muted small">
                Logged in as: <strong>{auth?.display_name || auth?.username || "anonymous"}</strong>
              </p>
              <p className="muted small">
                Current stream: <strong>{streamLabel(stream)}</strong>, level:{" "}
                <strong>{levelLabel(currentLevel)}</strong>
              </p>
              <p className="muted small">
                Render time: <strong>{new Date().toLocaleString()}</strong>
              </p>
            </section>
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
            <VerbsPage
              stream={stream}
              currentLevel={currentLevel}
              studentEmail={studentEmail}
            />
          );
      case "irregularVerbs":
        return (
          <VerbsPage
            stream={stream}
            currentLevel={currentLevel}
            studentEmail={studentEmail}
            defaultTag="irregular"
          />
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
        return <GlossaryPage stream={stream} currentLevel={currentLevel} />;
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

      <div className="mobile-nav-toggle">
        <button
          className="pill"
          onClick={() => setIsNavOpen((o) => !o)}
          aria-expanded={isNavOpen}
        >
          {"Menu \u2192 "}
          {navItems.find((n) => n.key === activeSection)?.label || "Menu"}
        </button>
      </div>

      <div className={`section-nav ${isNavOpen ? "is-open" : "is-closed"}`}>
        {navItems.map((item) => (
          <button
            key={item.key}
            className={`pill ${activeSection === item.key ? "pill--active" : ""}`}
            onClick={() => {
              setActiveSection(item.key);
              setIsNavOpen(false);
            }}
          >
            {item.label}
          </button>
        ))}
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
      {activeReading && (
        <div className="verb-modal" role="dialog" aria-modal="true">
          <div
            className="verb-modal__backdrop"
            onClick={() => setActiveReading(null)}
          />
          <div className="verb-modal__card reading-modal-card">
            <header>
              <div>
                <p className="muted small">
                  {streamLabel(activeReading.stream)} ·{" "}
                  {activeReading.level}
                </p>
                <h3>{activeReading.title}</h3>
              </div>
              <button
                type="button"
                onClick={() => setActiveReading(null)}
                aria-label={t("close")}
              >
                ✕
              </button>
            </header>
              <div className="reading-modal__body">
              <div className="reading-modal__text">
                {activeReading.body.split(/\n+/).map((para, idx) => (
                  <p key={idx}>{para}</p>
                ))}
              </div>
              <div className="reading-modal__translation reading-translation">
                {(() => {
                  const baseLocale =
                    activeReading.stream === "english" ? "ru" : "en";
                  const activeLocale =
                    readingLocales[activeReading.id] || baseLocale;
                  const enText =
                    activeReading.stream === "english"
                      ? ""
                      : activeReading.translation;
                  const nbText =
                    activeReading.stream === "english"
                      ? activeReading.translation_nb
                      : "";
                  const ruText =
                    activeReading.stream === "english"
                      ? activeReading.translation
                      : "";
                  const currentText =
                    activeLocale === "ru"
                      ? ruText
                      : activeLocale === "nb"
                      ? nbText
                      : enText;
                  return (
                    <>
                      <div className="reading-translation-tabs">
                        {activeReading.stream === "english" ? (
                          <>
                            <button
                              type="button"
                              className={
                                activeLocale === "nb" ? "active" : ""
                              }
                              onClick={() =>
                                setReadingLocales((prev) => ({
                                  ...prev,
                                  [activeReading.id]: "nb",
                                }))
                              }
                              disabled={!nbText}
                            >
                              NB
                            </button>
                            <button
                              type="button"
                              className={
                                activeLocale === "ru" ? "active" : ""
                              }
                              onClick={() =>
                                setReadingLocales((prev) => ({
                                  ...prev,
                                  [activeReading.id]: "ru",
                                }))
                              }
                              disabled={!ruText}
                            >
                              RU
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              type="button"
                              className={
                                activeLocale === "en" ? "active" : ""
                              }
                              onClick={() =>
                                setReadingLocales((prev) => ({
                                  ...prev,
                                  [activeReading.id]: "en",
                                }))
                              }
                              disabled={!enText}
                            >
                              EN
                            </button>
                            <button
                              type="button"
                              className={
                                activeLocale === "ru" ? "active" : ""
                              }
                              onClick={() =>
                                setReadingLocales((prev) => ({
                                  ...prev,
                                  [activeReading.id]: "ru",
                                }))
                              }
                              disabled={!ruText}
                            >
                              RU
                            </button>
                          </>
                        )}
                      </div>
                      <div className="muted small reading-modal__translation-body">
                        {currentText
                          ? currentText
                              .split(/\n+/)
                              .map((para, idx) => <p key={idx}>{para}</p>)
                          : t("readings.translationNotAvailable")}
                      </div>
                    </>
                  );
                })()}
              </div>
            </div>
          </div>
        </div>
      )}
      <Footer />
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

type ReadingLookupRow = {
  id: string;
  term: string;
  bokmaal: string;
  nynorsk: string;
  english: string;
  russian: string;
};

function buildReadingLookupRows(terms: GlossaryTerm[]): ReadingLookupRow[] {
  const map = new Map<string, ReadingLookupRow>();
  terms.forEach((term) => {
    const conceptEn =
      term.translation_en || (term.stream === "english" ? term.term : "");
    const conceptNb =
      term.translation_nb || (term.stream === "bokmaal" ? term.term : "");
    const conceptRu = term.translation_ru || "";
    const key = `${(conceptEn || "").toLowerCase()}|${(conceptNb || "")
      .toLowerCase()
      .trim()}|${(conceptRu || "").toLowerCase()}`;

    if (!key.replace(/\|/g, "").trim()) {
      return;
    }

    let row = map.get(key);
    if (!row) {
      row = {
        id: key,
        term:
          conceptNb ||
          term.term ||
          conceptEn ||
          conceptRu ||
          term.term,
        bokmaal: "",
        nynorsk: "",
        english: conceptEn || "",
        russian: conceptRu || "",
      };
      map.set(key, row);
    }

    if (term.stream === "bokmaal" && term.term) {
      row.bokmaal = appendVariant(row.bokmaal, term.term);
    }
    if (term.stream === "nynorsk" && term.term) {
      row.nynorsk = appendVariant(row.nynorsk, term.term);
    }
    if (term.stream === "english") {
      if (!row.english && (conceptEn || term.term)) {
        row.english = conceptEn || term.term;
      }
    }
    if (!row.russian && conceptRu) {
      row.russian = conceptRu;
    }
  });

  const result = Array.from(map.values());
  result.sort((a, b) => a.term.localeCompare(b.term));
  return result;
}

function appendVariant(current: string, value: string): string {
  if (!value) return current;
  if (!current) return value;
  const parts = current.split(" / ");
  if (parts.includes(value)) {
    return current;
  }
  return `${current} / ${value}`;
}

export default App;
