import { ImageResponse } from "next/og";

/**
 * Иконка для «на экран Домой» в iOS.
 *
 * PNG, а не тот же `icon.svg`: Safari апл-иконку в SVG не берёт и без этого файла рисует на
 * плитке уменьшенный скриншот страницы. Рисуется через `next/og` из того же знака, чтобы не
 * заводить второй бинарный ассет, который придётся править вручную вслед за брендом.
 *
 * 180×180 — размер, который iOS запрашивает для современных экранов.
 */
export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#090807",
          color: "#fffaf2",
          fontSize: 92,
          fontWeight: 700,
          letterSpacing: -4,
        }}
      >
        AX
      </div>
    ),
    size,
  );
}
