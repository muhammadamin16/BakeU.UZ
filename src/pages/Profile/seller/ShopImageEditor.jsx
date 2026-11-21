import { useRef, useState } from "react";
import { Camera, Check, Move, RotateCcw, ZoomIn } from "lucide-react";
import { translateText } from "../../../i18n/index.js";
import "./ShopImageEditor.css";

const formats = ["image/jpeg", "image/png", "image/webp"];
const clamp = (v, min, max) => Math.min(max, Math.max(min, v));

export default function ShopImageEditor({ value, onChange, onError, type = "banner" }) {
  const fileRef = useRef(null);
  const [source, setSource] = useState("");
  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [busy, setBusy] = useState(false);
  const dragging = useRef(null);
  const isLogo = type === "logo";
  const width = isLogo ? 480 : 1200;
  const height = isLogo ? 480 : 480;

  async function pick(event) {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!formats.includes(file.type) || file.size > 8 * 1024 * 1024) {
      onError?.("Выберите JPG, PNG или WebP не больше 8 МБ.");
      return;
    }
    const url = URL.createObjectURL(file);
    try {
      const img = new Image();
      img.src = url;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = isLogo ? 960 : 1800;
      canvas.height = isLogo ? 960 : 720;
      const ctx = canvas.getContext("2d");
      const scale = Math.max(canvas.width / img.width, canvas.height / img.height);
      ctx.drawImage(img, (canvas.width - img.width * scale) / 2, (canvas.height - img.height * scale) / 2, img.width * scale, img.height * scale);
      setSource(canvas.toDataURL("image/jpeg", 0.84));
      setOffset({ x: 0, y: 0 });
      setZoom(1);
      onError?.("");
    } catch {
      onError?.("Не удалось прочитать изображение.");
    } finally {
      URL.revokeObjectURL(url);
    }
  }

  async function apply() {
    if (!source) return;
    setBusy(true);
    try {
      const img = new Image();
      img.src = source;
      await img.decode();
      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      const scale = Math.max(width / img.width, height / img.height) * zoom;
      const drawnW = img.width * scale;
      const drawnH = img.height * scale;
      ctx.drawImage(img, (width - drawnW) / 2 + offset.x * width / 100, (height - drawnH) / 2 + offset.y * height / 100, drawnW, drawnH);
      onChange(canvas.toDataURL("image/jpeg", 0.78));
      setSource("");
      onError?.("Фото готово. Нажмите «Сохранить изменения», чтобы сохранить магазин.");
    } catch {
      onError?.("Не удалось обработать фотографию.");
    } finally {
      setBusy(false);
    }
  }

  function down(event) {
    if (!source) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    dragging.current = { x: event.clientX, y: event.clientY, ox: offset.x, oy: offset.y, width: event.currentTarget.clientWidth, height: event.currentTarget.clientHeight };
  }
  function move(event) {
    if (!dragging.current) return;
    const p = dragging.current;
    setOffset({ x: clamp(p.ox + (event.clientX - p.x) / p.width * 100, -90, 90), y: clamp(p.oy + (event.clientY - p.y) / p.height * 100, -90, 90) });
  }
  const preview = source || value;
  return (
    <div className="bsi-editor">
      <div className={"bsi-stage " + (isLogo ? "bsi-logo" : "")}
        onPointerDown={down} onPointerMove={move}
        onPointerUp={() => { dragging.current = null; }}
        onPointerCancel={() => { dragging.current = null; }}>
        {preview ? <img draggable="false" src={preview} alt={translateText(isLogo ? "Логотип магазина" : "Обложка магазина")}
          style={source ? { transform: `translate(${offset.x}%, ${offset.y}%) scale(${zoom})` } : undefined} /> :
          <div className="bsi-empty"><Camera size={27} /><span>{translateText(isLogo ? "Добавьте логотип" : "Добавьте обложку")}</span></div>}
        {source && <span className="bsi-hint"><Move size={14} /> {translateText("Перетащите изображение")}</span>}
      </div>
      <input ref={fileRef} className="bsi-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={pick} aria-label={translateText("Выбрать изображение")} />
      <div className="bsi-actions">
        <button type="button" className="bw-btn" onClick={() => fileRef.current?.click()}><Camera size={16}/>{translateText(preview ? "Заменить фото" : "Добавить фото")}</button>
        {source && <>
          <label className="bsi-zoom"><ZoomIn size={16}/><input aria-label={translateText("Масштаб")} type="range" min="1" max="2.5" step="0.05" value={zoom} onChange={(e) => setZoom(Number(e.target.value))} /></label>
          <button type="button" className="bw-btn" onClick={() => { setZoom(1); setOffset({x:0,y:0}); }}><RotateCcw size={15}/>{translateText("Сброс")}</button>
          <button type="button" className="bw-btn primary" disabled={busy} onClick={apply}><Check size={16}/>{translateText("Применить")}</button>
        </>}
        {value && !source && <button type="button" className="bw-btn" onClick={() => onChange("")}>{translateText("Удалить фото")}</button>}
      </div>
    </div>
  );
}
