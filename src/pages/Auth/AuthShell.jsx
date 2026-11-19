
import { useEffect } from "react";
import { Link } from "react-router-dom";

import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import { translateText } from "../../i18n/index.js";

import "./Auth.css";

export default function AuthShell({ children }) {
  useEffect(() => {
    document.body.classList.add("bk-auth-page");

    return () => {
      document.body.classList.remove("bk-auth-page");
    };
  }, []);

  return (
    <main className="bk-auth">
      <div className="bk-card">
        {/* LEFT SIDE — IMAGE */}
        <div
          className="bk-auth-visual"
          aria-hidden="true"
        />

        {/* RIGHT SIDE — FORM */}
        <section
          className="bk-auth-panel"
          aria-labelledby="bk-auth-title"
        >
          <div className="bk-auth-content">
            <header className="bk-auth-top">
              <Link
                className="bk-logo"
                to="/"
                aria-label={translateText(
                  "BakeU, на главную"
                )}
              >
                <img
                  src="/images/logo-bear.png"
                  width="2172"
                  height="724"
                  alt="BakeU"
                />
              </Link>

              <LanguageSwitcher />
            </header>

            {children}
          </div>
        </section>
      </div>
    </main>
  );
}
