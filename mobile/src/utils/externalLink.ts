export type ExternalLinkScheme = 'http' | 'https' | 'tel' | 'mailto' | 'maps' | 'geo';

export type OpenExternalUrl = (url: string) => Promise<void>;

export function normalizeExternalUrl(
  value: unknown,
  allowedSchemes: readonly ExternalLinkScheme[],
): string | null {
  if (typeof value !== 'string') return null;
  const candidate = value.trim();
  if (!candidate || candidate.length > 2048 || /[\u0000-\u001f\u007f]/.test(candidate)) return null;
  const match = /^([a-z][a-z\d+.-]*):/i.exec(candidate);
  const scheme = match?.[1]?.toLowerCase() as ExternalLinkScheme | undefined;
  if (!scheme || !allowedSchemes.includes(scheme)) return null;

  if (scheme === 'http' || scheme === 'https') {
    try {
      const parsed = new URL(candidate);
      if (
        parsed.protocol !== `${scheme}:` || !parsed.hostname ||
        parsed.username || parsed.password
      ) return null;
      return parsed.toString();
    } catch {
      return null;
    }
  }
  if (scheme === 'tel') {
    return /^tel:\+?[0-9().\- ]{3,40}$/i.test(candidate) ? candidate : null;
  }
  if (scheme === 'mailto') {
    const address = candidate.slice(match![0].length);
    return /^[^\s@?#]+@[^\s@?#.]+(?:\.[^\s@?#.]+)+$/.test(address) ? candidate : null;
  }
  const remainder = candidate.slice(match![0].length);
  return remainder && !/[\s\\]/.test(remainder) && !remainder.startsWith('//')
    ? candidate
    : null;
}

export async function tryOpenExternalUrl(
  value: unknown,
  allowedSchemes: readonly ExternalLinkScheme[],
  openURL: OpenExternalUrl,
): Promise<boolean> {
  const url = normalizeExternalUrl(value, allowedSchemes);
  if (!url) return false;
  try {
    await openURL(url);
    return true;
  } catch {
    return false;
  }
}
