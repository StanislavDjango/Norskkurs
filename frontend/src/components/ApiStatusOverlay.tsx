import React, { useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import type { ApiErrorReport } from "../apiStatus";
import { publishOffline, subscribeApiStatus } from "../apiStatus";

const getInitialOffline = () => {
  if (typeof navigator === "undefined") return false;
  return navigator.onLine === false;
};

const ApiStatusOverlay: React.FC = () => {
  const { t } = useTranslation();
  const [offline, setOffline] = useState(getInitialOffline);
  const [lastError, setLastError] = useState<ApiErrorReport | null>(null);

  useEffect(() => {
    const onOffline = () => {
      setOffline(true);
      publishOffline(true);
    };
    const onOnline = () => {
      setOffline(false);
      publishOffline(false);
    };
    window.addEventListener("offline", onOffline);
    window.addEventListener("online", onOnline);
    return () => {
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("online", onOnline);
    };
  }, []);

  useEffect(() => {
    return subscribeApiStatus((event) => {
      if (event.type === "offline") {
        setOffline(event.offline);
        return;
      }
      if (event.type === "error") {
        setLastError(event.error);
      }
    });
  }, []);

  const errorTitle = useMemo(() => {
    if (!lastError) return "";
    if (lastError.status) return t("apiErrorTitleWithStatus", "Ошибка API ({{status}})", { status: lastError.status });
    return t("apiErrorTitle", "Ошибка API");
  }, [lastError, t]);

  return (
    <>
      {offline && (
        <div className="status-banner status-banner--offline" role="status" aria-live="polite">
          <strong>{t("offlineTitle", "Нет соединения")}</strong>
          <span>{t("offlineHint", "Проверьте интернет — сайт продолжит работать после восстановления связи.")}</span>
        </div>
      )}

      {lastError && (
        <div className="api-error-toast" role="alert" aria-live="assertive">
          <div className="api-error-toast__header">
            <strong>{errorTitle}</strong>
            <button type="button" className="api-error-toast__close" onClick={() => setLastError(null)} aria-label={t("close", "Close")}>
              ×
            </button>
          </div>
          <div className="api-error-toast__body">
            <div className="api-error-toast__message">{lastError.message}</div>
            {(lastError.method || lastError.url) && (
              <div className="api-error-toast__meta">
                {[lastError.method?.toUpperCase(), lastError.url].filter(Boolean).join(" ")}
              </div>
            )}
          </div>
          <div className="api-error-toast__actions">
            {lastError.retry && (
              <button
                type="button"
                className="start-btn"
                onClick={() => {
                  const retry = lastError.retry;
                  if (!retry) return;
                  setLastError(null);
                  retry().catch(() => {});
                }}
              >
                {t("retry", "Повторить")}
              </button>
            )}
            <button type="button" className="ghost-btn" onClick={() => setLastError(null)}>
              {t("dismiss", "Скрыть")}
            </button>
          </div>
        </div>
      )}
    </>
  );
};

export default ApiStatusOverlay;
