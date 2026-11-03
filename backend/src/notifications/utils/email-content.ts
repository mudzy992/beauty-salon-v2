import sanitizeHtml from 'sanitize-html';

const EMAIL_TAGS = [
  'a',
  'b',
  'br',
  'div',
  'em',
  'h1',
  'h2',
  'h3',
  'hr',
  'i',
  'img',
  'li',
  'ol',
  'p',
  'span',
  'strong',
  'table',
  'tbody',
  'td',
  'th',
  'thead',
  'tr',
  'u',
  'ul',
];

const EMAIL_ATTRIBUTES: sanitizeHtml.IOptions['allowedAttributes'] = {
  '*': ['style', 'title', 'align', 'valign', 'width', 'height'],
  a: ['href', 'target', 'rel'],
  img: ['src', 'alt'],
  table: ['cellpadding', 'cellspacing', 'border', 'role'],
  td: ['colspan', 'rowspan', 'bgcolor'],
  th: ['colspan', 'rowspan', 'bgcolor'],
};

const EMAIL_STYLES: sanitizeHtml.IOptions['allowedStyles'] = {
  '*': {
    color: [/^#[\da-f]{3,8}$/i],
    'background-color': [/^#[\da-f]{3,8}$/i],
    'font-family': [
      /^(?:Arial|Helvetica|sans-serif|Georgia|serif)(?:\s*,\s*(?:Arial|Helvetica|sans-serif|Georgia|serif))*$/i,
    ],
    'font-size': [/^\d{1,3}(?:px|pt|em|rem|%)$/i],
    'font-weight': [/^(?:normal|bold|[1-9]00)$/i],
    'line-height': [/^\d+(?:\.\d+)?(?:px|pt|em|rem|%)?$/i],
    'text-align': [/^(?:left|center|right|justify)$/i],
    'text-decoration': [/^(?:none|underline)$/i],
    display: [/^(?:block|inline|inline-block|table|table-cell)$/i],
    margin: [
      /^\d{1,3}(?:px|pt|em|rem|%)?(?:\s+\d{1,3}(?:px|pt|em|rem|%)?){0,3}$/i,
    ],
    'margin-top': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'margin-right': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'margin-bottom': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'margin-left': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    padding: [
      /^\d{1,3}(?:px|pt|em|rem|%)?(?:\s+\d{1,3}(?:px|pt|em|rem|%)?){0,3}$/i,
    ],
    'padding-top': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'padding-right': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'padding-bottom': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    'padding-left': [/^\d{1,3}(?:px|pt|em|rem|%)?$/i],
    border: [/^\d{1,2}px\s+solid\s+#[\da-f]{3,8}$/i],
    'border-radius': [/^\d{1,3}px$/i],
    'max-width': [/^\d{1,4}px$/i],
  },
};

const EMAIL_SANITIZER_OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: EMAIL_TAGS,
  allowedAttributes: EMAIL_ATTRIBUTES,
  allowedStyles: EMAIL_STYLES,
  allowedSchemes: ['http', 'https', 'mailto', 'tel'],
  allowedSchemesByTag: {
    img: ['http', 'https'],
  },
  allowProtocolRelative: false,
  enforceHtmlBoundary: true,
  transformTags: {
    a: (_tagName, attributes) => ({
      tagName: 'a',
      attribs: { ...attributes, rel: 'noreferrer noopener' },
    }),
  },
};

export interface CampaignEmailVariables {
  firstName: string;
  lastName: string;
  username: string;
  email: string;
  appUrl: string;
}

export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function resolveSafeEmailHref(value: string | undefined): string | null {
  const trimmed = value?.trim();
  if (!trimmed || trimmed.length > 2048) return null;

  try {
    const url = new URL(trimmed);
    if (
      !['http:', 'https:', 'mailto:', 'tel:'].includes(url.protocol) ||
      url.username ||
      url.password
    ) {
      return null;
    }
    return url.toString();
  } catch {
    return null;
  }
}

export function buildDefaultEmailTemplateHtml(params: {
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  codeBlock?: string;
  signature?: string;
}): string {
  const safeCtaUrl = resolveSafeEmailHref(params.ctaUrl);
  const ctaSection =
    params.ctaLabel && safeCtaUrl
      ? `<p style="margin:24px 0 0"><a href="${escapeEmailHtml(safeCtaUrl)}" rel="noreferrer noopener" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px">${escapeEmailHtml(params.ctaLabel)}</a></p>`
      : '';
  const codeSection = params.codeBlock
    ? `<div style="display:inline-block;padding:12px 18px;border-radius:8px;background:#f3f4f6;font-size:24px;letter-spacing:4px;font-weight:700;margin:12px 0">${escapeEmailHtml(params.codeBlock)}</div>`
    : '';

  return `<div style="margin:0;padding:24px;background:#f9f3f0;font-family:Arial,sans-serif;color:#2d1f1c">
<div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #f2e7e2;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(45,31,28,0.08)">
<div style="padding:28px 32px;background:linear-gradient(135deg,#2d1f1c 0%,#7b4b3a 55%,#d4b098 100%);color:#fff">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.92">Beauty Salon Premium</div>
<h2 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700">${escapeEmailHtml(params.title)}</h2>
</div>
<div style="padding:30px 32px">
<p style="margin:0 0 12px;font-size:16px">${escapeEmailHtml(params.intro)}</p>
<p style="margin:0 0 12px;font-size:15px;color:#4b3a35">${escapeEmailHtml(params.body)}</p>
${codeSection}
${ctaSection}
<div style="margin-top:28px;padding-top:16px;border-top:1px solid #f2e7e2;color:#7e675f;font-size:12px">
${escapeEmailHtml(params.signature || 'Beauty Salon Nejra')}
</div>
</div>
</div>
</div>`;
}

export function sanitizeCampaignEmailHtml(html: string): string {
  return sanitizeHtml(html, EMAIL_SANITIZER_OPTIONS);
}

export function renderCampaignEmailHtml(
  template: string,
  variables: CampaignEmailVariables,
): string {
  const replacements: Record<keyof CampaignEmailVariables, string> = {
    firstName: variables.firstName,
    lastName: variables.lastName,
    username: variables.username,
    email: variables.email,
    appUrl: variables.appUrl,
  };
  let personalized = template;
  for (const [key, value] of Object.entries(replacements)) {
    const placeholder = new RegExp(`\\{\\{\\s*${key}\\s*\\}\\}`, 'g');
    personalized = personalized.replace(placeholder, () =>
      escapeEmailHtml(value),
    );
  }
  return sanitizeCampaignEmailHtml(personalized);
}
