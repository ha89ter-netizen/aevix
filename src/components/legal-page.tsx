import Link from "next/link";
import type { LegalSection } from "@/lib/legal";

/**
 * Разметка правового документа — одна на политику и на условия.
 *
 * Страница намеренно узкая и без иллюстраций: её читают, а не разглядывают. Общая шапка,
 * боковая навигация и подвал приходят от оболочки продукта, поэтому документ выглядит частью
 * AEVIX, а не отдельным файлом, выложенным рядом.
 */
export function LegalPage({
  title,
  updated,
  sections,
}: {
  title: string;
  updated: string;
  sections: LegalSection[];
}) {
  return (
    <main className="legal-page">
      <article className="legal-page-inner">
        <header className="legal-page-head">
          <h1>{title}</h1>
          <p className="legal-page-updated">Обновлено: {updated}</p>
        </header>
        <div className="legal-page-body">
          {sections.map((section) => (
            <section key={section.title}>
              <h2>{section.title}</h2>
              {section.body}
            </section>
          ))}
        </div>
        <footer className="legal-page-foot">
          <Link href="/platform">← Вернуться на сайт AEVIX</Link>
        </footer>
      </article>
    </main>
  );
}
