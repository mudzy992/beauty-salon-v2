export function escapeEmailHtml(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function buildPaymentReceiptBodyText(params: {
  stylistName?: string;
  publicReferenceCode: string;
  completedLabel: string;
  items: Array<{ name: string; unitPrice: number }>;
  serviceAmount: number;
  loyaltyDiscountAmount: number;
  tipAmount: number;
  actualPrice: number;
}): string {
  const lines = [
    params.stylistName?.trim()
      ? `Stilista: ${params.stylistName.trim()}`
      : undefined,
    `Referenca: ${params.publicReferenceCode} · Datum: ${params.completedLabel}`,
    ...params.items.map(
      (item) => `${item.name} — ${item.unitPrice.toFixed(2)} KM`,
    ),
    `Usluge: ${params.serviceAmount.toFixed(2)} KM`,
    params.loyaltyDiscountAmount > 0
      ? `Loyalty popust: −${params.loyaltyDiscountAmount.toFixed(2)} KM`
      : undefined,
    `Napojnica: ${params.tipAmount.toFixed(2)} KM`,
    `Ukupno naplaćeno: ${params.actualPrice.toFixed(2)} KM`,
    '',
    'Hvala vam na povjerenju. Radujemo se sljedećem susretu!',
  ];

  return lines.filter((line): line is string => line !== undefined).join('\n');
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

export type EmailContentBlockType =
  | 'title'
  | 'text'
  | 'button'
  | 'spacer'
  | 'highlight'
  | 'divider'

export interface EmailContentBlock {
  id: string
  type: EmailContentBlockType
  content: string
  secondary?: string
}

const EMAIL_CONTENT_BLOCK_TYPES = new Set<EmailContentBlockType>([
  'title',
  'text',
  'button',
  'spacer',
  'highlight',
  'divider',
])

export function normalizeEmailContentBlocks(value: unknown): EmailContentBlock[] | null {
  if (!Array.isArray(value) || value.length > 30) return null

  let totalCharacters = 0
  const ids = new Set<string>()
  const blocks: EmailContentBlock[] = []
  for (const candidate of value) {
    if (!candidate || typeof candidate !== 'object' || Array.isArray(candidate)) return null
    const block = candidate as Record<string, unknown>
    if (
      typeof block.id !== 'string' ||
      block.id.length === 0 ||
      block.id.length > 80 ||
      ids.has(block.id) ||
      typeof block.type !== 'string' ||
      !EMAIL_CONTENT_BLOCK_TYPES.has(block.type as EmailContentBlockType) ||
      typeof block.content !== 'string' ||
      block.content.length > 5000 ||
      (block.secondary !== undefined &&
        (typeof block.secondary !== 'string' || block.secondary.length > 2048))
    ) {
      return null
    }
    totalCharacters += block.content.length
    if (typeof block.secondary === 'string') totalCharacters += block.secondary.length
    if (totalCharacters > 30000) return null
    ids.add(block.id)
    blocks.push({
      id: block.id,
      type: block.type as EmailContentBlockType,
      content: block.content,
      ...(typeof block.secondary === 'string' ? { secondary: block.secondary } : {}),
    })
  }
  return blocks
}

function renderEmailContentBlocks(
  blocks: EmailContentBlock[],
  codeBlock?: string,
): string {
  const rendered = blocks.map((block) => {
    const content = escapeEmailHtml(block.content).replace(/\r\n?|\n/g, '<br>')
    if (block.type === 'title') {
      return `<h1 style="margin:0 0 18px;color:#2d1f1c;font-size:28px;line-height:1.2;font-weight:700">${content}</h1>`
    }
    if (block.type === 'text') {
      return `<p style="margin:0 0 16px;color:#4b3a35;font-size:15px;line-height:1.7">${content}</p>`
    }
    if (block.type === 'highlight') {
      return `<div style="margin:18px 0;padding:16px 18px;border-left:4px solid #b7825f;border-radius:8px;background-color:#fbf5f1;color:#4b3a35;line-height:1.6">${content}</div>`
    }
    if (block.type === 'button') {
      const safeHref = resolveSafeEmailHref(block.secondary)
      return safeHref
        ? `<p style="margin:22px 0;text-align:center"><a href="${escapeEmailHtml(safeHref)}" rel="noreferrer noopener" style="display:inline-block;padding:13px 20px;border-radius:9px;background-color:#7b4b3a;color:#fff;font-weight:700;text-decoration:none">${content}</a></p>`
        : `<p style="margin:0 0 16px;color:#4b3a35">${content}</p>`
    }
    if (block.type === 'divider') {
      return '<hr style="margin:22px 0;border:0;border-top:1px solid #eaded8">'
    }
    if (block.type === 'spacer') {
      return '<div style="height:24px;line-height:24px">&nbsp;</div>'
    }
    return ''
  })
  if (codeBlock) {
    rendered.push(
      `<div style="display:inline-block;padding:12px 18px;border-radius:8px;background-color:#f3f4f6;font-size:24px;letter-spacing:4px;font-weight:700;margin:12px 0">${escapeEmailHtml(codeBlock)}</div>`,
    )
  }
  return rendered.join('')
}

export function buildDefaultEmailTemplateHtml(params: {
  title: string;
  intro: string;
  body: string;
  ctaLabel?: string;
  ctaUrl?: string;
  codeBlock?: string;
  signature?: string;
  blocks?: EmailContentBlock[];
}): string {
  const safeBody = escapeEmailHtml(params.body).replace(/\r\n?|\n/g, '<br>')
  const safeCtaUrl = resolveSafeEmailHref(params.ctaUrl)
  const ctaSection =
    params.ctaLabel && safeCtaUrl
      ? `<p style="margin:24px 0 0"><a href="${escapeEmailHtml(safeCtaUrl)}" rel="noreferrer noopener" style="display:inline-block;padding:10px 16px;background:#111827;color:#fff;text-decoration:none;border-radius:8px">${escapeEmailHtml(params.ctaLabel)}</a></p>`
      : ''
  const codeSection = params.codeBlock
    ? `<div style="display:inline-block;padding:12px 18px;border-radius:8px;background:#f3f4f6;font-size:24px;letter-spacing:4px;font-weight:700;margin:12px 0">${escapeEmailHtml(params.codeBlock)}</div>`
    : ''
  const headerTitle =
    params.blocks === undefined
      ? `<h2 style="margin:10px 0 0;font-size:28px;line-height:1.2;font-weight:700">${escapeEmailHtml(params.title)}</h2>`
      : ''
  const content =
    params.blocks === undefined
      ? `<p style="margin:0 0 12px;font-size:16px">${escapeEmailHtml(params.intro)}</p>
<p style="margin:0 0 12px;font-size:15px;color:#4b3a35">${safeBody}</p>
${codeSection}${ctaSection}`
      : renderEmailContentBlocks(params.blocks, params.codeBlock)

  return `<div style="margin:0;padding:24px;background:#f9f3f0;font-family:Arial,sans-serif;color:#2d1f1c">
<div style="max-width:680px;margin:0 auto;background:#fff;border:1px solid #f2e7e2;border-radius:18px;overflow:hidden;box-shadow:0 12px 32px rgba(45,31,28,0.08)">
<div style="padding:28px 32px;background:linear-gradient(135deg,#2d1f1c 0%,#7b4b3a 55%,#d4b098 100%);color:#fff">
<div style="font-size:12px;letter-spacing:2px;text-transform:uppercase;opacity:.92">Beauty Salon Premium</div>
${headerTitle}
</div>
<div style="padding:30px 32px">
${content}
<div style="margin-top:28px;padding-top:16px;border-top:1px solid #f2e7e2;color:#7e675f;font-size:12px">
${escapeEmailHtml(params.signature || 'Beauty Salon Nejra')}
</div>
</div>
</div>
</div>`
}
