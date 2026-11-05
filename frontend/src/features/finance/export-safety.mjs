const FORMULA_PREFIX = /^[\s\uFEFF]*[=+\-@]/

/** Serialize one semicolon-delimited CSV field, preventing formula evaluation for text. */
export const escapeCsvCell = (value) => {
  const text = String(value ?? '')
  const safeText = typeof value === 'string' && FORMULA_PREFIX.test(text)
    ? `'${text}`
    : text
  const escaped = safeText.replace(/"/g, '""')
  return /[;"\r\n]/.test(safeText) ? `"${escaped}"` : escaped
}

/** Escape dynamic values inserted into HTML text nodes. */
export const escapeHtmlText = (value) => String(value ?? '')
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&#39;')

/** Build the printable report document, escaping all report-provided text. */
export const buildPrintReportHtml = (params) => {
  const cell = (value) => `<td>${escapeHtmlText(value)}</td>`
  const summaryHtml = (params.summary ?? [])
    .map((item) => `<div><span>${escapeHtmlText(item.label)}</span><strong>${escapeHtmlText(item.value)}</strong></div>`)
    .join('')
  const documentLanguage = params.language === 'en' ? 'en' : 'bs'

  return `<!doctype html><html lang="${documentLanguage}"><head><meta charset="utf-8" />
<title>${escapeHtmlText(params.title)}</title>
<style>
  body { font-family: system-ui, -apple-system, "Segoe UI", sans-serif; color: #0f172a; padding: 32px; }
  h1 { font-size: 18px; margin: 0 0 4px; }
  p.sub { color: #64748b; font-size: 12px; margin: 0 0 20px; }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th, td { border-bottom: 1px solid #e2e8f0; padding: 8px 6px; text-align: left; }
  th { background: #f8fafc; font-weight: 600; }
  .summary { margin-top: 20px; display: grid; gap: 6px; font-size: 13px; }
  .summary div { display: flex; justify-content: space-between; max-width: 320px; }
  @media print { body { padding: 0; } }
</style></head><body>
<h1>${escapeHtmlText(params.title)}</h1>
${params.subtitle ? `<p class="sub">${escapeHtmlText(params.subtitle)}</p>` : ''}
<table><thead><tr>${params.headers.map((header) => `<th>${escapeHtmlText(header)}</th>`).join('')}</tr></thead>
<tbody>${params.rows.map((row) => `<tr>${row.map(cell).join('')}</tr>`).join('')}</tbody></table>
<div class="summary">${summaryHtml}</div>
</body></html>`
}
