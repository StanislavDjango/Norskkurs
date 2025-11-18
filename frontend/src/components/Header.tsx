import React from "react";
import { useTranslation } from "react-i18next";
import type { ProfileInfo } from "../types";

type Props = {
  auth: ProfileInfo | null;
  isTeacher: boolean;
  onLogout: () => void;
  currentLang: string;
  changeLanguage: (lang: string) => void;
};

const Header: React.FC<Props> = ({ auth, isTeacher, onLogout, currentLang, changeLanguage }) => {
  const { t } = useTranslation();

  return (
    <header className="site-header">
      <div className="header-brand">
        <div className="logo-icon">N</div>
        <div className="brand-info">
          <h1 className="brand-title">{t("appTitle")}</h1>
          <p className="brand-subtitle">{t("appSubtitle")}</p>
        </div>
      </div>

      <nav className="header-nav">
        <div className="lang-group">
          <button
            className={`lang-btn ${currentLang === "en" ? "active" : ""}`}
            onClick={() => changeLanguage("en")}
            title="English"
          >
            EN
          </button>
          <button
            className={`lang-btn ${currentLang === "nb" ? "active" : ""}`}
            onClick={() => changeLanguage("nb")}
            title="Norsk Bokmål"
          >
            NO
          </button>
          <button
            className={`lang-btn ${currentLang === "ru" ? "active" : ""}`}
            onClick={() => changeLanguage("ru")}
            title="Русский"
          >
            RU
          </button>
        </div>

        <div className="user-section">
          {auth?.is_authenticated ? (
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
          ) : (
            <a
              href="http://localhost:8001/admin/login/?next=/admin/"
              className="login-link"
              target="_blank"
              rel="noreferrer noopener"
            >
              {t("login")}
            </a>
          )}
        </div>
      </nav>
    </header>
  );
};

export default Header;
