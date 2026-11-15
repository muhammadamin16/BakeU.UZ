import { Link } from "react-router-dom";
import { ArrowLeft, ShieldCheck, Snowflake } from "lucide-react";
import { useMiniApp } from "../context";
export default function MiniAppBar() {
  const { isMiniMode, isAdmin } = useMiniApp();
  if (!isMiniMode) return null;
  return (
    <div className="mini-shop-bar">
      <Link to="/miniapp">
        <ArrowLeft size={17} /> Boshlanish
      </Link>
      <span>
        <Snowflake size={14} /> BakeU Winter
      </span>
      {isAdmin ? (
        <Link to="/admin/telegram" aria-label="Admin panel">
          <ShieldCheck size={18} />
        </Link>
      ) : (
        <span className="mini-shop-dot" />
      )}
    </div>
  );
}
