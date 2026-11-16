import { getLocale } from "../../../i18n/index.js";
import { translateText } from "../../../i18n/index.js";
import { Link } from "react-router-dom";
import "./StatCard.css";
export default function StatCard({ icon: Icon, label, value, to }) {
  return (
    <Link className="ad-stat" to={to}>
      <span>
        <span className="ad-stat-icon">
          <Icon size={21} />
        </span>
        {translateText(label)}
      </span>
      <strong>{translateText(value.toLocaleString(getLocale()))}</strong>
    </Link>
  );
}
