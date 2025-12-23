import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchGlossary, fetchReadings } from "../api";
import type { GlossaryTerm, Level, Reading, Stream } from "../types";
import { buildConceptKey } from "../utils/lexemes";

type ReadingLookupRow = {
  id: string;
  term: string;
  bokmaal: string;
  nynorsk: string;
  english: string;
  russian: string;
  glossaryIds: number[];
  glossaryIdByStream: Partial<Record<Stream, number>>;
};

type Props = {
  stream: Stream;
  currentLevel: Level;
  studentEmail: string;
  vocabFavorites: string[];
  isAuthenticated?: boolean;
  onToggleVocabFavorite: (
    id: string,
    meta?: {
      glossary_term?: number;
      text?: string;
      translation_en?: string;
      translation_nb?: string;
      translation_nn?: string;
      translation_ru?: string;
      language?: Stream;
      level?: Level;
    },
  ) => void;
  onOpenMyWords: () => void;
  streamLabel: (value: Stream) => string;
};

const ReadingsPage: React.FC<Props> = ({
  stream,
  currentLevel,
  studentEmail,
  vocabFavorites,
  isAuthenticated,
  onToggleVocabFavorite,
  onOpenMyWords,
  streamLabel,
}) => {
  const { t } = useTranslation();

  const [readings, setReadings] = useState<Reading[]>([]);
  const [openTranslations, setOpenTranslations] = useState<Set<number>>(new Set());
  const [readingLocales, setReadingLocales] =
    useState<Record<number, "en" | "nb" | "nn" | "ru">>({});
  const [activeReading, setActiveReading] = useState<Reading | null>(null);
  const [readingTag, setReadingTag] = useState<string>("all");
  const [readingTitleFilter, setReadingTitleFilter] = useState<string>("all");

  const [readingLookup, setReadingLookup] = useState("");
  const [readingLookupResults, setReadingLookupResults] = useState<ReadingLookupRow[]>([]);
  const [readingLookupLoading, setReadingLookupLoading] = useState(false);

  useEffect(() => {
    const readingParams = {
      student_email: studentEmail || undefined,
      level: currentLevel,
    };

    fetchReadings(readingParams)
      .then((data) => {
        setReadings(data);
        setOpenTranslations(new Set());
      })
      .catch(() => {
        setReadings([]);
        setOpenTranslations(new Set());
      });
  }, [currentLevel, studentEmail]);

  useEffect(() => {
    setReadingTitleFilter("all");
  }, [stream, currentLevel]);

  useEffect(() => {
    const query = readingLookup.trim();
    if (!query) {
      setReadingLookupResults([]);
      setReadingLookupLoading(false);
      return;
    }

    let cancelled = false;
    const handle = setTimeout(() => {
      if (cancelled) return;
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
    }, 300);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [readingLookup, stream]);

  const readingTags = useMemo(() => {
    const set = new Set<string>();
    readings.forEach((item) => {
      (item.tags || []).forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [readings]);

  const readingTitleOptions = useMemo(
    () =>
      readings
        .map((item) => {
          const primaryLangByStream: Record<Stream, "en" | "nb" | "nn"> = {
            bokmaal: "nb",
            nynorsk: "nn",
            english: "en",
          };

          const titleVersions: Record<"en" | "nb" | "nn" | "ru", string> = {
            en: item.title_en || (item.stream === "english" ? item.title : ""),
            nb: item.title_nb || (item.stream === "bokmaal" ? item.title : ""),
            nn: item.title_nn || (item.stream === "nynorsk" ? item.title : ""),
            ru: item.title_ru || "",
          };

          const primaryLang = primaryLangByStream[stream];
          const primaryTitle = (titleVersions[primaryLang] || "").trim() || item.title;

          return {
            id: String(item.id),
            title: primaryTitle,
          };
        })
        .filter((option) => option.title.trim().length > 0)
        .sort((a, b) => a.title.localeCompare(b.title)),
    [readings, stream],
  );

  const filteredReadings = useMemo(() => {
    let result = readings;

    if (readingTag !== "all") {
      result = result.filter((item) => (item.tags || []).includes(readingTag));
    }

    if (readingTitleFilter !== "all") {
      const selectedId = Number(readingTitleFilter);
      if (!Number.isNaN(selectedId)) {
        result = result.filter((item) => item.id === selectedId);
      }
    }

    return result;
  }, [readings, readingTag, readingTitleFilter]);

  const renderReadingLookup = (variant: "toolbar" | "modal") => (
    <div
      className={
        variant === "modal"
          ? "readings-search readings-search--modal"
          : "readings-search"
      }
    >
      <label className="readings-search-label">
        <span className="muted small">{t("readings.lookupLabel")}</span>
        <input
          type="search"
          placeholder={t("glossarySearchPlaceholder")}
          value={readingLookup}
          onChange={(e) => setReadingLookup(e.target.value)}
        />
      </label>
      {!isAuthenticated && (
        <p className="muted tiny readings-auth-hint">{t("myWords.authHint")}</p>
      )}
      {readingLookup.trim() && (
        <div className="readings-search-results">
          {readingLookupLoading ? (
            <p className="muted small">{t("loading")}</p>
          ) : (
            readingLookupResults.slice(0, 5).map((row) => {
              const query = readingLookup.trim();
              const entries: { key: string; label: string; value: string }[] = [];
              if (row.bokmaal) entries.push({ key: "nb", label: "NB", value: row.bokmaal });
              if (row.nynorsk) entries.push({ key: "nn", label: "NN", value: row.nynorsk });
              if (row.english) entries.push({ key: "en", label: "EN", value: row.english });
              if (row.russian) entries.push({ key: "ru", label: "RU", value: row.russian });
              return (
                <div key={row.id} className="readings-search-result">
                  <button
                    type="button"
                    className={`vocab-bookmark ${vocabFavorites.includes(row.id) ? "active" : ""}`}
                    onClick={() =>
                      onToggleVocabFavorite(row.id, {
                        glossary_term:
                          row.glossaryIdByStream[stream] || row.glossaryIds[0],
                        text: row.bokmaal || row.nynorsk || row.english || row.russian,
                        translation_en: row.english,
                        translation_nb: row.bokmaal,
                        translation_nn: row.nynorsk,
                        translation_ru: row.russian,
                        language: stream,
                        level: currentLevel,
                      })
                    }
                    aria-label={
                      vocabFavorites.includes(row.id)
                        ? t("removeFavorite")
                        : t("addFavorite")
                    }
                  >
                    ★
                  </button>
                  <span className="muted small">
                    {entries.map((entry, index) => (
                      <React.Fragment key={entry.key}>
                        {index > 0 && " · "}
                        <strong>{entry.label}:</strong>{" "}
                        {highlightMatch(entry.value, query)}
                      </React.Fragment>
                    ))}
                  </span>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="readings-toolbar">
        <div className="readings-toolbar-header">
          <h2>{t("nav.readings")}</h2>
          <div className="readings-toolbar-actions">
            {readingTitleOptions.length > 0 && (
              <select
                className="glossary-tag-select readings-title-select readings-toolbar-control"
                value={readingTitleFilter}
                onChange={(e) => setReadingTitleFilter(e.target.value)}
              >
                <option value="all">{t("readings.titleFilterAll")}</option>
                {readingTitleOptions.map((option) => (
                  <option key={option.id} value={option.id}>
                    {option.title}
                  </option>
                ))}
              </select>
            )}
            {readingTags.length > 0 && (
              <select
                className="glossary-tag-select readings-toolbar-control"
                value={readingTag}
                onChange={(e) => setReadingTag(e.target.value)}
              >
                <option value="all">{t("tagAll")}</option>
                {readingTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
            <button type="button" className="readings-toolbar-control" onClick={onOpenMyWords}>
              {t("readings.myWordsButton")}
            </button>
          </div>
        </div>
        {renderReadingLookup("toolbar")}
      </div>

      {filteredReadings.length === 0 ? (
        <p className="muted">{t("readings.empty")}</p>
      ) : (
        <div className="card-list readings-list">
          {filteredReadings.map((item) => {
            const isOpen = openTranslations.has(item.id);

            const primaryLangByStream: Record<Stream, "en" | "nb" | "nn"> = {
              bokmaal: "nb",
              nynorsk: "nn",
              english: "en",
            };

            const versions: Record<"en" | "nb" | "nn" | "ru", string> = {
              en: item.stream === "english" ? item.body : item.translation_en,
              nb: item.stream === "bokmaal" ? item.body : item.translation_nb,
              nn: item.stream === "nynorsk" ? item.body : item.translation_nn,
              ru: item.translation_ru,
            };

            const titleVersions: Record<"en" | "nb" | "nn" | "ru", string> = {
              en: item.title_en || (item.stream === "english" ? item.title : ""),
              nb: item.title_nb || (item.stream === "bokmaal" ? item.title : ""),
              nn: item.title_nn || (item.stream === "nynorsk" ? item.title : ""),
              ru: item.title_ru || "",
            };

            const primaryLang = primaryLangByStream[stream];
            const primaryBody = (versions[primaryLang] || "").trim() || item.body;
            const primaryTitle = (titleVersions[primaryLang] || "").trim() || item.title;

            if (!primaryBody) {
              return null;
            }

            const translations: {
              code: "en" | "nb" | "nn" | "ru";
              label: string;
              text: string;
            }[] = [];

            const langMeta: { code: "en" | "nb" | "nn" | "ru"; label: string }[] = [
              { code: "en", label: "EN" },
              { code: "nb", label: "NB" },
              { code: "nn", label: "NN" },
              { code: "ru", label: "RU" },
            ];

            langMeta.forEach(({ code, label }) => {
              if (code === primaryLang) {
                return;
              }
              translations.push({
                code,
                label,
                text: versions[code],
              });
            });

            const availableTranslations = translations.filter((t) => t.text && t.text.trim().length > 0);
            const storedLocale = readingLocales[item.id];
            const activeLocale =
              (storedLocale && availableTranslations.find((t) => t.code === storedLocale)?.code) ||
              availableTranslations[0]?.code ||
              translations[0]?.code ||
              "en";

            const currentEntry = availableTranslations.find((t) => t.code === activeLocale);
            const currentText = currentEntry?.text || "";

            return (
              <article key={item.id} className="card">
                <div className="card-meta">
                  <span className="badge">{streamLabel(stream)}</span>
                  <span className="badge">{currentLevel}</span>
                </div>
                <h3>{primaryTitle}</h3>
                <div className="reading-excerpt">
                  {primaryBody.split(/\n+/).map((para: string, idx: number) => (
                    <p key={idx}>{para}</p>
                  ))}
                </div>
                <div className="reading-actions">
                  <button type="button" className="pill" onClick={() => setActiveReading(item)}>
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
                      {translations.map((entry) => (
                        <button
                          key={entry.code}
                          type="button"
                          className={activeLocale === entry.code ? "active" : ""}
                          onClick={() =>
                            setReadingLocales((prev) => ({
                              ...prev,
                              [item.id]: entry.code,
                            }))
                          }
                          disabled={!entry.text}
                        >
                          {entry.label}
                        </button>
                      ))}
                    </div>
                    <div className="muted small">
                      {currentText
                        ? currentText.split(/\n+/).map((para, idx) => <p key={idx}>{para}</p>)
                        : t("readings.translationNotAvailable")}
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      {activeReading && (
        <div className="verb-modal" role="dialog" aria-modal="true">
          <div className="verb-modal__backdrop" onClick={() => setActiveReading(null)} />
          <div className="verb-modal__card reading-modal-card">
            <header>
              <div>
                <p className="muted small">
                  {streamLabel(activeReading.stream)} · {activeReading.level}
                </p>
                <h3>{activeReading.title}</h3>
              </div>
              <button type="button" onClick={() => setActiveReading(null)} aria-label={t("close")}>
                ✕
              </button>
            </header>
            <div className="reading-modal__body">
              {renderReadingLookup("modal")}
              <div className="reading-modal__text">
                {(() => {
                  const primaryLangByStream: Record<Stream, "en" | "nb" | "nn"> = {
                    bokmaal: "nb",
                    nynorsk: "nn",
                    english: "en",
                  };
                  const versions: Record<"en" | "nb" | "nn" | "ru", string> = {
                    en: activeReading.stream === "english" ? activeReading.body : activeReading.translation_en,
                    nb: activeReading.stream === "bokmaal" ? activeReading.body : activeReading.translation_nb,
                    nn: activeReading.stream === "nynorsk" ? activeReading.body : activeReading.translation_nn,
                    ru: activeReading.translation_ru,
                  };
                  const primaryLang = primaryLangByStream[stream];
                  const primaryBodyText = (versions[primaryLang] || "").trim() || activeReading.body;
                  return primaryBodyText.split(/\n+/).map((para: string, idx: number) => (
                    <p key={idx}>{para}</p>
                  ));
                })()}
              </div>
              <div className="reading-modal__translation reading-translation">
                {(() => {
                  const primaryLangByStream: Record<Stream, "en" | "nb" | "nn"> = {
                    bokmaal: "nb",
                    nynorsk: "nn",
                    english: "en",
                  };

                  const versions: Record<"en" | "nb" | "nn" | "ru", string> = {
                    en: activeReading.stream === "english" ? activeReading.body : activeReading.translation_en,
                    nb: activeReading.stream === "bokmaal" ? activeReading.body : activeReading.translation_nb,
                    nn: activeReading.stream === "nynorsk" ? activeReading.body : activeReading.translation_nn,
                    ru: activeReading.translation_ru,
                  };

                  const primaryLang = primaryLangByStream[stream];

                  const translations: {
                    code: "en" | "nb" | "nn" | "ru";
                    label: string;
                    text: string;
                  }[] = [];

                  const langMeta: { code: "en" | "nb" | "nn" | "ru"; label: string }[] = [
                    { code: "en", label: "EN" },
                    { code: "nb", label: "NB" },
                    { code: "nn", label: "NN" },
                    { code: "ru", label: "RU" },
                  ];

                  langMeta.forEach(({ code, label }) => {
                    if (code === primaryLang) {
                      return;
                    }
                    translations.push({
                      code,
                      label,
                      text: versions[code],
                    });
                  });

                  const availableTranslations = translations.filter((t) => t.text && t.text.trim().length > 0);
                  const storedLocale = readingLocales[activeReading.id];
                  const activeLocale =
                    (storedLocale && availableTranslations.find((t) => t.code === storedLocale)?.code) ||
                    availableTranslations[0]?.code ||
                    translations[0]?.code ||
                    "en";

                  const currentEntry = availableTranslations.find((t) => t.code === activeLocale);
                  const currentText = currentEntry?.text || "";

                  return (
                    <>
                      <div className="reading-translation-tabs">
                        {translations.map((entry) => (
                          <button
                            key={entry.code}
                            type="button"
                            className={activeLocale === entry.code ? "active" : ""}
                            onClick={() =>
                              setReadingLocales((prev) => ({
                                ...prev,
                                [activeReading.id]: entry.code,
                              }))
                            }
                            disabled={!entry.text}
                          >
                            {entry.label}
                          </button>
                        ))}
                      </div>
                      <div className="muted small reading-modal__translation-body">
                        {currentText
                          ? currentText.split(/\n+/).map((para, idx) => <p key={idx}>{para}</p>)
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
    </>
  );
};

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function highlightMatch(text: string, query: string): React.ReactNode {
  const trimmed = query.trim();
  if (!trimmed) return text;
  const safe = escapeRegExp(trimmed);
  if (!safe) return text;
  const regex = new RegExp(safe, "gi");
  const matches = text.match(regex);
  if (!matches) return text;

  const parts = text.split(regex);
  const result: React.ReactNode[] = [];

  parts.forEach((part, index) => {
    if (part) {
      result.push(part);
    }
    const match = matches[index];
    if (match) {
      result.push(
        <mark key={`${match}-${index}`} className="readings-search-highlight">
          {match}
        </mark>,
      );
    }
  });

  return result;
}

function buildReadingLookupRows(terms: GlossaryTerm[]): ReadingLookupRow[] {
  const map = new Map<string, ReadingLookupRow>();
  terms.forEach((term) => {
    const conceptEn = term.translation_en || (term.stream === "english" ? term.term : "");
    const conceptNb = term.translation_nb || (term.stream === "bokmaal" ? term.term : "");
    const conceptNn = term.translation_nn || (term.stream === "nynorsk" ? term.term : "");
    const conceptRu = term.translation_ru || "";
    const key = buildConceptKey(conceptEn, conceptNb, conceptNn, conceptRu);

    if (!key.replace(/\|/g, "").trim()) {
      return;
    }

    let row = map.get(key);
    if (!row) {
      row = {
        id: key,
        term: conceptNb || term.term || conceptEn || conceptRu || term.term,
        bokmaal: "",
        nynorsk: "",
        english: conceptEn || "",
        russian: conceptRu || "",
        glossaryIds: [term.id],
        glossaryIdByStream: { [term.stream]: term.id },
      };
      map.set(key, row);
    } else {
      if (!row.glossaryIds.includes(term.id)) {
        row.glossaryIds.push(term.id);
      }
      if (!row.glossaryIdByStream[term.stream]) {
        row.glossaryIdByStream[term.stream] = term.id;
      }
    }

    if (conceptNb) {
      row.bokmaal = appendVariant(row.bokmaal, conceptNb);
    }
    if (conceptNn) {
      row.nynorsk = appendVariant(row.nynorsk, conceptNn);
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

export default ReadingsPage;
