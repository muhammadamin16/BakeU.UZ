import { translateText } from "../../i18n/index.js";
import { useEffect, useId, useRef, useState } from "react";
import { Disc3, LoaderCircle } from "lucide-react";
import "./BackgroundMusic.css";

const MUSIC_SOURCE = "/music/leberch-christmas-440431.mp3";
const LOAD_ERROR =
  "Не удалось загрузить музыку. Проверьте интернет и нажмите кнопку, чтобы повторить.";

export default function BackgroundMusic() {
  const audioRef = useRef(null);
  const requestRef = useRef(0);
  const pendingRef = useRef(false);
  const statusId = useId();
  const [playing, setPlaying] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const audio = audioRef.current;
    audio.volume = 0.25;
    return () => {
      requestRef.current += 1;
      pendingRef.current = false;
      audio.pause();
    };
  }, []);

  const toggleMusic = async () => {
    const audio = audioRef.current;
    if (!audio) return;
    const request = ++requestRef.current;

    // A second click also cancels a play request while the track is loading.
    if (pendingRef.current || !audio.paused) {
      pendingRef.current = false;
      audio.pause();
      setPlaying(false);
      setLoading(false);
      return;
    }

    setError("");
    setLoading(true);
    pendingRef.current = true;
    try {
      // Reload a failed source before retrying, within this user gesture.
      if (audio.error) audio.load();
      await audio.play();
    } catch (cause) {
      if (request !== requestRef.current || cause.name === "AbortError") return;
      setPlaying(false);
      setError(
        cause.name === "NotAllowedError"
          ? "Нажмите кнопку ещё раз, чтобы разрешить воспроизведение музыки."
          : LOAD_ERROR,
      );
    } finally {
      if (request === requestRef.current) {
        pendingRef.current = false;
        setLoading(false);
      }
    }
  };

  const active = playing || loading;
  const label = error
    ? "Повторить загрузку музыки"
    : active
      ? "Выключить музыку"
      : "Включить музыку";
  return (
    <div className="bakeu-music">
      <audio
        ref={audioRef}
        src={MUSIC_SOURCE}
        loop
        preload="none"
        onPlaying={() => {
          setPlaying(true);
          setLoading(false);
          setError("");
        }}
        onWaiting={() => {
          if (!audioRef.current.paused) setLoading(true);
        }}
        onPause={() => {
          setPlaying(false);
          setLoading(false);
        }}
        onError={() => {
          pendingRef.current = false;
          setPlaying(false);
          setLoading(false);
          setError(LOAD_ERROR);
        }}
      />
      <button
        type="button"
        className={`bakeu-music-btn${active ? " active" : ""}${error ? " has-error" : ""}`}
        onClick={toggleMusic}
        aria-label={translateText(label)}
        aria-pressed={active}
        aria-describedby={loading || error ? statusId : undefined}
        title={translateText(label)}
      >
        {loading ? (
          <LoaderCircle
            className="bakeu-disc music-loading"
            size={30}
            aria-hidden="true"
          />
        ) : (
          <Disc3
            className={`bakeu-disc${playing ? " music-spinning" : ""}`}
            size={30}
            strokeWidth={2}
            aria-hidden="true"
          />
        )}
        {playing && !loading && (
          <span className="bakeu-music-level" aria-hidden="true">
            <i />
            <i />
            <i />
          </span>
        )}
      </button>
      <span
        id={statusId}
        className={error ? "bakeu-music-message" : "bakeu-music-status"}
        role="status"
      >
        {translateText(error || (loading ? "Загружаем музыку…" : ""))}
      </span>
    </div>
  );
}
