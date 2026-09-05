import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { LegalPage } from "@/components/legal-page";
import { PRIVACY_SECTIONS, PRIVACY_UPDATED } from "@/lib/legal";

/**
 * Политика конфиденциальности по собственному адресу.
 *
 * Раньше документ открывался модальным окном из подвала: переслать на него ссылку было нельзя,
 * «назад» уводило со всей страницы, а форма заявки не могла сослаться на него до отправки данных.
 */
export const metadata: Metadata = pageMetadata({
  title: "Политика конфиденциальности",
  description:
    "Какие данные AEVIX получает от вас, куда они попадают, сколько хранятся и как запросить удаление.",
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Политика конфиденциальности"
      updated={PRIVACY_UPDATED}
      sections={PRIVACY_SECTIONS}
    />
  );
}
