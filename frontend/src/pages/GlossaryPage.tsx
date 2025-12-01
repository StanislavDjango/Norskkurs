import React, { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchGlossary } from "../api";
import type { GlossaryTerm, Level, Stream } from "../types";

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

type Props = {
  stream: Stream;
  currentLevel: Level;
};

type GlossaryRow = {
  id: string;
  bokmaal: string;
  nynorsk: string;
  english: string;
  russian: string;
  tags: string[];
};

const GlossaryPage: React.FC<Props> = ({ stream, currentLevel }) => {
  const { t } = useTranslation();

  const [terms, setTerms] = useState<GlossaryTerm[]>([]);
  const [letter, setLetter] = useState<string>("all");
  const [tag, setTag] = useState<string>("all");
  const [search, setSearch] = useState<string>("");
  const [visibleCount, setVisibleCount] = useState<number>(15);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    fetchGlossary()
      .then(setTerms)
      .catch(() => setTerms([]));
  }, [stream, currentLevel]);

  useEffect(() => {
    setVisibleCount(15);
  }, [letter, tag, search, terms]);

  const rows = useMemo<GlossaryRow[]>(() => {
    const map = new Map<string, GlossaryRow>();

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
          bokmaal: "",
          nynorsk: "",
          english: conceptEn || "",
          russian: conceptRu || "",
          tags: [],
        };
        map.set(key, row);
      }

      if (conceptNb) {
        row.bokmaal = appendVariant(row.bokmaal, conceptNb);
      }

      if (term.stream === "nynorsk" && term.term) {
        row.nynorsk = appendVariant(row.nynorsk, term.term);
      }

      if (term.stream === "english" && term.term) {
        row.english = appendVariant(row.english || "", term.term);
      } else if (!row.english && conceptEn) {
        row.english = conceptEn;
      }

      if (!row.russian && conceptRu) {
        row.russian = conceptRu;
      }

      const allTags = [...row.tags, ...(term.tags || [])];
      row.tags = Array.from(new Set(allTags));
    });

    const result = Array.from(map.values());
    result.sort((a, b) => {
      const aKey = (a.bokmaal || a.nynorsk || a.english || a.russian || "")
        .toLowerCase()
        .trim();
      const bKey = (b.bokmaal || b.nynorsk || b.english || b.russian || "")
        .toLowerCase()
        .trim();
      return aKey.localeCompare(bKey);
    });
    return result;
  }, [terms]);

  const allTags = useMemo(() => {
    const set = new Set<string>();
    rows.forEach((row) => {
      row.tags.forEach((t) => set.add(t));
    });
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [rows]);

  const filteredRows = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((row) => {
      const letterMatch =
        letter === "all" ? true : getRowLetter(row) === letter;
      const tagMatch = tag === "all" ? true : row.tags.includes(tag);
      const searchMatch =
        !q ||
        [row.bokmaal, row.nynorsk, row.english, row.russian]
          .filter(Boolean)
          .some((value) => value.toLowerCase().includes(q));
      return letterMatch && tagMatch && searchMatch;
    });
  }, [rows, letter, tag, search]);

  useEffect(() => {
    const sentinel = loadMoreRef.current;
    if (!sentinel) return undefined;
    if (filteredRows.length <= visibleCount) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setVisibleCount((count) =>
              Math.min(count + 15, filteredRows.length),
            );
          }
        });
      },
      { root: null, threshold: 1 },
    );

    observer.observe(sentinel);

    return () => observer.disconnect();
  }, [filteredRows, visibleCount]);

  if (terms.length === 0) {
    return <p className="muted">{t("emptyList")}</p>;
  }

  return (
    <>
      <h2 className="sr-only">{t("nav.glossary")}</h2>
      <div className="glossary-board">
        <div className="verbs-alphabet">
          <button
            type="button"
            className={letter === "all" ? "active" : ""}
            onClick={() => setLetter("all")}
          >
            {t("alphabetAll")}
          </button>
          {alphabet.map((ch) => {
            const hasLetter = rows.some(
              (row) => getRowLetter(row) === ch,
            );
            return (
              <button
                key={ch}
                type="button"
                disabled={!hasLetter}
                className={letter === ch ? "active" : ""}
                onClick={() => setLetter(ch)}
              >
                {ch}
              </button>
            );
          })}
        </div>

        {allTags.length > 0 && (
          <div className="verbs-tags">
            <button
              type="button"
              className={tag === "all" ? "active" : ""}
              onClick={() => setTag("all")}
            >
              {t("tagAll")}
            </button>
            {allTags.map((value) => (
              <button
                key={value}
                type="button"
                className={tag === value ? "active" : ""}
                onClick={() => setTag(value)}
              >
                {value}
              </button>
            ))}
          </div>
        )}

        <div className="verbs-controls">
          <div className="verb-search">
            <input
              type="text"
              value={search}
              placeholder={t("glossarySearchPlaceholder")}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="glossary-board__header">
          <span>{t("streamLabels.bokmaal")}</span>
          <span>{t("streamLabels.nynorsk")}</span>
          <span>{t("glossaryEnglishColumn")}</span>
          <span>{t("glossaryRussianColumn")}</span>
        </div>

        <div className="glossary-table">
          {filteredRows.slice(0, visibleCount).map((row) => (
            <div key={row.id} className="glossary-row">
              <div className="glossary-cell">
                <span className="glossary-label">{t("streamLabels.bokmaal")}</span>
                <strong>{row.bokmaal || "—"}</strong>
              </div>
              <div className="glossary-cell">
                <span className="glossary-label">{t("streamLabels.nynorsk")}</span>
                <strong>{row.nynorsk || "—"}</strong>
              </div>
              <div className="glossary-cell">
                <span className="glossary-label">{t("glossaryEnglishColumn")}</span>
                <strong>{row.english || "—"}</strong>
              </div>
              <div className="glossary-cell">
                <span className="glossary-label">{t("glossaryRussianColumn")}</span>
                <strong>{row.russian || "—"}</strong>
              </div>
            </div>
          ))}
        </div>

        {filteredRows.length > visibleCount && (
          <>
            <div
              className="verbs-sentinel"
              ref={loadMoreRef}
              aria-hidden="true"
              style={{ height: "2px" }}
            />
            <div className="load-more">
              <button
                className="ghost"
                onClick={() =>
                  setVisibleCount((count) =>
                    Math.min(count + 15, filteredRows.length),
                  )
                }
              >
                {t("loadMore")}
              </button>
            </div>
          </>
        )}
      </div>
    </>
  );
};

function appendVariant(current: string, value: string): string {
  if (!value) return current;
  if (!current) return value;
  const parts = current.split(" / ");
  if (parts.includes(value)) {
    return current;
  }
  return `${current} / ${value}`;
}

function getRowLetter(row: GlossaryRow): string {
  const base = (row.bokmaal || row.nynorsk || row.english || row.russian || "")
    .split("/")[0]
    .trim();
  if (!base) return "";
  const match = base.match(/[A-ZÆØÅ]/i);
  const letter = (match ? match[0] : base.charAt(0)).toUpperCase();
  return letter;
}

export default GlossaryPage;
