import { Link } from "react-router-dom";
import { ChefHat } from "lucide-react";

/** Login va Register uchun umumiy maket: fonda bitta markazlashgan card. */
export default function AuthShell({ wide = false, children }) {
  return (
    <main className="bk-auth">
      <div className={`bk-card ${wide ? "bk-card--wide" : ""}`}>
        <Link to="/" className="bk-logo" aria-label="BakeU, на главную">
          <span className="bk-logo__mark">
            <ChefHat size={20} />
          </span>
          Bake<span>U</span>
        </Link>
        {children}
      </div>
    </main>
  );
}