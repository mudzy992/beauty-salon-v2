import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import i18next from "i18next";
import {
  formatLocalizedAmount,
  formatLocalizedNumber,
} from "../../i18n/locale-utils.mjs";
import { formatDateOnlyLocale } from "../../../../shared/business-date.mjs";

const locales = ["bs", "en"].map((language) =>
  JSON.parse(
    readFileSync(
      new URL("../../i18n/locales/" + language + ".json", import.meta.url),
      "utf8",
    ),
  ),
);
const files = [
  "entry-form-dialog.tsx",
  "entry-form-fields.tsx",
  "pricing-panel.tsx",
  "use-daily-log-form.ts",
  "form-helpers.ts",
];
const sources = Object.fromEntries(
  files.map((file) => [
    file,
    readFileSync(new URL("./" + file, import.meta.url), "utf8"),
  ]),
);
const keyReferences = new Set(
  [
    ...Object.values(sources)
      .join("\n")
      .matchAll(/['"](dailyLog(?:\.[\w]+)+)['"]/g),
  ].map(([, key]) => key),
);
const leafPaths = (value, prefix) =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === "object" && child !== null
      ? leafPaths(child, `${prefix}.${key}`)
      : [`${prefix}.${key}`],
  );
const getPath = (resource, key) =>
  key.split(".").reduce((value, part) => value?.[part], resource);
const createI18n = async () => {
  const instance = i18next.createInstance();
  await instance.init({
    lng: "bs",
    fallbackLng: false,
    resources: {
      bs: { translation: locales[0] },
      en: { translation: locales[1] },
    },
    interpolation: { escapeValue: false },
  });
  return instance;
};

test("Daily Log form keys referenced by the form and save hook match in BS and EN", () => {
  const [bosnian, english] = locales.map((locale) =>
    leafPaths(locale.dailyLog.form, "dailyLog.form").sort(),
  );
  assert.deepEqual(bosnian, english);

  for (const locale of locales) {
    for (const key of keyReferences) {
      assert.notEqual(
        getPath(locale, key),
        undefined,
        `Missing locale key: ${key}`,
      );
    }
  }
});

test("form, debt, loyalty and save feedback copy follow the selected language", async () => {
  const instance = await createI18n();
  assert.equal(instance.t("dailyLog.form.chooseStylist"), "Odaberite stilistu");
  assert.equal(
    instance.t("dailyLog.form.searchClient"),
    "Pretražite klijenta...",
  );
  assert.equal(
    instance.t("dailyLog.form.validation.paidAmountInvalid"),
    "Unesite ispravan iznos naplaćenog računa.",
  );
  assert.equal(instance.t("dailyLog.form.feedback.saved"), "Sačuvano.");

  await instance.changeLanguage("en");
  assert.equal(instance.t("dailyLog.form.chooseStylist"), "Choose a stylist");
  assert.equal(instance.t("dailyLog.form.searchClient"), "Search clients...");
  assert.equal(
    instance.t("dailyLog.form.validation.paidAmountInvalid"),
    "Enter a valid amount paid.",
  );
  assert.equal(instance.t("dailyLog.form.feedback.saved"), "Saved.");
  assert.equal(formatLocalizedAmount(1234.5, "bs"), "1.234,50 KM");
  assert.equal(formatLocalizedAmount(1234.5, "en"), "1,234.50 KM");
  assert.equal(formatLocalizedNumber(1200, "bs"), "1.200");
  assert.equal(formatLocalizedNumber(1200, "en"), "1,200");

  const bosnianDate = formatDateOnlyLocale("2024-01-02", "bs-BA", {
    dateStyle: "medium",
  });
  const englishDate = formatDateOnlyLocale("2024-01-02", "en-GB", {
    dateStyle: "medium",
  });
  assert.notEqual(bosnianDate, englishDate);
  assert.match(
    sources["pricing-panel.tsx"],
    /formatDateOnlyLocale\(dateOnly, getIntlLocale\(language\)/,
  );
});

test("form validation guards, calculations, mutation endpoints and payloads remain unchanged", () => {
  const saveHook = sources["use-daily-log-form.ts"];
  const helpers = sources["form-helpers.ts"];
  const fields = sources["entry-form-fields.tsx"];
  const pricing = sources["pricing-panel.tsx"];
  const dialog = sources["entry-form-dialog.tsx"];

  assert.match(
    saveHook,
    /if \(!form\.stylistProfileId \|\| form\.serviceIds\.length === 0\)/,
  );
  assert.match(
    saveHook,
    /if \(!Number\.isFinite\(paidRaw\) \|\| paidRaw < 0\)/,
  );
  assert.match(
    saveHook,
    /if \(settleDebtsEnabled && settledDebtIds\.length > 0 && paidRaw < charge\.debtsSum\)/,
  );
  assert.match(
    saveHook,
    /if \(shortfall > 0 && createDebt && !form\.clientId\)/,
  );
  assert.ok(saveHook.includes("await api.patch(`/api/daily-log/${editId}`, {"));
  assert.ok(saveHook.includes("await api.post('/api/daily-log', {"));
  assert.match(saveHook, /status: form\.status/);
  assert.match(
    saveHook,
    /debtHandling: shortfall > 0 && createDebt \? 'CREATE_DEBT' : 'IGNORE_DEBT'/,
  );
  assert.match(
    saveHook,
    /settledDebtIds:[\s\S]*settleDebtsEnabled && settledDebtIds\.length > 0 \? settledDebtIds : undefined/,
  );
  assert.match(saveHook, /date: form\.date/);

  assert.match(helpers, /date: getSalonDateOnly\(\)/);
  assert.match(
    helpers,
    /status: entry\.status === 'COMPLETED' \? 'COMPLETED' : 'PENDING'/,
  );
  assert.match(helpers, /computeChargeAmount/);
  assert.match(helpers, /buildItemsPayload/);
  assert.match(helpers, /Number\(paidAmount\.replace\(',', '\.'\)\)/);
  assert.match(fields, /editId \? \(/);
  assert.match(fields, /form\.status === 'PENDING'/);
  assert.match(fields, /formatLocalizedAmount\(svc\.price, i18n\.language\)/);
  assert.match(
    pricing,
    /formatLocalizedAmount\(chargeAmount, i18n\.language\)/,
  );
  assert.match(
    pricing,
    /placeholder=\{chargeAmount > 0 \? chargeAmount\.toFixed\(2\) : '0\.00'\}/,
  );
  assert.match(
    dialog,
    /editId \? t\('dailyLog\.editEntry'\) : t\('dailyLog\.newEntry'\)/,
  );
});
