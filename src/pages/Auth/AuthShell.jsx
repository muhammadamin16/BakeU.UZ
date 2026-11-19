import { Link } from "react-router-dom";
import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import { translateText } from "../../i18n/index.js";
import "./Auth.css";

export default function AuthShell({ children }) {
  return (
    <div className="bk-auth">
      <div className="bk-card">
        <div className="bk-auth-visual" aria-hidden="true" />
        <section className="bk-auth-panel" aria-labelledby="bk-auth-title">
          <div className="bk-auth-top">
            <Link className="bk-logo" to="/" aria-label={translateText("BakeU, на главную")}>
              <img src="/images/logo-bear.png" width="2172" height="724" alt="BakeU" />
            </Link>
            <LanguageSwitcher />
          </div>
          {children}
        </section>
      </div>
    </div>
  );
}
