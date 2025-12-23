import React, { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";

import { fetchProfileProgress } from "../api";
import type { ProfileInfo, ProfileProgress } from "../types";

type ProfileDraft = {
  name: string;
  email: string;
  firstName: string;
  lastName: string;
  middleName: string;
  dateOfBirth: string;
  learningLanguage: string;
  nativeLanguage: string;
};

type Props = {
  auth: ProfileInfo | null;
  profile: ProfileDraft;
  setProfile: React.Dispatch<React.SetStateAction<ProfileDraft>>;
  studentEmail: string;
  profileAuthError: string | null;
  profileSaveSuccess: boolean;
  onSaveProfile: () => void;
  vocabFavoritesCount: number;
  expressionFavoritesCount: number;
  onOpenVocabFavorites: () => void;
  onOpenExpressionsFavorites: () => void;
  onOpenMyWords: () => void;
};

const ProfilePage: React.FC<Props> = ({
  auth,
  profile,
  setProfile,
  studentEmail,
  profileAuthError,
  profileSaveSuccess,
  onSaveProfile,
  vocabFavoritesCount,
  expressionFavoritesCount,
  onOpenVocabFavorites,
  onOpenExpressionsFavorites,
  onOpenMyWords,
}) => {
  const { t } = useTranslation();

  const [profileProgress, setProfileProgress] = useState<ProfileProgress | null>(null);
  const [profileProgressLoading, setProfileProgressLoading] = useState(false);

  useEffect(() => {
    const emailForProgress = (studentEmail || auth?.username || "").trim();
    if (!emailForProgress) {
      setProfileProgress(null);
      return;
    }
    setProfileProgressLoading(true);
    fetchProfileProgress({ email: emailForProgress })
      .then((data) => setProfileProgress(data))
      .catch(() => setProfileProgress(null))
      .finally(() => setProfileProgressLoading(false));
  }, [studentEmail, auth?.username]);

  return (
    <>
      <h2>{t("nav.dashboard")}</h2>
      <div className="card">
        <h3>{t("authProfile.profileTitle")}</h3>
        <p className="muted small">{t("authProfile.profileHint")}</p>
        <section className="profile">
          <div>
            <label>{t("yourName")}</label>
            <input
              type="text"
              value={profile.name || auth?.display_name || ""}
              onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))}
            />
          </div>
          <div>
            <label>{t("yourEmail")}</label>
            <input
              type="email"
              value={profileProgress?.email || studentEmail || profile.email}
              readOnly
            />
          </div>
        </section>
        <div className="actions">
          <button
            type="button"
            className="ghost"
            onClick={onSaveProfile}
            disabled={!auth?.is_authenticated}
          >
            {t("authProfile.saveProfile")}
          </button>
        </div>
        {profileSaveSuccess && !profileAuthError && auth?.is_authenticated && (
          <div className="alert small auth-success">{t("authProfile.saveSuccess")}</div>
        )}
        {profileAuthError && <div className="alert small auth-error">{profileAuthError}</div>}
      </div>

      <div className="card">
        <h3>{t("authProfile.personalDataTitle")}</h3>
        <p className="muted small">{t("authProfile.personalDataHint")}</p>
        <section className="profile">
          <div>
            <label>{t("authProfile.lastName")}</label>
            <input
              type="text"
              value={profile.lastName}
              onChange={(e) => setProfile((p) => ({ ...p, lastName: e.target.value }))}
            />
          </div>
          <div>
            <label>{t("authProfile.firstName")}</label>
            <input
              type="text"
              value={profile.firstName}
              onChange={(e) => setProfile((p) => ({ ...p, firstName: e.target.value }))}
            />
          </div>
          <div>
            <label>{t("authProfile.middleName")}</label>
            <input
              type="text"
              value={profile.middleName}
              onChange={(e) => setProfile((p) => ({ ...p, middleName: e.target.value }))}
            />
          </div>
          <div>
            <label>{t("authProfile.dateOfBirth")}</label>
            <input
              type="date"
              value={profile.dateOfBirth}
              onChange={(e) => setProfile((p) => ({ ...p, dateOfBirth: e.target.value }))}
            />
          </div>
          <div>
            <label>{t("authProfile.learningLanguage")}</label>
            <input
              type="text"
              value={profile.learningLanguage}
              onChange={(e) => setProfile((p) => ({ ...p, learningLanguage: e.target.value }))}
            />
          </div>
          <div>
            <label>{t("authProfile.nativeLanguage")}</label>
            <input
              type="text"
              value={profile.nativeLanguage}
              onChange={(e) => setProfile((p) => ({ ...p, nativeLanguage: e.target.value }))}
            />
          </div>
        </section>
        <div className="actions">
          <button
            type="button"
            className="ghost"
            onClick={onSaveProfile}
            disabled={!auth?.is_authenticated}
          >
            {t("authProfile.savePersonal")}
          </button>
        </div>
      </div>

      <div className="card">
        <h3>{t("summary.quickStart")}</h3>
        <p className="muted small">{t("summary.quickHint")}</p>
        {profileProgressLoading && <p className="muted small">{t("loading")}</p>}
        {profileProgress && (
          <div className="summary-grid profile-summary-grid">
            <div>
              <span className="label">{t("auth.testsTakenLabel")}</span>
              <strong>{profileProgress.tests_taken}</strong>
            </div>
            {profileProgress.last_submission && (
              <div>
                <span className="label">{t("auth.lastResultLabel")}</span>
                <strong>
                  {Math.round(profileProgress.last_submission.percent)}% —{" "}
                  {profileProgress.last_submission.test_title}
                </strong>
              </div>
            )}
          </div>
        )}
        {!profileProgress && !profileProgressLoading && (
          <p className="muted small">{t("auth.noProgress")}</p>
        )}
      </div>

      <div className="card">
        <h3>{t("authProfile.favoritesTitle")}</h3>
        <p className="muted small">{t("authProfile.favoritesHint")}</p>
        <div className="summary-grid profile-summary-grid">
          <div>
            <span className="label">{t("authProfile.favWordsLabel")}</span>
            <strong>{vocabFavoritesCount}</strong>
            <div className="actions inline-actions">
              <button
                type="button"
                className="ghost small"
                disabled={vocabFavoritesCount === 0}
                onClick={onOpenVocabFavorites}
              >
                {t("authProfile.openVocab")}
              </button>
            </div>
          </div>
          <div>
            <span className="label">{t("authProfile.favExpressionsLabel")}</span>
            <strong>{expressionFavoritesCount}</strong>
            <div className="actions inline-actions">
              <button
                type="button"
                className="ghost small"
                disabled={expressionFavoritesCount === 0}
                onClick={onOpenExpressionsFavorites}
              >
                {t("authProfile.openExpressions")}
              </button>
            </div>
          </div>
          <div>
            <span className="label">{t("authProfile.myWordsLabel")}</span>
            <p className="muted small">{t("authProfile.myWordsHint")}</p>
            <div className="actions inline-actions">
              <button type="button" className="ghost small" onClick={onOpenMyWords}>
                {t("authProfile.openMyWords")}
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default ProfilePage;
