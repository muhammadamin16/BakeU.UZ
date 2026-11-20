import { useEffect } from "react";
import "./WinterTheme.css";

// Deterministic particles: stable positions between renders and route changes.
const FLAKES = Array.from({ length: 52 }, (_, index) => {
  const random = (seed) => {
    const value = Math.sin(seed * 127.1 + 78.233) * 43758.5453;
    return value - Math.floor(value);
  };
  return {
    id: index,
    style: {
      "--snow-x": `${(random(index + 1) * 100).toFixed(2)}%`,
      "--snow-size": `${(10 + random(index + 101) * 10).toFixed(1)}px`,
      "--snow-opacity": (0.30 + random(index + 201) * 0.32).toFixed(2),
      "--snow-duration": `${(12 + random(index + 301) * 14).toFixed(1)}s`,
      "--snow-delay": `${(-random(index + 401) * 27).toFixed(1)}s`,
      "--snow-rotation": `${Math.round(90 + random(index + 601) * 360)}deg`,
      "--snow-drift": `${(-45 + random(index + 501) * 90).toFixed(1)}px`,
    },
  };
});

export default function WinterTheme() {
  useEffect(() => {
    const root = document.documentElement;
    const previous = root.dataset.season;
    root.dataset.season = "winter";

    return () => {
      if (previous === undefined) delete root.dataset.season;
      else root.dataset.season = previous;
    };
  }, []);

  return (
    <div className="bakeu-snowfall" aria-hidden="true">
      {FLAKES.map(({ id, style }) => (
        <span key={id} className="bakeu-snowfall__flake" style={style}>
          {id % 4 === 0 ? "❅" : "❄"}
        </span>
      ))}
    </div>
  );
}
