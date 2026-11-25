import { useId, type DragEvent } from 'react'
import { Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../components/ui/button'
import { EmailVisualEditorBlocks } from './email-visual-editor-blocks'
import { EmailVisualEditorPreview } from './email-visual-editor-preview'
import type { EmailContentBlock, EmailContentBlockType } from './email-visual-editor-types'

export type { EmailContentBlock, EmailContentBlockType } from './email-visual-editor-types'

interface EmailVisualEditorProps {
  blocks: EmailContentBlock[]
  onChange: (blocks: EmailContentBlock[]) => void
  showVerificationCode?: boolean
}

const createId = (type: EmailContentBlockType) =>
  `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const newBlock = (
  type: EmailContentBlockType,
  t: (key: string) => string,
): EmailContentBlock => ({
  id: createId(type),
  type,
  content:
    type === 'title' || type === 'text' || type === 'button' || type === 'highlight'
      ? t(`emailSettings.templates.blockPlaceholders.${type}`)
      : '',
  ...(type === 'button' ? { secondary: '{{appUrl}}/rezervacija' } : {}),
})

/**
 * Vizualni editor email sadržaja (S9).
 *
 * Ornkestrator: dodaje blokove, premješta ih (drag&drop ili dugmad) i
 * renderuje preview. Lista blokova je u `email-visual-editor-blocks.tsx`, a
 * preview u `email-visual-editor-preview.tsx` — markup, `htmlFor`/`id`
 * parovi i prevodni ključevi su isti kao prije razbijanja.
 */
export function EmailVisualEditor({
  blocks,
  onChange,
  showVerificationCode = false,
}: EmailVisualEditorProps) {
  const { t } = useTranslation()
  const editorId = useId().replace(/:/g, '')
  const headingId = `${editorId}-heading`

  const addBlock = (type: EmailContentBlockType) =>
    onChange([...blocks, newBlock(type, t)])

  const moveBlock = (sourceIndex: number, targetIndex: number) => {
    if (
      sourceIndex < 0 ||
      targetIndex < 0 ||
      sourceIndex >= blocks.length ||
      targetIndex >= blocks.length ||
      sourceIndex === targetIndex
    ) {
      return
    }
    const next = [...blocks]
    const [moved] = next.splice(sourceIndex, 1)
    next.splice(targetIndex, 0, moved)
    onChange(next)
  }

  const handleDrop = (event: DragEvent<HTMLDivElement>, targetId: string) => {
    event.preventDefault()
    const sourceId = event.dataTransfer.getData('text/plain')
    const sourceIndex = blocks.findIndex((block) => block.id === sourceId)
    const targetIndex = blocks.findIndex((block) => block.id === targetId)
    moveBlock(sourceIndex, targetIndex)
  }

  return (
    <section className="space-y-4" aria-labelledby={headingId}>
      <div>
        <h3 id={headingId} className="text-lg font-semibold text-content">
          {t('emailSettings.templates.visualEditorHeading')}
        </h3>
        <p className="mt-1 text-sm text-content-strong">
          {t('emailSettings.templates.visualEditorDescription')}
        </p>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.9fr)]">
        <div className="min-w-0 space-y-3">
          <div className="flex flex-wrap gap-2">
            {(['title', 'text', 'highlight', 'button', 'divider', 'spacer'] as const).map((type) => (
              <Button
                key={type}
                type="button"
                size="sm"
                variant="outline"
                disabled={blocks.length >= 30}
                onClick={() => addBlock(type)}
              >
                <Plus aria-hidden="true" className="mr-1 h-3.5 w-3.5" />
                {type === 'highlight'
                  ? t('emailSettings.templates.addHighlight')
                  : type === 'divider'
                    ? t('emailSettings.templates.addDivider')
                    : t(`emailSettings.campaigns.add${type[0]!.toUpperCase()}${type.slice(1)}`)}
              </Button>
            ))}
          </div>
          <p className="text-xs text-content-strong">
            {t('emailSettings.campaigns.dragHint')}
          </p>

          <EmailVisualEditorBlocks
            blocks={blocks}
            editorId={editorId}
            onChange={onChange}
            onDropBlock={handleDrop}
          />
        </div>

        <EmailVisualEditorPreview blocks={blocks} showVerificationCode={showVerificationCode} />
      </div>
    </section>
  )
}
