import type { Metadata } from "next";
import { pageMetadata } from "@/lib/site";
import { LegalPage } from "@/components/legal-page";
import { TERMS_SECTIONS, TERMS_UPDATED } from "@/lib/legal";

/** Условия использования по собственному адресу — по той же причине, что и политика. */
export const metadata: Metadata = pageMetadata({
  title: "Условия использования",
  description:
    "Что такое AEVIX, почему расчёт стоимости — оценка, а не оферта, и что означает демонстрационный концепт сайта.",
  path: "/terms",
});

export default function TermsPage() {
  return (
    <LegalPage title="Условия использования" updated={TERMS_UPDATED} sections={TERMS_SECTIONS} />
  );
}
