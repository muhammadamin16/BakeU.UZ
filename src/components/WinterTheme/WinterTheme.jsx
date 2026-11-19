import { useEffect } from "react";
import "./WinterTheme.css";

export default function WinterTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.season;
    root.dataset.season = "winter";

    return () => {
      if (previous === undefined) {
        delete root.dataset.season;
      } else {
        root.dataset.season = previous;
      }
    };
  }, []);

  return <div className="winter-backdrop" aria-hidden="true" />;
}
