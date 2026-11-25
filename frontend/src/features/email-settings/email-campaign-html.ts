import type { CampaignTemplateBlock } from './email-settings-types'

/**
 * Generator HTML-a kampanje (S9).
 *
 * Izdvojeno iz `pages/EmailSettings.tsx` **bez promjene**: ista bijela lista
 * znakova (`escapeEmailText`), isti skup blokova, iste inline boje i isti
 * omotač. Dozvoljeni markup i njegova sanitizacija se **ne mijenjaju**
 * (STOP uslov iz faze §9).
 */
export const escapeEmailText = (value: string) =>
  value.replace(/[&<>"']/g, (character) => {
    const entities: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;',
    }
    return entities[character] ?? character
  })

export const renderCampaignHtml = (blocks: CampaignTemplateBlock[]): string => {
  const parts = blocks.map((block) => {
    const content = escapeEmailText(block.content).replace(/\r\n?|\n/g, '<br>')
    if (block.type === 'title') return `<h2 style="margin:0 0 16px;color:#2d1f1c">${content}</h2>`
    if (block.type === 'text') return `<p style="margin:0 0 14px;color:#4b3a35;line-height:1.6">${content}</p>`
    if (block.type === 'highlight')
      return `<div style="margin:18px 0;padding:16px 18px;border-left:4px solid #b7825f;border-radius:8px;background-color:#fbf5f1;color:#4b3a35;line-height:1.6">${content}</div>`
    if (block.type === 'divider')
      return '<hr style="margin:22px 0;border:0;border-top:1px solid #eaded8">'
    if (block.type === 'button')
      return `<p style="margin:12px 0 18px;text-align:center"><a href="${escapeEmailText(block.secondary || '#')}" rel="noreferrer noopener" style="display:inline-block;padding:12px 18px;border-radius:10px;background-color:#7b4b3a;color:#fff;text-decoration:none">${content}</a></p>`
    return '<div style="height:24px;line-height:24px">&nbsp;</div>'
  })
  return `<div style="margin:0;padding:24px;background-color:#f9f3f0;font-family:Arial,sans-serif;color:#2d1f1c"><div style="max-width:680px;margin:0 auto;overflow:hidden;background-color:#fff;border:1px solid #f2e7e2;border-radius:18px"><div style="padding:24px 30px;background-color:#7b4b3a;color:#fff;font-size:12px;font-weight:700;letter-spacing:2px">BEAUTY SALON PREMIUM</div><div style="padding:30px">${parts.join('')}<div style="margin-top:28px;padding-top:16px;border-top:1px solid #f2e7e2;color:#7e675f;font-size:12px">Beauty Salon Nejra</div></div></div></div>`
}
