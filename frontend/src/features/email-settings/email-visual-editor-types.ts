/**
 * Tipovi sadržaja vizualnog editora emaila (S9).
 *
 * Izdvojeno iz `email-visual-editor.tsx` bez promjene — ista četiri tipa
 * bloka, isti oblik objekta (polje `secondary` je opciono i nosi URL
 * dugmeta).
 */

export type EmailContentBlockType = 'title' | 'text' | 'button' | 'spacer' | 'highlight' | 'divider'

export interface EmailContentBlock {
  id: string
  type: EmailContentBlockType
  content: string
  secondary?: string
}
