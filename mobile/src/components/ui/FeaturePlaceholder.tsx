import type { ReactNode } from "react";
type FeaturePlaceholderProps = { title: string; children?: ReactNode };
export function FeaturePlaceholder({
  title,
  children,
}: FeaturePlaceholderProps) {
  return (
    <section className="page-placeholder">
      <span className="project-label">BAKEU MOBILE · КАРКАС</span>
      <h1>{title}</h1>
      <p>Структура раздела готова. Функции подключим на следующем этапе.</p>
      {children}
    </section>
  );
}
