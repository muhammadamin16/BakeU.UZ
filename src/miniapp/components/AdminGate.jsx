import { Link } from "react-router-dom";
import { ShieldCheck, LoaderCircle, ArrowLeft, RefreshCw } from "lucide-react";
import { useMiniApp } from "../context";
export default function AdminGate({ children }) {
  const { status, isAdmin, retry, error } = useMiniApp();
  if (status === "ready" && isAdmin) return children;
  return (
    <main className="mini-gate">
      <img src="/images/logo-bear.png" alt="BakeU" width="240" height="80" />
      <div className="mini-gate-icon">
        {status === "loading" ? (
          <LoaderCircle className="mini-spin" size={31} />
        ) : (
          <ShieldCheck size={31} />
        )}
      </div>
      <h1>
        {status === "loading" ? "Kirish tekshirilmoqda…" : "Admin uchun kirish"}
      </h1>
      <p>
        {status === "loading"
          ? "Telegram hisobingiz tasdiqlanmoqda."
          : error ||
            "Bu bo‘lim faqat BakeU administratorlari uchun. Mini App’ni Telegram botidagi tugma orqali oching."}
      </p>
      {status !== "loading" && (
        <button className="mini-secondary" onClick={retry}>
          <RefreshCw size={16} /> Qayta tekshirish
        </button>
      )}
      <Link to="/miniapp">
        <ArrowLeft size={16} /> Boshlanishga qaytish
      </Link>
    </main>
  );
}
