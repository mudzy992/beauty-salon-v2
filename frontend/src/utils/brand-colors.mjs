const DEFAULT_PRIMARY = "#632238";
const DEFAULT_ACCENT = "#D4A843";
const LIGHT_SURFACE = "#FFFFFF";
const DARK_SURFACE = "#334155";
const RING_MIN_LUMINANCE = 0.27;
const RING_MAX_LUMINANCE = 0.29;

export function isSupportedHexColor(value) {
  return (
    typeof value === "string" &&
    /^#(?:[\da-f]{3}|[\da-f]{6})$/i.test(value.trim())
  );
}

function normalizeHexColor(value, fallback) {
  if (!isSupportedHexColor(value)) return fallback;

  const raw = value.trim();
  const shortMatch = /^#([\da-f]{3})$/i.exec(raw);
  if (shortMatch) {
    return `#${shortMatch[1]
      .split("")
      .map((channel) => channel + channel)
      .join("")}`.toUpperCase();
  }

  return /^#[\da-f]{6}$/i.test(raw) ? raw.toUpperCase() : fallback;
}

function rgbFromHex(hex) {
  return [1, 3, 5].map((offset) =>
    Number.parseInt(hex.slice(offset, offset + 2), 16),
  );
}

function hexFromRgb(rgb) {
  return `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, "0")).join("")}`.toUpperCase();
}

function luminance(hex) {
  const channels = rgbFromHex(hex).map((channel) => {
    const value = channel / 255;
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

function mix(color, target, amount) {
  const colorRgb = rgbFromHex(color);
  const targetRgb = rgbFromHex(target);
  return hexFromRgb(
    colorRgb.map(
      (channel, index) => channel + (targetRgb[index] - channel) * amount,
    ),
  );
}

function ensureContrast(color, background, minimumRatio) {
  if (contrastRatio(color, background) >= minimumRatio) return color;

  const candidates = ["#000000", "#FFFFFF"].flatMap((target) => {
    if (contrastRatio(target, background) < minimumRatio) return [];

    let low = 0;
    let high = 1;
    for (let iteration = 0; iteration < 24; iteration += 1) {
      const amount = (low + high) / 2;
      if (
        contrastRatio(mix(color, target, amount), background) >= minimumRatio
      ) {
        high = amount;
      } else {
        low = amount;
      }
    }
    return [{ color: mix(color, target, high), amount: high }];
  });

  return (
    candidates.sort((first, second) => first.amount - second.amount)[0]
      ?.color ?? color
  );
}

function ensureRingContrast(color) {
  const currentLuminance = luminance(color);
  if (
    currentLuminance >= RING_MIN_LUMINANCE &&
    currentLuminance <= RING_MAX_LUMINANCE
  ) {
    return color;
  }

  const target = currentLuminance > RING_MAX_LUMINANCE ? "#000000" : "#FFFFFF";
  let low = 0;
  let high = 1;
  for (let iteration = 0; iteration < 24; iteration += 1) {
    const amount = (low + high) / 2;
    const candidate = mix(color, target, amount);
    const candidateLuminance = luminance(candidate);
    const reachedBand =
      currentLuminance > RING_MAX_LUMINANCE
        ? candidateLuminance <= RING_MAX_LUMINANCE
        : candidateLuminance >= RING_MIN_LUMINANCE;
    if (reachedBand) high = amount;
    else low = amount;
  }
  return mix(color, target, high);
}

function createBrandVariants(value, fallback) {
  const color = normalizeHexColor(value, fallback);
  return {
    color,
    textLight: ensureContrast(color, LIGHT_SURFACE, 4.5),
    textDark: ensureContrast(color, DARK_SURFACE, 4.5),
    ring: ensureRingContrast(color),
  };
}

export function buildBrandColorVariables(primarySetting, accentSetting) {
  const primary = createBrandVariants(primarySetting, DEFAULT_PRIMARY);
  const accent = createBrandVariants(accentSetting, DEFAULT_ACCENT);

  return {
    "--brand-primary": primary.color,
    "--brand-accent": accent.color,
    "--brand-primary-text-light": primary.textLight,
    "--brand-primary-text-dark": primary.textDark,
    "--brand-primary-ring": primary.ring,
    "--brand-accent-text-light": accent.textLight,
    "--brand-accent-text-dark": accent.textDark,
    "--brand-accent-ring": accent.ring,
  };
}
