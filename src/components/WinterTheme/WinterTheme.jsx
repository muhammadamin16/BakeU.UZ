import { useEffect } from "react";
import "./WinterTheme.css";

const flakes = Array.from({ length: 18 }, (_, index) => ({
  left: `${(index * 37 + 9) % 100}%`,
  duration: `${18 + (index % 5) * 3}s`,
  delay: `${-index * 2.7}s`,
  size: `${9 + (index % 4) * 4}px`,
}));

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

  return (
    <>
      <div className="winter-backdrop" aria-hidden="true" />

      <div className="winter-snowfall" aria-hidden="true">
        {flakes.map((flake, index) => (
          <span
            key={index}
            style={{
              left: flake.left,
              fontSize: flake.size,
              animationDuration: flake.duration,
              animationDelay: flake.delay,
            }}
          >
            ❄
          </span>
        ))}
      </div>
    </>
  );
}