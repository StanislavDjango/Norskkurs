import React from "react";
import { useTranslation } from "react-i18next";

const Footer: React.FC = () => {
    const { t } = useTranslation();
    const year = new Date().getFullYear();

    return (
        <footer className="site-footer">
            <div className="footer-content">
                <div className="footer-section">
                    <h3 className="footer-title">📚 {t("appTitle")}</h3>
                    <p className="footer-desc">{t("appSubtitle")}</p>
                </div>

                <div className="footer-section footer-links">
                    <h4>Links</h4>
                    <ul>
                        <li>
                            <a href="mailto:contact@example.com" className="footer-link">
                                📧 Contact
                            </a>
                        </li>
                        <li>
                            <a href="https://github.com/StanislavDjango/Norskkurs" target="_blank" rel="noreferrer noopener" className="footer-link">
                                🔗 GitHub
                            </a>
                        </li>
                    </ul>
                </div>

                <div className="footer-section footer-info">
                    <p className="copyright">© {year} Norskkurs</p>
                    <p className="rights">All rights reserved</p>
                </div>
            </div>

            <div className="footer-bottom">
                <p className="footer-credit">Built with ❤️ for Norwegian learners</p>
            </div>
        </footer>
    );
};

export default Footer;
