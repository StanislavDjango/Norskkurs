import React, { useMemo, useState } from "react";
import { useTranslation } from "react-i18next";
import type { Level, ProfileInfo, Stream } from "../types";

type UiLanguage = "en" | "nb" | "ru" | string;

type Props = {
  auth: ProfileInfo | null;
  isTeacher: boolean;
  onLogout: () => void;
  currentLang: UiLanguage;
  changeLanguage: (lang: UiLanguage) => void;
  stream: Stream;
  level: Level;
  onChangeStream: (stream: Stream) => void;
  onChangeLevel: (level: Level) => void;
  onOpenAuthModal: () => void;
};

const streams: Array<{ key: Stream; label: string }> = [
  { key: "bokmaal", label: "Bokmål" },
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
  onOpenAuthModal,
}) => {
  const { t } = useTranslation();
  const [isMobileControlsOpen, setIsMobileControlsOpen] = useState(false);

  const apiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
  const adminBase =
    (import.meta.env.VITE_ADMIN_URL as string | undefined) ||
    (apiBase ? apiBase.replace(/\/api\/?$/, "/admin/") : "https://norskkurs.xyz/admin/");
  const streamSummary = useMemo(
    () => streams.find((item) => item.key === stream)?.label || stream,
    [stream],
  );
  const languageSummary =
    currentLang.startsWith("ru")
      ? "RU"
      : currentLang.startsWith("nb") ||
          currentLang.startsWith("no") ||
          currentLang.startsWith("nn")
        ? "NO"
        : "EN";
  const mobileSummary = `${streamSummary} · ${level} · ${languageSummary}`;

  const renderUserActions = () => {
    if (auth?.is_authenticated) {
      return (
        <>
          <span className="user-name">{auth.display_name || auth.username}</span>
          {isTeacher && (
            <a
              href={adminBase}
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
      <button
        type="button"
        className="login-link"
        onClick={onOpenAuthModal}
      >
        {t("login")}
      </button>
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
          <div className="logo-icon logo-icon--festive">
            <span className="logo-letter">N</span>
            <span className="logo-hat" aria-hidden="true" />
          </div>
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

      <button
        type="button"
        className="header-mobile-toggle"
        aria-expanded={isMobileControlsOpen}
        aria-controls="site-header-controls"
        onClick={() => setIsMobileControlsOpen((prev) => !prev)}
      >
        <span className="header-mobile-toggle__label">
          {isMobileControlsOpen
            ? t("header.hideControls")
            : t("header.showControls")}
        </span>
        <span className="header-mobile-toggle__summary">{mobileSummary}</span>
      </button>

      <div
        id="site-header-controls"
        className={`header-controls ${isMobileControlsOpen ? "is-open" : ""}`}
      >
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
