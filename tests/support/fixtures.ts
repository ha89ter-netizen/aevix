import { test as base, expect, type Page, type Route } from "@playwright/test";
import { buildFallbackWebsiteConcept, type WebsiteConceptInput } from "../../src/lib/website-concept";

/**
 * The main suite talks to a stubbed OpenAI, always.
 *
 * The suite was written while no key existed, so it has only ever exercised the application's
 * local path. The day a key landed in `.env.local` the same specs started driving two real
 * network round-trips per created project and timed out — the product was fine, the suite was
 * simply measuring someone else's service. This fixture removes that dependency: every test
 * runs against the AI routes' own "no key configured" responses, whether or not a key is set.
 *
 * The stub replies exactly what each route replies without a key — not an invented AI answer.
 * That distinction is the point. `business-knowledge.ts` and `buildFallbackWebsiteConcept` are
 * what the content specs actually assert on; handing them a canned concept instead would leave
 * those tests validating this file, which is the "test that cannot fail" this project has paid
 * for once already.
 *
 * The live routes are deliberately NOT covered here. They need their own small suite, run
 * against a real key on purpose rather than by accident.
 *
 * Per-test overrides keep working: Playwright matches handlers in reverse registration order,
 * and these are installed before the test body runs, so a spec's own `page.route` wins.
 */

/** Verbatim from src/app/api/business-analysis/route.ts, the `!apiKey` branch. */
const ANALYSIS_UNAVAILABLE = "AI-консультант временно недоступен. Серверный ключ OpenAI еще не настроен.";
/** Verbatim from src/app/api/website-concept/route.ts, the `!apiKey` branch. */
const CONCEPT_NOTICE = "OpenAI временно недоступен. Показан локальный концепт AEVIX.";

function fulfillJson(route: Route, status: number, body: unknown) {
  return route.fulfill({ status, contentType: "application/json", body: JSON.stringify(body) });
}

export async function stubOpenAi(page: Page) {
  // 503 with no `result`: the generation pipeline and the hero both fall back to their local
  // analysis, which is the behaviour every existing expectation was written against.
  await page.route("**/api/business-analysis", (route) =>
    fulfillJson(route, 503, { error: ANALYSIS_UNAVAILABLE }),
  );

  // The concept route answers 200 with a locally built concept rather than an error, so the
  // stub builds it the same way the server would — same function, same input, same output.
  await page.route("**/api/website-concept", (route) => {
    let input: WebsiteConceptInput | null = null;
    try {
      input = route.request().postDataJSON() as WebsiteConceptInput;
    } catch {
      input = null;
    }
    // Unparseable body: answer like a failed request. Both callers then build the very same
    // fallback concept client-side, so the rendered result is unchanged either way.
    if (!input) return fulfillJson(route, 502, { error: "Не удалось собрать концепт." });
    return fulfillJson(route, 200, {
      concept: buildFallbackWebsiteConcept(input),
      source: "fallback",
      notice: CONCEPT_NOTICE,
    });
  });

  // Verbatim from src/app/api/designer-intent/route.ts: a null intent sends the AI Designer
  // back to its local matcher, which is where the interesting logic lives anyway.
  await page.route("**/api/designer-intent", (route) =>
    fulfillJson(route, 200, { intent: null, source: "unavailable" }),
  );
}

/**
 * Specs import `test` from here instead of `@playwright/test`; the stub is then installed for
 * every test without each one having to remember, including specs written later.
 */
export const test = base.extend({
  page: async ({ page }, use) => {
    await stubOpenAi(page);
    // Playwright's fixture callback, not a React hook — the rule matches on the name alone.
    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(page);
  },
});

export { expect };
export type { Page, Route };
