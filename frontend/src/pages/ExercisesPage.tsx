import React from "react";
import { useTranslation } from "react-i18next";

import type { Exercise, Stream } from "../types";

type Props = {
  exercises: Exercise[];
  streamLabel: (stream: Stream) => string;
};

const ExercisesPage: React.FC<Props> = ({ exercises, streamLabel }) => {
  const { t } = useTranslation();

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
              <p className="muted small">
                {t("estimated")}: {item.estimated_minutes} min
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
};

export default ExercisesPage;
