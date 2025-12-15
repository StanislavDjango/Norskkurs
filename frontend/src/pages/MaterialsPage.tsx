import React from "react";
import { useTranslation } from "react-i18next";

import type { Material, Stream } from "../types";

type Props = {
  materials: Material[];
  streamLabel: (stream: Stream) => string;
};

const MaterialsPage: React.FC<Props> = ({ materials, streamLabel }) => {
  const { t } = useTranslation();

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
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="ghost small"
                >
                  {t("open")}
                </a>
              )}
            </article>
          ))}
        </div>
      )}
    </>
  );
};

export default MaterialsPage;
