import React from "react";
import { useTranslation } from "react-i18next";

import type { Homework, Level, ProfileInfo, Stream } from "../types";

type Props = {
  homework: Homework[];
  auth: ProfileInfo | null;
  stream: Stream;
  currentLevel: Level;
  streamLabel: (stream: Stream) => string;
  levelLabel: (level: Level) => string;
};

const HomeworkPage: React.FC<Props> = ({
  homework,
  auth,
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
        <h3>Mobile debug</h3>
        <p className="muted small">
          This block is rendered by React. If you see it on your phone, JavaScript is running.
        </p>
        <p className="muted small">
          Logged in as:{" "}
          <strong>{auth?.display_name || auth?.username || "anonymous"}</strong>
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
