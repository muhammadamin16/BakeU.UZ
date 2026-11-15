import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowRight,
  Snowflake,
  Heart,
  ShieldCheck,
  ChevronRight,
  LoaderCircle,
  RefreshCw,
  Store,
  Leaf,
  Gift,
  Send,
} from "lucide-react";
import { useMiniApp } from "../context";
import { haptic } from "../telegram";
const snow = Array.from({ length: 16 }, (_, i) => ({
  left: `${(i * 37 + 7) % 100}%`,
  delay: `-${i * 1.7}s`,
  duration: `${14 + (i % 6) * 2}s`,
  size: 8 + (i % 4) * 3,
}));
export default function Welcome() {
  const navigate = useNavigate();
  const { status, user, isAdmin, error, retry, links } = useMiniApp();
  const enter = () => {
    haptic();
    navigate("/");
  };
  return (
    <div className="mini-welcome">
      <div className="mini-winter-bg" aria-hidden="true" />
      <div className="mini-snow" aria-hidden="true">
        {snow.map((s, i) => (
          <Snowflake
            key={i}
            size={s.size}
            style={{
              left: s.left,
              animationDelay: s.delay,
              animationDuration: s.duration,
            }}
          />
        ))}
      </div>
      <div className="mini-welcome-inner">
        <header className="mini-topline">
          <span>
            <Snowflake size={15} /> QISH ERTAGI BAKEU BILAN
          </span>
          <span className="mini-platform">
            <Send size={13} /> MINI APP
          </span>
        </header>
        <main className="mini-welcome-card">
          <div className="mini-intro">
            <img
              className="mini-logo"
              src="/images/logo-bear.png"
              alt="BakeU"
              width="330"
              height="110"
              fetchPriority="high"
            />
            <div className="mini-season">
              <span /> Qishning eng shirin ta’mlari
            </div>
            <h1>
              Bir chimdim mehr.
              <br />
              <em>Bir olam shirinlik.</em>
            </h1>
            <p className="mini-description">
              Uy pishiriqlari, sevimli desertlar va mehr bilan pishiradigan
              ustalar — barchasi BakeU’da.
            </p>
            <button className="mini-enter" onClick={enter}>
              <span>
                <Store size={21} /> Magazinga kirish
              </span>
              <ArrowUpRight size={23} />
            </button>
            <div className="mini-quick-tags">
              <span>🍰 Tortlar</span>
              <span>🍪 Pechenye</span>
              <span>🥐 Yangi pishiriqlar</span>
            </div>
          </div>
          <div className="mini-illustration">
            <div className="mini-halo" />
            <span className="mini-star star-one">✧</span>
            <span className="mini-star star-two">✦</span>
            <div className="mini-note note-top">
              <Heart size={17} />
              <span>
                Mehr bilan
                <br />
                <strong>tayyorlangan</strong>
              </span>
            </div>
            <img
              src="/images/winter/bear-gift.png"
              alt="Sovg‘ali qishki BakeU ayiqchasi"
              className="mini-bear"
              width="480"
              height="440"
            />
            <div className="mini-note note-bottom">
              <Gift size={19} />
              <span>
                Har bir buyurtmada
                <br />
                <strong>bir oz bayram</strong>
              </span>
            </div>
            <div className="mini-snow-base" />
          </div>
          <div className="mini-card-bottom">
            <div>
              <Leaf size={20} />
              <span>
                <strong>Uy ta’mi</strong>
                <small>Qalbdan tayyorlangan</small>
              </span>
            </div>
            <div>
              <Heart size={20} />
              <span>
                <strong>O‘z ustalari</strong>
                <small>Sevimli pishiruvchilar</small>
              </span>
            </div>
            <div>
              <Snowflake size={20} />
              <span>
                <strong>Qish kayfiyati</strong>
                <small>Har kuni iliqlik</small>
              </span>
            </div>
          </div>
        </main>
        <section className="mini-access" aria-label="Telegram holati">
          {status === "loading" ? (
            <p>
              <LoaderCircle className="mini-spin" size={16} /> Telegram
              tekshirilmoqda…
            </p>
          ) : status === "ready" ? (
            <p>
              <ShieldCheck size={16} />
              <span>
                Xush kelibsiz, <strong>{user.firstName}</strong>
              </span>
            </p>
          ) : status === "error" ? (
            <div className="mini-error" role="status">
              <span>{error}</span>
              <button onClick={retry}>
                <RefreshCw size={14} /> Qayta urinish
              </button>
            </div>
          ) : (
            <p>
              <ShieldCheck size={15} /> Magazinni mehmon sifatida ham
              ko‘rishingiz mumkin
            </p>
          )}
          {isAdmin && status === "ready" && (
            <Link
              className="mini-admin-entry"
              to="/admin/telegram"
              onClick={haptic}
            >
              <span>
                <ShieldCheck size={18} />
                <strong>Admin panel</strong>
                <small>Akkauntlar va magazinlar</small>
              </span>
              <ChevronRight size={18} />
            </Link>
          )}
        </section>
        <footer className="mini-welcome-footer">
          <span>BakeU · Mehrdan boshlangan</span>
          {links.telegram && (
            <a href={links.telegram} target="_blank" rel="noreferrer">
              Telegram <ArrowRight size={12} />
            </a>
          )}
          <Link to="/">
            Magazinni ko‘rish <ArrowRight size={12} />
          </Link>
        </footer>
      </div>
    </div>
  );
}
