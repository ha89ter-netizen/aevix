import type { Metadata } from "next";
import { EntryScreen } from "@/components/entry/entry-screen";

/**
 * Публичный входной экран — часть 1 публичного слоя и первое, что видит человек.
 *
 * Содержание живёт на `/platform`, поэтому описание здесь короткое и ведёт туда же: страница
 * существует ради первого впечатления, а не ради текста.
 */
export const metadata: Metadata = {
  title: "AEVIX — операционная система для бизнеса",
  description:
    "AEVIX собирает разбор, сайт, процессы и стоимость в одно рабочее пространство и держит их согласованными, пока бизнес растёт.",
  alternates: { canonical: "/" },
};

export default function Home() {
  return <EntryScreen />;
}
