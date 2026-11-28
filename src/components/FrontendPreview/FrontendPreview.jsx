import { Link } from "react-router-dom";
import { frontendOnly } from "../../api/account.js";
import { translateText as t } from "../../i18n/index.js";
import "./FrontendPreview.css";

export default function FrontendPreview() {
  if (!frontendOnly) return null;
  return <aside className="frontend-preview" aria-label="Frontend preview">
    <span><strong>Frontend demo</strong> · {t("Демонстрационные товары и магазины. Backend не подключён.")}</span>
    <Link to="/admin">{t("Предпросмотр Admin")}</Link>
  </aside>;
}
