export type ExportColumn<T> = {
  header: string
  value: (row: T) => string | number
}

const escapeCsvCell = (value: string | number): string => {
  const text = String(value ?? '')
  return /[";\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text
}

const downloadBlob = (blob: Blob, filename: string): void => {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

/** Excel na bs-BA locale očekuje `;` kao separator; BOM osigurava ispravne dijakritike. */
export const exportRowsToCsv = <T,>(params: {
  filename: string
  columns: ExportColumn<T>[]
  rows: T[]
  summary?: (string | number)[]
}): void => {
  const header = params.columns.map((c) => escapeCsvCell(c.header)).join(';')
  const body = params.rows.map((row) =>
    params.columns.map((c) => escapeCsvCell(c.value(row))).join(';'),
  )
  const lines = [header, ...body]
  if (params.summary?.length) {
    lines.push('')
    lines.push(params.summary.map(escapeCsvCell).join(';'))
  }
  downloadBlob(
    new Blob([`\uFEFF${lines.join('\r\n')}`], {
      type: 'text/csv;charset=utf-8;',
    }),
    `${params.filename}.csv`,
  )
}

/** Štampa u zaseban prozor; korisnik bira "Save as PDF" u dijalogu štampe. */
export const printReport = (params: {
  title: string
  subtitle?: string
  headers: string[]
  rows: (string | number)[][]
  summary?: { label: string; value: string }[]
}): void => {
  const win = window.open('', '_blank', 'width=900,height=650')
  if (!win) return
  const cell = (v: string | number) => `<td>${String(v ?? '')}</td>`
  const summaryHtml = (params.summary ?? [])
    .map((s) => `<div><span>${s.label}</span><strong>${s.value}</strong></div>`)
    .join('')
  win.document.write(`<!doctype html><html lang="bs"><head><meta charset="utf-8" />
<title>${params.title}</title>
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
<h1>${params.title}</h1>
${params.subtitle ? `<p class="sub">${params.subtitle}</p>` : ''}
<table><thead><tr>${params.headers.map((h) => `<th>${h}</th>`).join('')}</tr></thead>
<tbody>${params.rows.map((r) => `<tr>${r.map(cell).join('')}</tr>`).join('')}</tbody></table>
<div class="summary">${summaryHtml}</div>
</body></html>`)
  win.document.close()
  win.focus()
  win.print()
}
