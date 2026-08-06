import type { Metadata } from "next";
import { LandingExperience } from "@/components/site-experience";

/**
 * Основной сайт AEVIX — часть 2 публичного слоя.
 *
 * Сюда ведёт кнопка «Открыть сайт» со входного экрана. Здесь живёт содержание: возможности,
 * как это работает, кейсы, цены, вопросы и контакты, — и своя навигация по разделам.
 *
 * Метаданные описывают именно эту страницу: содержательная часть теперь она, а не `/`.
 */
export const metadata: Metadata = {
  title: "Возможности, цены и процесс",
  description:
    "AEVIX собирает разбор бизнеса, сайт, процессы и расчёт стоимости в одно рабочее пространство. Возможности, порядок работы, цены и ответы на вопросы.",
  alternates: { canonical: "/platform" },
};

export default function PlatformPage() {
  return <LandingExperience />;
}
