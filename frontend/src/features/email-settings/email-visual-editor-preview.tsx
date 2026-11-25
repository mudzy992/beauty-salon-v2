import { useTranslation } from 'react-i18next'

import type { EmailContentBlock } from './email-visual-editor-types'

/**
 * Preview vizualnog editora (S9).
 *
 * Izdvojeno iz `email-visual-editor.tsx` bez promjene: isti uzorak zamjene
 * `{{placeholders}}` probnim vrijednostima, isti okvir (`data-email-preview`)
 * i isti kod za verifikaciju (`data-email-preview-code`).
 *
 * **Namjerni izuzetak od semantičkih tokena:** preview okvir ostaje u
 * punom Aurum ljubičasto-brončanom spektru (`#2d1f1c`, `#7b4b3a`, `#f9f3f0`),
 * jer se mail renderuje na bijeloj pozadini nezavisno od teme aplikacije.
 * To je obrazloženo i u `test:s9-semantic-colors`.
 */
export const sampleText = (value: string) =>
  Object.entries({
    firstName: 'Amina',
    lastName: 'Kovačević',
    username: 'amina',
    email: 'amina@example.test',
    appUrl: 'https://nejra.ba',
    reservationReference: 'R-2046',
    reservationViewUrl: 'https://nejra.ba/moj-termin/primjer',
    verificationCode: '123456',
  }).reduce((result, [key, sample]) => result.split(`{{${key}}}`).join(sample), value)

export function EmailVisualEditorPreview({
  blocks,
  showVerificationCode = false,
}: {
  blocks: EmailContentBlock[]
  showVerificationCode?: boolean
}) {
  const { t } = useTranslation()

  return (
    <div className="min-w-0 space-y-3 xl:sticky xl:top-4 xl:self-start">
      <div>
        <h4 className="font-semibold text-content">
          {t('emailSettings.templates.previewHeading')}
        </h4>
        <p className="mt-1 text-xs leading-5 text-content-strong">
          {t('emailSettings.templates.previewSampleNote')}
        </p>
      </div>
      <div className="rounded-2xl bg-[#f9f3f0] p-3 sm:p-5">
        {/* Aurum: email preview okvir namjerno ostaje bijel — mailovi se renderuju na bijeloj pozadini, nezavisno od teme aplikacije. */}
        <div data-email-preview className="mx-auto max-w-[480px] overflow-hidden rounded-xl border border-[#f2e7e2] bg-white shadow-xl">
          <div className="bg-gradient-to-br from-[#2d1f1c] via-[#7b4b3a] to-[#d4b098] px-6 py-6 text-white sm:px-8">
            <p className="text-[10px] font-semibold uppercase tracking-[0.22em] text-white/90">
              Beauty Salon Premium
            </p>
          </div>
          <div className="space-y-4 px-5 py-6 text-[#2d1f1c] sm:px-8 sm:py-8">
            {blocks.map((block) => {
              const content = sampleText(block.content)
              if (block.type === 'title') {
                return <h2 key={block.id} className="text-2xl font-bold leading-tight">{content}</h2>
              }
              if (block.type === 'text') {
                return <p key={block.id} className="whitespace-pre-line text-sm leading-7 text-[#4b3a35]">{content}</p>
              }
              if (block.type === 'highlight') {
                return <div key={block.id} className="rounded-lg border-l-4 border-[#b7825f] bg-[#fbf5f1] px-4 py-3 text-sm leading-6 text-[#4b3a35]">{content}</div>
              }
              if (block.type === 'button') {
                return <div key={block.id} className="py-2 text-center"><span className="inline-flex rounded-lg bg-[#7b4b3a] px-5 py-3 text-sm font-semibold text-white">{content || t('emailSettings.campaigns.blockTypes.button')}</span></div>
              }
              if (block.type === 'divider') {
                return <hr key={block.id} className="border-0 border-t border-[#eaded8]" />
              }
              return <div key={block.id} aria-hidden="true" className="h-6" />
            })}
            {showVerificationCode ? (
              <div data-email-preview-code className="inline-flex rounded-lg bg-surface-muted px-5 py-3 font-mono text-xl font-bold tracking-[0.3em] text-content">
                123456
              </div>
            ) : null}
            <div className="border-t border-[#f2e7e2] pt-4 text-xs text-[#7e675f]">
              Beauty Salon Nejra
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
