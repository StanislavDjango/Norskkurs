import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import type {
  Level,
  ProfileInfo,
  Stream,
  UserLexeme,
  UserLexemeImportResult,
} from "../types";

type Props = {
  auth: ProfileInfo | null;
  lexemes: UserLexeme[];
  loading: boolean;
  onRefresh: () => void;
  onAdd: (
    payload: Partial<UserLexeme> & {
      text?: string;
      translation_en?: string;
      translation_nb?: string;
      translation_nn?: string;
      translation_ru?: string;
      level?: Level | string;
      language?: Stream | string;
    },
  ) => Promise<UserLexeme | null>;
  onUpdate: (id: number, payload: Partial<UserLexeme>) => Promise<UserLexeme | null>;
  onDelete: (id: number) => Promise<void>;
  onToggleFavorite: (key: string, meta?: Partial<UserLexeme>) => void | Promise<void>;
  onReview: (id: number, correct: boolean) => Promise<UserLexeme | null>;
  onExportCsv: () => Promise<{ blob: Blob; filename: string }>;
  onImportCsv: (
    file: File,
    options?: { update?: boolean },
  ) => Promise<UserLexemeImportResult>;
};

type Draft = {
  kind: "word" | "sentence";
  text: string;
  translation_en: string;
  translation_nb: string;
  translation_nn: string;
  translation_ru: string;
  language: Stream | "" | string;
  level: Level | "" | string;
  notes: string;
  tags: string;
};

const emptyDraft: Draft = {
  kind: "word",
  text: "",
  translation_en: "",
  translation_nb: "",
  translation_nn: "",
  translation_ru: "",
  language: "",
  level: "",
  notes: "",
  tags: "",
};

const MyWordsPage: React.FC<Props> = ({
  auth,
  lexemes,
  loading,
  onRefresh,
  onAdd,
  onUpdate,
  onDelete,
  onToggleFavorite,
  onReview,
  onExportCsv,
  onImportCsv,
}) => {
  const { t } = useTranslation();
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const [filterKind, setFilterKind] = useState<"" | "word" | "sentence">("");
  const [filterSource, setFilterSource] = useState<"" | "glossary" | "custom">("");
  const [filterLevel, setFilterLevel] = useState<Level | "" | string>("");
  const [filterLanguage, setFilterLanguage] = useState<Stream | "" | string>("");
  const [filterTag, setFilterTag] = useState<string>("");
  const [sortMode, setSortMode] = useState<"added" | "stale">("added");
  const [search, setSearch] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState<Draft>(emptyDraft);
  const [isTraining, setIsTraining] = useState(false);
  const [trainingIndex, setTrainingIndex] = useState(0);
  const [trainingShowAnswer, setTrainingShowAnswer] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importResult, setImportResult] = useState<UserLexemeImportResult | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const availableTags = useMemo(() => {
    const set = new Set<string>();
    lexemes.forEach((lex) => {
      (lex.tags || []).forEach((tag) => set.add(tag));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [lexemes]);

  const filteredLexemes = useMemo(() => {
    const q = search.trim().toLowerCase();
    return lexemes.filter((lex) => {
      if (filterKind && lex.kind !== filterKind) return false;
      if (filterSource && lex.source !== filterSource) return false;
      if (filterLevel && lex.level !== filterLevel) return false;
      if (filterLanguage && lex.language !== filterLanguage) return false;
      if (filterTag && !(lex.tags || []).includes(filterTag)) return false;
      if (q) {
        const haystack = [
          lex.text,
          lex.translation_en,
          lex.translation_nb,
          lex.translation_nn,
          lex.translation_ru,
          lex.notes,
          (lex.tags || []).join(" "),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [filterKind, filterLanguage, filterLevel, filterSource, filterTag, lexemes, search]);

  const sortedLexemes = useMemo(() => {
    const items = [...filteredLexemes];
    if (sortMode === "stale") {
      items.sort((a, b) => {
        const aTime = a.last_reviewed_at ? new Date(a.last_reviewed_at).getTime() : 0;
        const bTime = b.last_reviewed_at ? new Date(b.last_reviewed_at).getTime() : 0;
        if (aTime === bTime) {
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        }
        return aTime - bTime;
      });
    } else {
      items.sort(
        (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
      );
    }
    return items;
  }, [filteredLexemes, sortMode]);

  useEffect(() => {
    if (!isTraining) return;
    setTrainingIndex(0);
    setTrainingShowAnswer(false);
  }, [
    filterKind,
    filterLanguage,
    filterLevel,
    filterSource,
    filterTag,
    isTraining,
    search,
    sortMode,
    sortedLexemes.length,
  ]);

  const trainingPool = sortedLexemes;
  const currentTraining = trainingPool[trainingIndex];
  const totalCount = lexemes.length;
  const glossaryCount = lexemes.filter((lex) => lex.source === "glossary").length;
  const customCount = lexemes.filter((lex) => lex.source === "custom").length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.translation_en && !draft.translation_nb && !draft.translation_nn && !draft.translation_ru) {
      return;
    }
    const tags = draft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const created = await onAdd({
      source: "custom",
      kind: draft.kind,
      text: draft.text,
      translation_en: draft.translation_en,
      translation_nb: draft.translation_nb,
      translation_nn: draft.translation_nn,
      translation_ru: draft.translation_ru,
      language: draft.language,
      level: draft.level,
      notes: draft.notes,
      tags,
    });
    if (created) {
      setDraft(emptyDraft);
    }
  };

  const startEdit = (lex: UserLexeme) => {
    setEditingId(lex.id);
    setEditingDraft({
      kind: lex.kind,
      text: lex.text || "",
      translation_en: lex.translation_en || "",
      translation_nb: lex.translation_nb || "",
      translation_nn: lex.translation_nn || "",
      translation_ru: lex.translation_ru || "",
      language: lex.language || "",
      level: lex.level || "",
      notes: lex.notes || "",
      tags: (lex.tags || []).join(", "),
    });
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    const tags = editingDraft.tags
      .split(",")
      .map((tag) => tag.trim())
      .filter(Boolean);
    const updated = await onUpdate(editingId, {
      kind: editingDraft.kind,
      text: editingDraft.text,
      translation_en: editingDraft.translation_en,
      translation_nb: editingDraft.translation_nb,
      translation_nn: editingDraft.translation_nn,
      translation_ru: editingDraft.translation_ru,
      language: editingDraft.language,
      level: editingDraft.level,
      notes: editingDraft.notes,
      tags,
    });
    if (updated) {
      setEditingId(null);
    }
  };

  const handleTrainingAnswer = async (correct: boolean) => {
    if (!currentTraining || trainingPool.length === 0) return;
    try {
      await onReview(currentTraining.id, correct);
    } catch {
      // ignore review errors
    }
    setTrainingShowAnswer(false);
    setTrainingIndex((index) => (index + 1 >= trainingPool.length ? 0 : index + 1));
  };

  const handleExportCsv = async () => {
    setExporting(true);
    setImportError(null);
    try {
      const { blob, filename } = await onExportCsv();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = filename || "user-lexemes.csv";
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => window.URL.revokeObjectURL(url), 1000);
    } catch {
      setImportError(t("myWords.exportError"));
    } finally {
      setExporting(false);
    }
  };

  const handleImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    setImporting(true);
    setImportError(null);
    setImportResult(null);
    try {
      const result = await onImportCsv(file);
      setImportResult(result);
    } catch {
      setImportError(t("myWords.importError"));
    } finally {
      setImporting(false);
      if (event.target) {
        event.target.value = "";
      }
    }
  };

  const formatReviewDate = (value?: string | null) => {
    if (!value) return t("myWords.neverReviewed");
    const parsed = new Date(value);
    if (Number.isNaN(parsed.getTime())) return t("myWords.neverReviewed");
    return parsed.toLocaleDateString();
  };

  if (!auth?.is_authenticated) {
    return (
      <div className="mywords-shell">
        <div className="card mywords-panel">
          <h2>{t("myWords.title")}</h2>
          <p className="muted small">{t("myWords.authNeeded")}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mywords-shell">
      <section className="mywords-hero">
        <div className="mywords-hero-main">
          <div>
            <p className="mywords-kicker">{t("myWords.kicker")}</p>
            <h2>{t("myWords.title")}</h2>
            <p className="mywords-subtitle">{t("myWords.subtitle")}</p>
          </div>
          <div className="mywords-hero-actions">
            <button type="button" className="pill mywords-refresh" onClick={onRefresh} disabled={loading}>
              {loading ? t("loading") : t("myWords.refresh")}
            </button>
            <button
              type="button"
              className="pill ghost"
              onClick={handleExportCsv}
              disabled={exporting}
            >
              {exporting ? t("myWords.exporting") : t("myWords.exportCsv")}
            </button>
            <label className={`pill ghost mywords-import ${importing ? "is-loading" : ""}`}>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,text/csv"
                onChange={handleImportFile}
                disabled={importing}
              />
              {importing ? t("myWords.importing") : t("myWords.importCsv")}
            </label>
          </div>
        </div>
        <p className="muted small mywords-transfer-hint">{t("myWords.importHint")}</p>
        {(importResult || importError) && (
          <div className="mywords-transfer-status">
            {importResult && (
              <p className="muted small mywords-import-result">
                {t("myWords.importSummary", importResult)}
              </p>
            )}
            {importError && <p className="muted small mywords-import-error">{importError}</p>}
          </div>
        )}
        <div className="mywords-hero-stats">
          <div className="mywords-stat">
            <span>{t("myWords.statsTotal")}</span>
            <strong>{totalCount}</strong>
          </div>
          <div className="mywords-stat">
            <span>{t("myWords.statsGlossary")}</span>
            <strong>{glossaryCount}</strong>
          </div>
          <div className="mywords-stat">
            <span>{t("myWords.statsCustom")}</span>
            <strong>{customCount}</strong>
          </div>
        </div>
      </section>

      <div className="mywords-grid">
        <div className="card mywords-panel mywords-panel--compose">
          <div className="mywords-panel-header">
            <div>
              <h3>{t("myWords.composeTitle")}</h3>
              <p className="muted small">{t("myWords.composeHint")}</p>
            </div>
          </div>
          <form className="mywords-form" onSubmit={handleSubmit}>
          <div className="grid two">
            <label>
              <span className="muted small">{t("myWords.kind")}</span>
              <select
                value={draft.kind}
                onChange={(e) => setDraft((prev) => ({ ...prev, kind: e.target.value as Draft["kind"] }))}
              >
                <option value="word">{t("myWords.kindWord")}</option>
                <option value="sentence">{t("myWords.kindSentence")}</option>
              </select>
            </label>
            <label>
              <span className="muted small">{t("language")}</span>
              <select
                value={draft.language}
                onChange={(e) => setDraft((prev) => ({ ...prev, language: e.target.value }))}
              >
                <option value="">{t("myWords.languageOptional")}</option>
                <option value="bokmaal">{t("streamLabels.bokmaal")}</option>
                <option value="nynorsk">{t("streamLabels.nynorsk")}</option>
                <option value="english">{t("streamLabels.english")}</option>
              </select>
            </label>
          </div>
          <label>
            <span className="muted small">{t("myWords.textLabel")}</span>
            <input
              type="text"
              value={draft.text}
              onChange={(e) => setDraft((prev) => ({ ...prev, text: e.target.value }))}
              placeholder={t("myWords.textPlaceholder")}
            />
          </label>
          <div className="grid two">
            <label>
              <span className="muted small">EN</span>
              <input
                type="text"
                value={draft.translation_en}
                onChange={(e) => setDraft((prev) => ({ ...prev, translation_en: e.target.value }))}
              />
            </label>
            <label>
              <span className="muted small">NB</span>
              <input
                type="text"
                value={draft.translation_nb}
                onChange={(e) => setDraft((prev) => ({ ...prev, translation_nb: e.target.value }))}
              />
            </label>
            <label>
              <span className="muted small">NN</span>
              <input
                type="text"
                value={draft.translation_nn}
                onChange={(e) => setDraft((prev) => ({ ...prev, translation_nn: e.target.value }))}
              />
            </label>
            <label>
              <span className="muted small">RU</span>
              <input
                type="text"
                value={draft.translation_ru}
                onChange={(e) => setDraft((prev) => ({ ...prev, translation_ru: e.target.value }))}
              />
            </label>
          </div>
          <div className="grid two">
            <label>
              <span className="muted small">{t("level")}</span>
              <select
                value={draft.level}
                onChange={(e) => setDraft((prev) => ({ ...prev, level: e.target.value }))}
              >
                <option value="">{t("myWords.levelOptional")}</option>
                <option value="A1">{t("levelLabel.A1")}</option>
                <option value="A2">{t("levelLabel.A2")}</option>
                <option value="B1">{t("levelLabel.B1")}</option>
                <option value="B2">{t("levelLabel.B2")}</option>
              </select>
            </label>
            <label>
              <span className="muted small">{t("myWords.tags")}</span>
              <input
                type="text"
                value={draft.tags}
                onChange={(e) => setDraft((prev) => ({ ...prev, tags: e.target.value }))}
                placeholder={t("myWords.tagsPlaceholder")}
              />
            </label>
          </div>
          <label>
            <span className="muted small">{t("myWords.notes")}</span>
            <textarea
              value={draft.notes}
              onChange={(e) => setDraft((prev) => ({ ...prev, notes: e.target.value }))}
            />
          </label>
          <div className="actions">
            <button type="submit" className="pill">
              {t("myWords.add")}
            </button>
          </div>
        </form>
      </div>

      <div className="card mywords-panel mywords-panel--list">
        <div className="mywords-panel-header mywords-list-header">
          <div>
            <h3>{t("myWords.listTitle")}</h3>
            <p className="muted small">
              {t("myWords.count", { count: sortedLexemes.length, defaultValue: `${sortedLexemes.length} items` })}
            </p>
          </div>
          <div className="filters-row mywords-filter-bar">
            <input
              type="search"
              placeholder={t("glossarySearchPlaceholder")}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <select value={filterKind} onChange={(e) => setFilterKind(e.target.value as any)}>
              <option value="">{t("all")}</option>
              <option value="word">{t("myWords.kindWord")}</option>
              <option value="sentence">{t("myWords.kindSentence")}</option>
            </select>
            <select value={filterSource} onChange={(e) => setFilterSource(e.target.value as any)}>
              <option value="">{t("all")}</option>
              <option value="glossary">{t("myWords.sourceGlossary")}</option>
              <option value="custom">{t("myWords.sourceCustom")}</option>
            </select>
            <select value={filterLanguage} onChange={(e) => setFilterLanguage(e.target.value)}>
              <option value="">{t("language")}</option>
              <option value="bokmaal">{t("streamLabels.bokmaal")}</option>
              <option value="nynorsk">{t("streamLabels.nynorsk")}</option>
              <option value="english">{t("streamLabels.english")}</option>
            </select>
            <select value={filterLevel} onChange={(e) => setFilterLevel(e.target.value)}>
              <option value="">{t("level")}</option>
              <option value="A1">A1</option>
              <option value="A2">A2</option>
              <option value="B1">B1</option>
              <option value="B2">B2</option>
            </select>
            {availableTags.length > 0 && (
              <select value={filterTag} onChange={(e) => setFilterTag(e.target.value)}>
                <option value="">{t("myWords.tagsAll")}</option>
                {availableTags.map((tag) => (
                  <option key={tag} value={tag}>
                    {tag}
                  </option>
                ))}
              </select>
            )}
            <select value={sortMode} onChange={(e) => setSortMode(e.target.value as "added" | "stale")}>
              <option value="added">{t("myWords.sortAdded")}</option>
              <option value="stale">{t("myWords.sortStale")}</option>
            </select>
            <button
              type="button"
              className={`pill small mywords-training-toggle ${isTraining ? "pill--active" : ""}`}
              onClick={() => setIsTraining((prev) => !prev)}
              disabled={sortedLexemes.length === 0}
            >
              {isTraining ? t("myWords.trainingStop") : t("myWords.trainingStart")}
            </button>
          </div>
        </div>
        {loading && <p className="muted small">{t("loading")}</p>}
        {!loading && sortedLexemes.length === 0 && !isTraining && (
          <p className="muted small">{t("myWords.empty")}</p>
        )}
        {!loading && isTraining && trainingPool.length === 0 && (
          <p className="muted small">{t("myWords.trainingEmpty")}</p>
        )}
        {!loading && isTraining && trainingPool.length > 0 && currentTraining && (
          <div className="mywords-training">
            <div className="mywords-training-header">
              <div>
                <h4>{t("myWords.trainingTitle")}</h4>
                <p className="muted small">
                  {t("myWords.trainingCounter", {
                    current: trainingIndex + 1,
                    total: trainingPool.length,
                  })}
                </p>
              </div>
              <button
                type="button"
                className="ghost small"
                onClick={() => setIsTraining(false)}
              >
                {t("myWords.trainingStop")}
              </button>
            </div>
            <div className="mywords-training-body">
              <div className="mywords-training-front">
                <span className="muted small">{t("myWords.trainingFront")}</span>
                <strong>
                  {currentTraining.text ||
                    currentTraining.translation_nb ||
                    currentTraining.translation_en ||
                    currentTraining.translation_ru ||
                    currentTraining.translation_nn}
                </strong>
              </div>
              {!trainingShowAnswer ? (
                <button
                  type="button"
                  className="ghost"
                  onClick={() => setTrainingShowAnswer(true)}
                >
                  {t("myWords.trainingShow")}
                </button>
              ) : (
                <div className="mywords-training-answer">
                  {currentTraining.translation_en && (
                    <div>
                      <span className="label">EN</span>
                      <span>{currentTraining.translation_en}</span>
                    </div>
                  )}
                  {currentTraining.translation_nb && (
                    <div>
                      <span className="label">NB</span>
                      <span>{currentTraining.translation_nb}</span>
                    </div>
                  )}
                  {currentTraining.translation_nn && (
                    <div>
                      <span className="label">NN</span>
                      <span>{currentTraining.translation_nn}</span>
                    </div>
                  )}
                  {currentTraining.translation_ru && (
                    <div>
                      <span className="label">RU</span>
                      <span>{currentTraining.translation_ru}</span>
                    </div>
                  )}
                </div>
              )}
            </div>
            {trainingShowAnswer && (
              <div className="actions inline-actions">
                <button type="button" className="pill small" onClick={() => handleTrainingAnswer(true)}>
                  {t("myWords.trainingRemember")}
                </button>
                <button type="button" className="ghost small" onClick={() => handleTrainingAnswer(false)}>
                  {t("myWords.trainingNotRemember")}
                </button>
              </div>
            )}
          </div>
        )}
        {!loading && !isTraining && (
          <div className="mywords-list">
            {sortedLexemes.map((lex) => {
            const isEditing = editingId === lex.id;
            const conceptKey = lex.concept_key || "";
            return (
              <div key={lex.id} className="mywords-row">
                <div className="row-main">
                  {lex.source === "glossary" && (
                    <button
                      type="button"
                      className={`vocab-bookmark ${conceptKey && !lex.is_archived ? "active" : ""}`}
                      onClick={() => conceptKey && onToggleFavorite(conceptKey, lex)}
                      aria-label={t("addFavorite")}
                    >
                      ★
                    </button>
                  )}
                  {isEditing ? (
                    <div className="mywords-edit">
                      <div className="grid two">
                        <label>
                          <span className="muted small">{t("myWords.kind")}</span>
                          <select
                            value={editingDraft.kind}
                            onChange={(e) =>
                              setEditingDraft((prev) => ({ ...prev, kind: e.target.value as Draft["kind"] }))
                            }
                            disabled={lex.source === "glossary"}
                          >
                            <option value="word">{t("myWords.kindWord")}</option>
                            <option value="sentence">{t("myWords.kindSentence")}</option>
                          </select>
                        </label>
                        <label>
                          <span className="muted small">{t("language")}</span>
                          <select
                            value={editingDraft.language}
                            onChange={(e) => setEditingDraft((prev) => ({ ...prev, language: e.target.value }))}
                            disabled={lex.source === "glossary"}
                          >
                            <option value="">{t("myWords.languageOptional")}</option>
                            <option value="bokmaal">{t("streamLabels.bokmaal")}</option>
                            <option value="nynorsk">{t("streamLabels.nynorsk")}</option>
                            <option value="english">{t("streamLabels.english")}</option>
                          </select>
                        </label>
                      </div>
                      <label>
                        <span className="muted small">{t("myWords.textLabel")}</span>
                        <input
                          type="text"
                          value={editingDraft.text}
                          onChange={(e) => setEditingDraft((prev) => ({ ...prev, text: e.target.value }))}
                        />
                      </label>
                      <div className="grid two">
                        <label>
                          <span className="muted small">EN</span>
                          <input
                            type="text"
                            value={editingDraft.translation_en}
                            onChange={(e) => setEditingDraft((prev) => ({ ...prev, translation_en: e.target.value }))}
                          />
                        </label>
                        <label>
                          <span className="muted small">NB</span>
                          <input
                            type="text"
                            value={editingDraft.translation_nb}
                            onChange={(e) => setEditingDraft((prev) => ({ ...prev, translation_nb: e.target.value }))}
                          />
                        </label>
                        <label>
                          <span className="muted small">NN</span>
                          <input
                            type="text"
                            value={editingDraft.translation_nn}
                            onChange={(e) => setEditingDraft((prev) => ({ ...prev, translation_nn: e.target.value }))}
                          />
                        </label>
                        <label>
                          <span className="muted small">RU</span>
                          <input
                            type="text"
                            value={editingDraft.translation_ru}
                            onChange={(e) => setEditingDraft((prev) => ({ ...prev, translation_ru: e.target.value }))}
                          />
                        </label>
                      </div>
                      <div className="grid two">
                        <label>
                          <span className="muted small">{t("level")}</span>
                          <select
                            value={editingDraft.level}
                            onChange={(e) => setEditingDraft((prev) => ({ ...prev, level: e.target.value }))}
                            disabled={lex.source === "glossary"}
                          >
                            <option value="">{t("myWords.levelOptional")}</option>
                            <option value="A1">{t("levelLabel.A1")}</option>
                            <option value="A2">{t("levelLabel.A2")}</option>
                            <option value="B1">{t("levelLabel.B1")}</option>
                            <option value="B2">{t("levelLabel.B2")}</option>
                          </select>
                        </label>
                        <label>
                          <span className="muted small">{t("myWords.tags")}</span>
                          <input
                            type="text"
                            value={editingDraft.tags}
                            onChange={(e) => setEditingDraft((prev) => ({ ...prev, tags: e.target.value }))}
                            placeholder={t("myWords.tagsPlaceholder")}
                          />
                        </label>
                      </div>
                      <label>
                        <span className="muted small">{t("myWords.notes")}</span>
                        <textarea
                          value={editingDraft.notes}
                          onChange={(e) => setEditingDraft((prev) => ({ ...prev, notes: e.target.value }))}
                        />
                      </label>
                      <div className="actions inline-actions">
                        <button type="button" className="pill small" onClick={handleSaveEdit}>
                          {t("myWords.save")}
                        </button>
                        <button type="button" className="ghost small" onClick={() => setEditingId(null)}>
                          {t("myWords.cancel")}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <div className="mywords-head">
                        <h4>{lex.text || lex.translation_en || lex.translation_nb || lex.translation_ru}</h4>
                        <span className="pill tiny">{lex.kind === "sentence" ? t("myWords.kindSentence") : t("myWords.kindWord")}</span>
                        {lex.source === "glossary" && <span className="pill tiny muted">{t("myWords.sourceGlossary")}</span>}
                      </div>
                      <div className="muted small mywords-translations">
                        {lex.translation_en && (
                          <span>
                            EN: <strong>{lex.translation_en}</strong>
                          </span>
                        )}
                        {lex.translation_nb && (
                          <span>
                            NB: <strong>{lex.translation_nb}</strong>
                          </span>
                        )}
                        {lex.translation_nn && (
                          <span>
                            NN: <strong>{lex.translation_nn}</strong>
                          </span>
                        )}
                        {lex.translation_ru && (
                          <span>
                            RU: <strong>{lex.translation_ru}</strong>
                          </span>
                        )}
                      </div>
                      {lex.notes && <p className="muted small">{lex.notes}</p>}
                      <div className="muted tiny">
                        {(lex.tags || []).map((tag) => (
                          <span key={tag} className="tag">
                            #{tag}
                          </span>
                        ))}
                      </div>
                      <div className="muted tiny">
                        {t("myWords.reviewStats", {
                          reviewed: lex.times_reviewed,
                          correct: lex.times_correct,
                        })}{" "}
                        ·{" "}
                        {lex.last_reviewed_at
                          ? t("myWords.lastReview", { date: formatReviewDate(lex.last_reviewed_at) })
                          : t("myWords.neverReviewed")}
                      </div>
                      <div className="muted tiny">
                        {lex.language && <span>{t("language")}: {lex.language}</span>}{" "}
                        {lex.level && <span> · {t("level")}: {lex.level}</span>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="row-actions">
                  {!isEditing && (
                    <>
                      <button type="button" className="ghost small" onClick={() => startEdit(lex)}>
                        {t("myWords.edit")}
                      </button>
                      <button
                        type="button"
                        className="ghost small danger"
                        onClick={() => onDelete(lex.id)}
                      >
                        {t("myWords.delete")}
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        )}
      </div>
    </div>
    </div>
  );
};

export default MyWordsPage;
