import React, { useMemo } from "react";
import { useTranslation } from "react-i18next";

import type { Expression, Stream } from "../types";

type Props = {
  expressions: Expression[];
  expressionFavorites: number[];
  expressionView: "all" | "favorites";
  onChangeView: (view: "all" | "favorites") => void;
  onToggleFavorite: (id: number) => void;
  streamLabel: (stream: Stream) => string;
};

const ExpressionsPage: React.FC<Props> = ({
  expressions,
  expressionFavorites,
  expressionView,
  onChangeView,
  onToggleFavorite,
  streamLabel,
}) => {
  const { t, i18n } = useTranslation();

  const filteredExpressions = useMemo(() => {
    if (expressionView === "all") return expressions;
    if (expressionFavorites.length === 0) return [];
    const favoriteSet = new Set(expressionFavorites);
    return expressions.filter((expr) => favoriteSet.has(expr.id));
  }, [expressions, expressionFavorites, expressionView]);

  return (
    <>
      <h2>{t("nav.expressions")}</h2>
      {expressions.length > 0 && (
        <div className="verbs-view-toggle expressions-view-toggle">
          <button
            type="button"
            className={expressionView === "all" ? "active" : ""}
            onClick={() => onChangeView("all")}
          >
            {t("expressionTabs.all")}
          </button>
          <button
            type="button"
            className={expressionView === "favorites" ? "active" : ""}
            onClick={() => onChangeView("favorites")}
            disabled={expressionFavorites.length === 0}
          >
            {t("expressionTabs.favorites")} ({expressionFavorites.length})
          </button>
        </div>
      )}

      {filteredExpressions.length === 0 ? (
        <p className="muted">{t("emptyList")}</p>
      ) : (
        <div className="card-list">
          {filteredExpressions.map((expr) => (
            <article key={expr.id} className="card">
              <div className="card-meta expression-meta">
                <span className="badge">{streamLabel(expr.stream)}</span>
                <button
                  type="button"
                  className={`vocab-bookmark ${
                    expressionFavorites.includes(expr.id) ? "active" : ""
                  }`}
                  onClick={() => onToggleFavorite(expr.id)}
                  aria-label={
                    expressionFavorites.includes(expr.id)
                      ? t("removeFavorite")
                      : t("addFavorite")
                  }
                >
                  ★
                </button>
              </div>
              <h3>{expr.phrase}</h3>
              <p className="muted small">
                {(() => {
                  const lang = i18n.language.startsWith("ru")
                    ? "ru"
                    : i18n.language.startsWith("nb") || i18n.language.startsWith("no")
                      ? "nb"
                      : "en";
                  if (lang === "ru") return expr.meaning_ru;
                  if (lang === "nb") {
                    if (expr.stream === "nynorsk") {
                      return expr.meaning_nn || expr.meaning_nb || expr.meaning_en;
                    }
                    return expr.meaning_nb || expr.meaning_en;
                  }
                  return expr.meaning_en || expr.meaning_nb || expr.meaning_ru;
                })()}
              </p>
              <p className="muted small">{expr.example}</p>
            </article>
          ))}
        </div>
      )}
    </>
  );
};

export default ExpressionsPage;
