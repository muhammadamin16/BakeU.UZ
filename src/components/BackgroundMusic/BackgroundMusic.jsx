
import { useEffect, useRef, useState } from "react";
import { Disc3 } from "lucide-react";
import "./BackgroundMusic.css";

export default function BackgroundMusic() {
  const audioRef = useRef(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = 0.25;

    return () => {
      audio.pause();
    };
  }, []);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (audio.paused) {
      try {
        await audio.play();
      } catch (error) {
        console.error("Music error:", error);
      }
    } else {
      audio.pause();
    }
  };

  return (
    <div className="bakeu-music">
      <audio
        ref={audioRef}
        src="/music/christmas.mp3"
        loop
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onError={() => setPlaying(false)}
      />

      <button
        type="button"
        className={`bakeu-music-btn ${
          playing ? "active" : ""
        }`}
        onClick={toggleMusic}
        aria-label={
          playing
            ? "Выключить музыку"
            : "Включить музыку"
        }
        aria-pressed={playing}
        title={
          playing
            ? "Выключить музыку"
            : "Включить музыку"
        }
      >
        <Disc3
          className={`bakeu-disc ${
            playing ? "music-spinning" : ""
          }`}
          size={30}
          strokeWidth={2}
        />
      </button>
    </div>
  );
}
