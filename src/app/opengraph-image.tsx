import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { OG_IMAGE, SITE_NAME } from "@/lib/site";

/**
 * Социальная карточка AEVIX.
 *
 * Рисуется средствами Next (`next/og`), а не лежит картинкой: тогда знак, палитра и подпись
 * берутся из того же визуального языка, что и продукт, и не расходятся с ним при первой же
 * правке темы. Отдельной зависимости это не стоит — `next/og` входит во фреймворк.
 *
 * 1200×630 — размер, который читают Telegram, WhatsApp, Discord, LinkedIn и X. В ленте карточка
 * показывается шириной в пару сотен пикселей, поэтому здесь ровно три вещи: знак, имя и одна
 * строка о продукте. Ни метрик, ни логотипов клиентов, ни отзывов — подтвердить их нечем.
 *
 * ШРИФТ ЛЕЖИТ РЯДОМ, А НЕ СКАЧИВАЕТСЯ. `next/og` несёт с собой только латиницу, а для остальных
 * письменностей ходит за шрифтом в Google Fonts прямо во время отрисовки. Отказ этого запроса не
 * ломает сборку: картинка выходит успешно, PNG нужного размера отдаётся, тесты зелены — но вся
 * русская фраза на ней превращается в пустые квадраты. И это запекается навсегда: маршрут
 * пре-рендерится статически, так что одна неудачная сборка раздаёт сломанную карточку всему
 * деплою, и увидит это первым тот, кому переслали ссылку. Поймано на живой сборке, где запрос к
 * fonts.googleapis.com отвалился по таймауту.
 */
// Подпись и размер приходят из общего описания карточки (`OG_IMAGE`): на них же ссылаются
// метаданные страниц, и разойтись «нарисовано одно, объявлено другое» им теперь негде.
export const alt = OG_IMAGE.alt;
export const size = { width: OG_IMAGE.width, height: OG_IMAGE.height };
export const contentType = "image/png";

// Тёмная поверхность входного экрана: чёрно-коричневый фон, фарфоровый текст, фиолетовый акцент.
const INK = "#090807";
const PORCELAIN = "#fffaf2";
const VIOLET = "#7a5cff";

export default async function OpengraphImage() {
  // Чтение с диска, а не `fetch(new URL(..., import.meta.url))`: второе Next превращает в
  // относительный `/_next/static/media/...`, и на статическом пре-рендере такой адрес не
  // разбирается — сборка падает с «Failed to parse URL». Маршрут пре-рендерится, поэтому чтение
  // происходит один раз при сборке, в корне проекта.
  const [regular, bold] = await Promise.all([
    readFile(join(process.cwd(), "assets/manrope-regular.ttf")),
    readFile(join(process.cwd(), "assets/manrope-bold.ttf")),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: INK,
          padding: "80px 88px",
          fontFamily: "Manrope",
        }}
      >
        {/* Мягкое свечение акцента — тот же приём, что у атмосферы продукта. Оно уводит взгляд
            в левый верх, где начинается имя, и не мешает тексту: слой лежит ПОД содержимым. */}
        <div
          style={{
            position: "absolute",
            top: -260,
            right: -200,
            width: 760,
            height: 760,
            borderRadius: "50%",
            background: `radial-gradient(circle, rgba(122,92,255,0.42) 0%, rgba(122,92,255,0) 68%)`,
          }}
        />

        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 96,
              height: 96,
              borderRadius: 26,
              background: PORCELAIN,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: INK,
              fontSize: 52,
              fontWeight: 700,
              letterSpacing: -2,
            }}
          >
            AX
          </div>
          <div
            style={{
              display: "flex",
              fontSize: 84,
              fontWeight: 700,
              color: PORCELAIN,
              letterSpacing: 6,
            }}
          >
            {SITE_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
          <div
            style={{
              display: "flex",
              fontSize: 58,
              lineHeight: 1.15,
              color: PORCELAIN,
              maxWidth: 900,
            }}
          >
            Разбор, сайт, процессы и стоимость — в одном рабочем пространстве.
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
            <div style={{ display: "flex", width: 64, height: 5, borderRadius: 3, background: VIOLET }} />
            <div style={{ display: "flex", fontSize: 30, color: "rgba(255,250,242,0.62)" }}>
              aevix.org
            </div>
          </div>
        </div>
      </div>
    ),
    {
      ...size,
      // Оба начертания объявлены явно: 700 у знака и имени, 400 у фразы. Без bold Satori не
      // «сделает жирнее» сам, а возьмёт обычный — имя продукта потеряет вес.
      fonts: [
        { name: "Manrope", data: regular, weight: 400 as const, style: "normal" as const },
        { name: "Manrope", data: bold, weight: 700 as const, style: "normal" as const },
      ],
    },
  );
}
