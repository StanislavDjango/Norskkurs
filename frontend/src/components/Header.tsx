import React from "react";
import { useTranslation } from "react-i18next";
import type { Level, ProfileInfo, Stream } from "../types";

type Props = {
  auth: ProfileInfo | null;
  isTeacher: boolean;
  onLogout: () => void;
  currentLang: string;
  changeLanguage: (lang: string) => void;
  stream: Stream;
  level: Level;
  onChangeStream: (stream: Stream) => void;
  onChangeLevel: (level: Level) => void;
};

const streams: Array<{ key: Stream; label: string }> = [
  { key: "bokmaal", label: "Bokmal" },
  { key: "nynorsk", label: "Nynorsk" },
  { key: "english", label: "English" },
];

const levels: Level[] = ["A1", "A2", "B1", "B2"];

const Header: React.FC<Props> = ({
  auth,
  isTeacher,
  onLogout,
  currentLang,
  changeLanguage,
  stream,
  level,
  onChangeStream,
  onChangeLevel,
}) => {
  const { t } = useTranslation();

  const renderUserActions = () => {
    if (auth?.is_authenticated) {
      return (
        <>
          <span className="user-name">{auth.display_name || auth.username}</span>
          {isTeacher && (
            <a
              href="http://localhost:8001/admin/"
              className="admin-link"
              target="_blank"
              rel="noreferrer noopener"
            >
              {t("adminMenu")}
            </a>
          )}
          <button onClick={onLogout} className="logout-btn">
            {t("logout")}
          </button>
        </>
      );
    }

    return (
      <a
        href="http://localhost:8001/admin/login/?next=/admin/"
        className="login-link"
        target="_blank"
        rel="noreferrer noopener"
      >
        {t("login")}
      </a>
    );
  };

  const languageButtonSet = () => (
    <>
      <button
        className={`lang-btn ${currentLang === "en" ? "active" : ""}`}
        onClick={() => changeLanguage("en")}
      >
        EN
      </button>
      <button
        className={`lang-btn ${currentLang === "nb" ? "active" : ""}`}
        onClick={() => changeLanguage("nb")}
      >
        NO
      </button>
      <button
        className={`lang-btn ${currentLang === "ru" ? "active" : ""}`}
        onClick={() => changeLanguage("ru")}
      >
        RU
      </button>
    </>
  );

  return (
    <header className="site-header">
      <div className="header-top">
        <div className="header-brand">
          <div className="logo-icon">N</div>
          <div className="brand-info">
            <h1 className="brand-title">{t("appTitle")}</h1>
            <p className="brand-subtitle">{t("appSubtitle")}</p>
          </div>
        </div>

        <div className="header-actions">
          <div className="lang-group compact">{languageButtonSet()}</div>
          <div className="user-section">{renderUserActions()}</div>
        </div>
      </div>

      <div className="header-controls">
        <div className="control-block">
          <span className="group-label">{t("stream")}</span>
          <div className="control-buttons stretch">
            {streams.map((item) => (
              <button
                key={item.key}
                className={`lang-btn ${stream === item.key ? "active" : ""}`}
                onClick={() => onChangeStream(item.key)}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        <div className="control-block">
          <span className="group-label">{t("level")}</span>
          <div className="control-buttons tight">
            {levels.map((lvl) => (
              <button
                key={lvl}
                className={`lang-btn ${level === lvl ? "active" : ""}`}
                onClick={() => onChangeLevel(lvl)}
              >
                {lvl}
              </button>
            ))}
          </div>
        </div>

        <div className="control-block language-block">
          <span className="group-label">{t("language")}</span>
          <div className="control-buttons">{languageButtonSet()}</div>
        </div>
      </div>
    </header>
  );
};

export default Header;
