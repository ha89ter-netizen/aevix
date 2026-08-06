"use client";

import { useEffect } from "react";

/**
 * Блокировка прокрутки страницы, пока открыт слой поверх неё.
 *
 * `overflow: hidden` здесь недостаточно по двум причинам сразу. На лендинге прокруткой правит
 * Lenis и двигает окно программно, а Safari на iOS просто игнорирует `overflow` на html и body
 * как способ запретить прокрутку — это ловил тест на мобильном WebKit.
 *
 * Работает единственный надёжный приём: увести body в `position: fixed`, сдвинув его вверх на
 * текущую прокрутку. Тогда страница физически не может уехать, а картинка не прыгает. При
 * закрытии позиция восстанавливается ровно там, где была.
 *
 * Хук общий, потому что приём тонкий и добыт дорого: вторая его копия неизбежно разошлась бы с
 * первой. Пользуются им и выдвижная панель Workspace, и примитив диалога.
 */
export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;

    const root = document.documentElement;
    const body = document.body;
    const offset = window.scrollY;
    const previous = {
      rootOverflow: root.style.overflow,
      position: body.style.position,
      top: body.style.top,
      left: body.style.left,
      right: body.style.right,
      width: body.style.width,
    };

    root.style.overflow = "hidden";
    body.style.position = "fixed";
    body.style.top = `-${offset}px`;
    body.style.left = "0";
    body.style.right = "0";
    body.style.width = "100%";

    return () => {
      root.style.overflow = previous.rootOverflow;
      body.style.position = previous.position;
      body.style.top = previous.top;
      body.style.left = previous.left;
      body.style.right = previous.right;
      body.style.width = previous.width;
      // Без этого страница отскочила бы наверх: пока body был fixed, окно стояло на нуле.
      window.scrollTo(0, offset);
    };
  }, [active]);
}
