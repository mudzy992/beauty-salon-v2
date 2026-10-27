import assert from "node:assert/strict";
import test from "node:test";
import {
  buildBrandColorVariables,
  isSupportedHexColor,
} from "./brand-colors.mjs";

function luminance(hex) {
  const channels = [1, 3, 5].map((offset) => {
    const value = Number.parseInt(hex.slice(offset, offset + 2), 16) / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(first, second) {
  const [high, low] = [luminance(first), luminance(second)].sort(
    (a, b) => b - a,
  );
  return (high + 0.05) / (low + 0.05);
}

test("derives light/dark text and focus-ring colors for default brand values", () => {
  const variables = buildBrandColorVariables("#632238", "#D4A843");

  for (const name of ["primary", "accent"]) {
    assert.ok(
      contrastRatio(variables[`--brand-${name}-text-light`], "#FFFFFF") >= 4.5,
    );
    assert.ok(
      contrastRatio(variables[`--brand-${name}-text-dark`], "#334155") >= 4.5,
    );
    assert.ok(contrastRatio(variables[`--brand-${name}-ring`], "#FFFFFF") >= 3);
    assert.ok(contrastRatio(variables[`--brand-${name}-ring`], "#334155") >= 3);
  }
});

test("derives accessible variants for very light, dark, and saturated custom colors", () => {
  for (const color of ["#FFFFFF", "#000000", "#FFF3A0", "#FF00FF", "#146C94"]) {
    const variables = buildBrandColorVariables(color, color);
    for (const name of ["primary", "accent"]) {
      assert.ok(
        contrastRatio(variables[`--brand-${name}-text-light`], "#FFFFFF") >=
          4.5,
      );
      assert.ok(
        contrastRatio(variables[`--brand-${name}-text-dark`], "#334155") >= 4.5,
      );
      assert.ok(
        contrastRatio(variables[`--brand-${name}-ring`], "#FFFFFF") >= 3,
      );
      assert.ok(
        contrastRatio(variables[`--brand-${name}-ring`], "#334155") >= 3,
      );
    }
  }
});

test("normalizes short hexadecimal values and falls back safely for invalid settings", () => {
  const variables = buildBrandColorVariables(" #abc ", "not-a-color");

  assert.equal(isSupportedHexColor(" #AbC "), true);
  assert.equal(isSupportedHexColor("#AABBCC"), true);
  assert.equal(isSupportedHexColor("hsl(45 60% 40%)"), false);
  assert.equal(isSupportedHexColor(""), false);
  assert.equal(variables["--brand-primary"], "#AABBCC");
  assert.equal(variables["--brand-accent"], "#D4A843");
  assert.ok(
    contrastRatio(variables["--brand-primary-text-light"], "#FFFFFF") >= 4.5,
  );
  assert.ok(
    contrastRatio(variables["--brand-primary-text-dark"], "#334155") >= 4.5,
  );
});
