import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchVerbs } from "../api";
import type { Level, Stream, VerbEntry } from "../types";

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

const verbFormOrder = ["infinitive", "present", "past", "perfect"] as const;
type VerbForm = (typeof verbFormOrder)[number];

type Props = {
  stream: Stream;
  currentLevel: Level;
  studentEmail: string;
};

const VerbsPage: React.FC<Props> = ({ stream, currentLevel, studentEmail }) => {
  const { t } = useTranslation();
  const streamLabel = (value: Stream) =>
    ({
      bokmaal: t("streamLabels.bokmaal"),
      nynorsk: t("streamLabels.nynorsk"),
      english: t("streamLabels.english"),
    }[value] ?? value);

  const [verbs, setVerbs] = useState<VerbEntry[]>([]);
  const [activeVerb, setActiveVerb] = useState<VerbEntry | null>(null);
  const [activeForm, setActiveForm] = useState<VerbForm>("infinitive");
  const [verbLetter, setVerbLetter] = useState<string>("all");
  const [verbTag, setVerbTag] = useState<string>("all");
  const [verbSearch, setVerbSearch] = useState<string>("");
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
    const params = {
      stream,
      level: currentLevel,
      student_email: studentEmail || undefined,
    };
    fetchVerbs(params).then(setVerbs).catch(() => setVerbs([]));
  }, [stream, currentLevel, studentEmail]);

  useEffect(() => {
    setVerbVisibleCount(15);
  }, [verbLetter, verbTag, verbView, verbs, verbSearch]);

  useEffect(() => {
    setVerbLetter("all");
  }, [verbTag, verbView]);

  useEffect(() => {
    localStorage.setItem("norskkurs_verb_favs", JSON.stringify(verbFavorites));
  }, [verbFavorites]);

  const filteredVerbs = useMemo(() => {
    const query = normalizeVerbToken(verbSearch);
    return verbs.filter((verb) => {
      const letterMatch =
        verbLetter === "all" ? true : getVerbStartingLetter(verb) === verbLetter;
      const tagMatch = verbTag === "all" ? true : (verb.tags || []).includes(verbTag);
      const viewMatch =
        verbView === "all" ? true : verbFavorites.includes(verb.id);
      const searchMatch =
        !query ||
        [verb.infinitive, verb.present, verb.past, verb.perfect, verb.verb].some((form) =>
          matchesSearch(form, query),
        );
      return letterMatch && tagMatch && viewMatch && searchMatch;
    });
  }, [verbs, verbLetter, verbTag, verbView, verbFavorites, verbSearch]);

  const verbTags = useMemo(() => {
    const set = new Set<string>();
    verbs.forEach((verb) => {
      (verb.tags || []).forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [verbs]);

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
    return () => observer.disconnect();
  }, [filteredVerbs, verbVisibleCount]);

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
          <div className="verbs-controls">
            <div className="verb-search">
              <input
                type="text"
                value={verbSearch}
                placeholder={t("verbSearchPlaceholder")}
                onChange={(e) => setVerbSearch(e.target.value)}
              />
            </div>
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
                <button
                  className="ghost"
                  onClick={() =>
                    setVerbVisibleCount((count) => Math.min(count + 15, filteredVerbs.length))
                  }
                >
                  {t("loadMore")}
                </button>
              </div>
            </>
          )}
        </div>
      )}

      {activeVerb && (
        <div className="verb-modal" role="dialog" aria-modal="true">
          <div className="verb-modal__backdrop" onClick={() => setActiveVerb(null)} />
          <div className="verb-modal__card">
            <header>
              <div>
                <p className="muted small">{streamLabel(activeVerb.stream)}</p>
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
                ✕
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
    </>
  );
};

function getVerbStartingLetter(verb: VerbEntry): string {
  const base = (verb.present || verb.infinitive || verb.verb || "")
    .split("/")[0]
    .trim();
  const cleaned = stripArticle(base);
  const match = cleaned.match(/[A-ZÆØÅ]/i);
  const letter =
    (match ? match[0] : cleaned.charAt(0) || verb.verb.charAt(0) || "A").toUpperCase();
  return letter;
}

function stripArticle(value: string): string {
  return value.replace(/^(?:å|to)\s+/i, "").trim();
}

function normalizeVerbToken(value: string): string {
  return stripArticle(value).toLowerCase();
}

function matchesSearch(form: string, query: string): boolean {
  if (!query) return true;
  return form
    .split(/[\/,]/)
    .map((part) => normalizeVerbToken(part))
    .some((token) => token.includes(query));
}

function getExamplesForForm(verb: VerbEntry, form: VerbForm): string[] {
  const lines = (
    {
      infinitive: verb.examples_infinitive,
      present: verb.examples_present,
      past: verb.examples_past,
      perfect: verb.examples_perfect,
    }[form] || ""
  )
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  return lines;
}

export default VerbsPage;
