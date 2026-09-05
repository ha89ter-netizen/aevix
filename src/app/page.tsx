import type { Metadata } from "next";
import { SITE_DESCRIPTION, SITE_TITLE, pageMetadata } from "@/lib/site";
import { EntryScreen } from "@/components/entry/entry-screen";

/**
 * Публичный входной экран — часть 1 публичного слоя и первое, что видит человек.
 *
 * Содержание живёт на `/platform`, поэтому описание здесь короткое и ведёт туда же: страница
 * существует ради первого впечатления, а не ради текста.
 */
export const metadata: Metadata = pageMetadata({
  // Заголовок и описание входного экрана — они же значения по умолчанию для всего продукта:
  // это его главная страница, и вторая формулировка того же самого только разошлась бы с первой.
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  path: "/",
  titleIsWhole: true,
});

export default function Home() {
  return <EntryScreen />;
}
