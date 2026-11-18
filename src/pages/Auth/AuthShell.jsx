import LanguageSwitcher from "../../components/LanguageSwitcher/LanguageSwitcher";
import { translateText } from "../../i18n/index.js";
import { useLayoutEffect, useRef } from "react";
import { Link } from "react-router-dom";
/**
 * Login va Register uchun umumiy maket: fonda bitta markazlashgan card.
 * Pastki MobileNav ko'rinib turgan bo'lsa, uning balandligi o'lchanadi va
 * sahifa shu joyni bo'sh qoldiradi (--bk-nav-space), shuning uchun card
 * navbar ostida qolib ketmaydi.
 */
export default function AuthShell({ wide = false, children }) {
  const rootRef = useRef(null);

  useLayoutEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    let frame = 0;
    let observer = null;

    const measure = () => {
      const nav = document.querySelector(".bottom-nav");
      let space = 0;

      if (nav && getComputedStyle(nav).display !== "none") {
        const rect = nav.getBoundingClientRect();
        if (rect.height > 0) {
          // +8px: navbar bilan card orasidagi nafas
          space = Math.max(0, Math.round(window.innerHeight - rect.top + 8));
        }
      }

      root.style.setProperty("--bk-nav-space", `${space}px`);
    };

    measure();
    // MobileNav shu commitda mount bo'lishi mumkin: bir kadrdan keyin qayta o'lchaymiz
    frame = requestAnimationFrame(measure);

    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    const nav = document.querySelector(".bottom-nav");
    if (nav && typeof ResizeObserver !== "undefined") {
      observer = new ResizeObserver(measure);
      observer.observe(nav);
    }

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
      observer?.disconnect();
    };
  }, []);


return (
  <main className="bk-auth" ref={rootRef}>
    <div className={`bk-card ${wide ? "bk-card--wide" : ""}`}>
      <div className="bk-auth-top">
        <Link
          to="/"
          className="bk-logo"
          aria-label={translateText("BakeU, на главную")}
        >
          <img
            className="bk-logo-image"
            src="/bakeu-logo.png"
            alt="BakeU"
          />
        </Link>
        <LanguageSwitcher />
      </div>
      {children}
    </div>
  </main>
);

}
