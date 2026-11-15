import { Link } from "react-router-dom";
import "./StatCard.css";
export default function StatCard({ icon: Icon, label, value, to }) {
  return (
    <Link className="ad-stat" to={to}>
      <span>
        <Icon size={23} />
        {label}
      </span>
      <strong>{value.toLocaleString("ru-RU")}</strong>
    </Link>
  );
}
