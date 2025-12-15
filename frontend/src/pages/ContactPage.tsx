import React from "react";
import { useTranslation } from "react-i18next";

const ContactPage: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="card">
      <h2>{t("nav.contact")}</h2>
      <p className="muted">{t("contactText")}</p>
      <ul className="muted">
        <li>{t("contactEmail")}: support@norskkurs.no</li>
        <li>{t("contactFaq")}</li>
      </ul>
    </div>
  );
};

export default ContactPage;
