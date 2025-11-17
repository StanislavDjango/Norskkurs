import { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchTestDetail, fetchTests, submitTest } from "./api";
import type {
  AnswerPayload,
  Question,
  QuestionReview,
  SubmissionResponse,
  Test,
  TestDetail,
  Level,
} from "./types";

const levelOrder: Record<string, number> = { A1: 1, A2: 2, B1: 3, B2: 4 };

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
  const [filterMode, setFilterMode] = useState<"all" | "single" | "fill" | "mixed" | "exam">("all");
  const [filterLevel, setFilterLevel] = useState<"all" | Level>("all");
  const [search, setSearch] = useState("");
  const [visibleCount, setVisibleCount] = useState(12);

  useEffect(() => {
    fetchTests()
      .then((data) => setTests([...data].sort((a, b) => levelOrder[a.level] - levelOrder[b.level])))
      .catch(() => setError("Could not load tests"));
  }, []);

  const selectTest = async (slug: string) => {
    setLoading(true);
    setError(null);
    setSummary(null);
    setReview([]);
    try {
      const detail = await fetchTestDetail(slug);
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

  const handleSelectOption = (questionId: number, value: number | null) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { question: questionId }), selected_option: value },
    }));
  };

  const handleTextChange = (questionId: number, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: { ...(prev[questionId] || { question: questionId }), text_response: value },
    }));
  };

  const handleSubmit = async () => {
    if (!selectedTest) return;
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
    } catch (e) {
      console.error(e);
      setError("Could not submit answers");
    } finally {
      setLoading(false);
    }
  };

  const levelLabel = (level: string) => t(`levelLabel.${level}`);

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

  return (
    <div className="page">
      <header className="header">
        <div>
          <h1>{t("appTitle")}</h1>
          <p className="muted">{t("appSubtitle")}</p>
        </div>
        <div className="header-actions">
          <a href="http://localhost:8001/admin/" className="admin-link" target="_blank" rel="noreferrer">
            Admin
          </a>
          <div className="language-switcher">
            <span>{t("language")}:</span>
            <button
              className={i18n.language === "en" ? "active" : ""}
              onClick={() => i18n.changeLanguage("en")}
            >
              EN
            </button>
            <button
              className={i18n.language === "nb" ? "active" : ""}
              onClick={() => i18n.changeLanguage("nb")}
            >
              NO
            </button>
          </div>
        </div>
      </header>

      {error && <div className="alert">{error}</div>}

      <div className="layout">
        <aside className="panel">
          <h2>{t("selectTest")}</h2>
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
              <div className="muted small">No tests match filters.</div>
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
                    question={question}
                    answer={answers[question.id]}
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

              {summary && review.length > 0 && (
                <section className="review">
                  <h3>{t("reviewTitle")}</h3>
                  <div className="review-grid">
                    {review.map((entry) => (
                      <div
                        key={entry.question}
                        className={`review-card ${entry.is_correct ? "good" : "bad"}`}
                      >
                        <div className="review-card__header">
                          <span className="badge">{entry.is_correct ? t("correct") : t("incorrect")}</span>
                          <span className="muted small">{entry.question_type === "single" ? "MCQ" : "Fill"}</span>
                        </div>
                        <p className="question-text">{entry.text}</p>
                        <div className="review-row">
                          <span className="label">{t("yourAnswer")}:</span>
                          <span className="answer-text">
                            {entry.selected_text && entry.selected_text.trim()
                              ? entry.selected_text
                              : "—"}
                          </span>
                        </div>
                        <div className="review-row">
                          <span className="label">{t("rightAnswer")}:</span>
                          <span className="answer-text">
                            {entry.correct_answers.length
                              ? entry.correct_answers.join(", ")
                              : "—"}
                          </span>
                        </div>
                        {entry.explanation && (
                          <div className="review-row">
                            <span className="label">{t("explanation")}:</span>
                            <span className="answer-text">{entry.explanation}</span>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
};

const QuestionBlock = ({
  question,
  answer,
  onSelectOption,
  onChangeText,
}: {
  question: Question;
  answer?: AnswerPayload;
  onSelectOption: (questionId: number, value: number | null) => void;
  onChangeText: (questionId: number, value: string) => void;
}) => {
  const { t } = useTranslation();
  return (
    <article className="question">
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
    </article>
  );
};

export default App;
