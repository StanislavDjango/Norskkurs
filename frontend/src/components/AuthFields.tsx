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
  supportMessage: string | null;
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
  supportMessage,
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
      <form
        id="auth-form"
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault();
          onSubmit();
        }}
      >
        <label className="sr-only" htmlFor="auth-identifier">
          {t("auth.identifierLabel")}
        </label>
        <div className="search-row">
          <input
            id="auth-identifier"
            data-autofocus
            type={authMode === "login" ? "text" : "email"}
            placeholder={
              authMode === "login"
                ? t("auth.identifierPlaceholder")
                : t("yourEmail")
            }
            autoComplete={authMode === "login" ? "username" : "email"}
            autoCapitalize="none"
            autoCorrect="off"
            inputMode={authMode === "login" ? "text" : "email"}
            enterKeyHint="next"
            required
            aria-invalid={profileAuthError ? "true" : "false"}
            aria-describedby={profileAuthError ? "auth-form-error" : undefined}
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
          <>
            <label className="sr-only" htmlFor="auth-name">
              {t("auth.nameLabel")}
            </label>
            <div className="search-row">
              <input
                id="auth-name"
                type="text"
                placeholder={t("yourName")}
                autoComplete="name"
                enterKeyHint="next"
                value={profileAuthForm.name}
                onChange={(e) =>
                  setProfileAuthForm((prev) => ({
                    ...prev,
                    name: e.target.value,
                  }))
                }
              />
            </div>
          </>
        )}
        <label className="sr-only" htmlFor="auth-password">
          {t("auth.passwordLabel")}
        </label>
        <div className="search-row">
          <input
            id="auth-password"
            type="password"
            placeholder={t("auth.passwordPlaceholder")}
            autoComplete={authMode === "login" ? "current-password" : "new-password"}
            enterKeyHint="done"
            minLength={6}
            required
            aria-invalid={profileAuthError ? "true" : "false"}
            aria-describedby={profileAuthError ? "auth-form-error" : undefined}
            value={profileAuthForm.password}
            onChange={(e) =>
              setProfileAuthForm((prev) => ({
                ...prev,
                password: e.target.value,
              }))
            }
          />
        </div>
      </form>
      {profileAuthError && (
        <div id="auth-form-error" className="alert small auth-error" role="alert">
          {profileAuthError}
        </div>
      )}
      <div className="auth-actions">
        <button
          type="submit"
          form="auth-form"
          className="pill"
          disabled={profileAuthLoading}
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
      {supportMessage && <p className="auth-support-note">{supportMessage}</p>}
    </>
  );
};

export default AuthFields;
