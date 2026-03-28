import React from "react";
import { useTranslation } from "react-i18next";

import { getApiErrorMessage } from "../apiError";
import type { ProfileInfo } from "../types";
import type { AuthFormState } from "../app/types";

export const extractAuthErrorMessage = (
  error: unknown,
  fallback: string,
): string => {
  return getApiErrorMessage(error, fallback);
};

type Props = {
  auth: ProfileInfo | null;
  authMode: "login" | "register";
  profileAuthForm: AuthFormState;
  setProfileAuthForm: React.Dispatch<React.SetStateAction<AuthFormState>>;
  profileAuthLoading: boolean;
  profileAuthError: string | null;
  onSubmit: () => void;
  onToggleMode: () => void;
  onForgotPassword: () => void;
};

const AuthFields: React.FC<Props> = ({
  auth,
  authMode,
  profileAuthForm,
  setProfileAuthForm,
  profileAuthLoading,
  profileAuthError,
  onSubmit,
  onToggleMode,
  onForgotPassword,
}) => {
  const { t } = useTranslation();

  if (auth?.is_authenticated) {
    return (
      <p className="muted small">
        {t("auth.loggedInAs")}{" "}
        <strong>{auth.display_name || auth.username}</strong>
      </p>
    );
  }

  return (
    <>
      <p className="muted small">{t("auth.studentTitle")}</p>
      <div className="search-row">
        <input
          type="text"
          placeholder={
            authMode === "login"
              ? t("auth.identifierPlaceholder")
              : t("yourEmail")
          }
          value={profileAuthForm.email}
          onChange={(e) =>
            setProfileAuthForm((prev) => ({
              ...prev,
              email: e.target.value,
            }))
          }
        />
      </div>
      {authMode === "register" && (
        <div className="search-row">
          <input
            type="text"
            placeholder={t("yourName")}
            value={profileAuthForm.name}
            onChange={(e) =>
              setProfileAuthForm((prev) => ({
                ...prev,
                name: e.target.value,
              }))
            }
          />
        </div>
      )}
      <div className="search-row">
        <input
          type="password"
          placeholder={t("auth.passwordPlaceholder")}
          value={profileAuthForm.password}
          onChange={(e) =>
            setProfileAuthForm((prev) => ({
              ...prev,
              password: e.target.value,
            }))
          }
        />
      </div>
      {profileAuthError && (
        <div className="alert small auth-error">{profileAuthError}</div>
      )}
      <div className="auth-actions">
        <button
          type="button"
          className="pill"
          disabled={profileAuthLoading}
          onClick={onSubmit}
        >
          {authMode === "login" ? t("auth.login") : t("auth.register")}
        </button>
      </div>
      <button type="button" className="auth-switch" onClick={onToggleMode}>
        {authMode === "login" ? t("auth.toRegister") : t("auth.toLogin")}
      </button>
      <button type="button" className="auth-forgot" onClick={onForgotPassword}>
        {t("auth.forgotPassword")}
      </button>
    </>
  );
};

export default AuthFields;
