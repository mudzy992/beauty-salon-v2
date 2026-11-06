import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = readFileSync(
  new URL("../../pages/Notifications.tsx", import.meta.url),
  "utf8",
);
const unsubscribeSource = readFileSync(
  new URL("../../pages/public/CampaignUnsubscribe.tsx", import.meta.url),
  "utf8",
);
const routesSource = readFileSync(
  new URL("../../app/routes/public.routes.tsx", import.meta.url),
  "utf8",
);
const locales = ["bs", "en"].map((language) =>
  JSON.parse(
    readFileSync(
      new URL("../../i18n/locales/" + language + ".json", import.meta.url),
      "utf8",
    ),
  ),
);

test("campaign consent is loaded and updated through its independent endpoint", () => {
  assert.match(
    source,
    /api\s*\.get<CampaignEmailConsent>\('\/api\/notifications\/campaigns\/consent'\)/,
  );
  assert.match(
    source,
    /api\.put<CampaignEmailConsent>\(\s*'\/api\/notifications\/campaigns\/consent',\s*\{ optedIn \}/,
  );
  assert.match(
    source,
    /aria-label=\{t\('notifications\.campaignConsent\.optIn'\)\}/,
  );
  assert.match(
    source,
    /disabled=\{savingCampaignConsent \|\| !campaignConsent\}/,
  );
  assert.doesNotMatch(
    source,
    /savePreference\([^)]*campaign|emailEnabled[^\n]*campaignConsent/,
  );
});

test("campaign consent prompts and failure feedback are localized in both languages", () => {
  for (const resource of locales) {
    for (const key of [
      "title",
      "description",
      "optIn",
      "enabled",
      "disabled",
      "saved",
      "loadFailed",
      "saveFailed",
      "retryLoad",
    ]) {
      assert.ok(
        resource.notifications.campaignConsent[key],
        `Missing campaign consent copy: ${key}`,
      );
    }
    for (const key of [
      "title",
      "description",
      "confirm",
      "submitting",
      "successTitle",
      "successDescription",
      "invalidTitle",
      "invalidDescription",
      "failureTitle",
      "failureDescription",
      "retry",
      "home",
    ]) {
      assert.ok(
        resource.campaignUnsubscribe[key],
        `Missing unsubscribe copy: ${key}`,
      );
    }
  }
});

test("email unsubscribe requires an explicit POST confirmation and is reachable publicly", () => {
  assert.match(unsubscribeSource, /useSearchParams\(\)/);
  assert.match(
    unsubscribeSource,
    /api\.post<unknown>\(\s*["']\/api\/notifications\/campaigns\/unsubscribe["']/,
  );
  assert.match(
    unsubscribeSource,
    /status === ["']confirm["'] \|\| status === ["']submitting["']/,
  );
  assert.match(
    routesSource,
    /path: 'unsubscribe', element: <CampaignUnsubscribe \/>/,
  );
});
