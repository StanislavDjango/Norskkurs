import React from "react";
import { useTranslation } from "react-i18next";

import type { Homework, Level, Stream } from "../types";

type Props = {
  homework: Homework[];
  stream: Stream;
  currentLevel: Level;
  streamLabel: (stream: Stream) => string;
  levelLabel: (level: Level) => string;
};

const HomeworkPage: React.FC<Props> = ({
  homework,
  stream,
  currentLevel,
  streamLabel,
  levelLabel,
}) => {
  const { t } = useTranslation();

  return (
    <>
      <h2>{t("nav.homework")}</h2>
      <section className="card">
        <p className="muted small">
          {streamLabel(stream)} · {levelLabel(currentLevel)}
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
                {item.due_date && (
                  <span className="badge ghost">
                    {new Date(item.due_date).toLocaleDateString()}
                  </span>
                )}
              </div>
              <h3>{item.title}</h3>
              <p className="muted small">{item.instructions}</p>
              <p className="muted small">
                {t("status")}: {item.status}
              </p>
            </article>
          ))}
        </div>
      )}
    </>
  );
};

export default HomeworkPage;
