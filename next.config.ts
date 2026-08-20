import type { NextConfig } from "next";

/**
 * Заголовки безопасности для всех ответов.
 *
 * Здесь намеренно нет полного Content-Security-Policy со `script-src`/`style-src`: сайт держит
 * стили инлайном (CSS-переменные в `style`, framer-motion) и инлайновый JSON-LD, а строгий CSP
 * их бы отбил и сломал вид. Такой CSP делается отдельно и с nonce, под тесты каждой страницы.
 *
 * Взято только то, что закрывает дыру и не может повлиять на отрисовку: запрет встраивания в
 * чужой iframe (clickjacking), запрет MIME-sniffing, скупой Referer наружу, отключение датчиков,
 * которыми сайт не пользуется, и HSTS на проде. `frame-ancestors` дублирует X-Frame-Options в
 * современной форме и на рендеринг не влияет — он про то, кто может встроить страницу, а не про
 * то, что она грузит.
 */
const securityHeaders = [
  { key: "Content-Security-Policy", value: "frame-ancestors 'self'" },
  { key: "X-Frame-Options", value: "SAMEORIGIN" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=(), interest-cohort=()" },
  // HSTS имеет смысл только по HTTPS; на localhost (http) браузер его игнорирует, но слать его
  // туда незачем — форсим только на проде.
  ...(process.env.NODE_ENV === "production"
    ? [{ key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" }]
    : []),
];

const nextConfig: NextConfig = {
  typedRoutes: true,
  // Не раскрывать `X-Powered-By: Next.js`: версия фреймворка — это подсказка атакующему, какие
  // уязвимости пробовать, и никакой пользы посетителю она не несёт.
  poweredByHeader: false,
  experimental: {
    optimizePackageImports: ["lucide-react", "framer-motion"],
  },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
