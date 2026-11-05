import { useId, type DragEvent } from 'react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'

export type EmailContentBlockType = 'title' | 'text' | 'button' | 'spacer' | 'highlight' | 'divider'

export interface EmailContentBlock {
  id: string
  type: EmailContentBlockType
  content: string
  secondary?: string
}

interface EmailVisualEditorProps {
  blocks: EmailContentBlock[]
  onChange: (blocks: EmailContentBlock[]) => void
  showVerificationCode?: boolean
}

const createId = (type: EmailContentBlockType) =>
  `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

const sampleText = (value: string) =>
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

  const updateBlock = (id: string, patch: Partial<EmailContentBlock>) =>
    onChange(blocks.map((block) => (block.id === id ? { ...block, ...patch } : block)))

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
        <h3 id={headingId} className="text-lg font-semibold text-slate-950 dark:text-slate-50">
          {t('emailSettings.templates.visualEditorHeading')}
        </h3>
        <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
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
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {t('emailSettings.campaigns.dragHint')}
          </p>

          <div className="space-y-3">
            {blocks.map((block, index) => (
              <Card
                key={block.id}
                draggable
                onDragStart={(event) => event.dataTransfer.setData('text/plain', block.id)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={(event) => handleDrop(event, block.id)}
                className="border border-slate-200 p-4 dark:border-slate-800"
              >
                <div className="mb-3 flex items-center justify-between gap-3">
                  <Badge variant="secondary" className="text-[10px]">
                    {t(`emailSettings.campaigns.blockTypes.${block.type}`)}
                  </Badge>
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('emailSettings.campaigns.moveUp')}
                      disabled={index === 0}
                      onClick={() => moveBlock(index, index - 1)}
                    >
                      <ArrowUp aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8"
                      aria-label={t('emailSettings.campaigns.moveDown')}
                      disabled={index === blocks.length - 1}
                      onClick={() => moveBlock(index, index + 1)}
                    >
                      <ArrowDown aria-hidden="true" className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 text-rose-600"
                      aria-label={t('emailSettings.campaigns.deleteBlock')}
                      onClick={() => onChange(blocks.filter((item) => item.id !== block.id))}
                    >
                      <Trash2 aria-hidden="true" className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                {block.type === 'title' || block.type === 'button' ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${editorId}-block-content-${block.id}`}>
                      {t(`emailSettings.campaigns.blockTypes.${block.type}`)}
                    </Label>
                    <Input
                      id={`${editorId}-block-content-${block.id}`}
                      value={block.content}
                      maxLength={5000}
                      placeholder={t(`emailSettings.templates.blockPlaceholders.${block.type}`)}
                      onChange={(event) => updateBlock(block.id, { content: event.target.value })}
                    />
                  </div>
                ) : block.type === 'text' || block.type === 'highlight' ? (
                  <div className="space-y-2">
                    <Label htmlFor={`${editorId}-block-content-${block.id}`}>
                      {t(`emailSettings.campaigns.blockTypes.${block.type}`)}
                    </Label>
                    <Textarea
                      id={`${editorId}-block-content-${block.id}`}
                      value={block.content}
                      maxLength={5000}
                      placeholder={t(`emailSettings.templates.blockPlaceholders.${block.type}`)}
                      rows={block.type === 'highlight' ? 3 : 5}
                      onChange={(event) => updateBlock(block.id, { content: event.target.value })}
                    />
                  </div>
                ) : (
                  <p className="text-sm text-slate-600 dark:text-slate-300">
                    {t(`emailSettings.campaigns.blockTypes.${block.type}`)}
                  </p>
                )}

                {block.type === 'button' ? (
                  <div className="mt-3 space-y-2">
                    <Label htmlFor={`${editorId}-block-url-${block.id}`}>
                      {t('emailSettings.campaigns.buttonUrl')}
                    </Label>
                    <Input
                      id={`${editorId}-block-url-${block.id}`}
                      type="url"
                      value={block.secondary || ''}
                      maxLength={2048}
                      placeholder="https://…"
                      onChange={(event) => updateBlock(block.id, { secondary: event.target.value })}
                    />
                  </div>
                ) : null}
              </Card>
            ))}
          </div>
        </div>

        <div className="min-w-0 space-y-3 xl:sticky xl:top-4 xl:self-start">
          <div>
            <h4 className="font-semibold text-slate-900 dark:text-slate-50">
              {t('emailSettings.templates.previewHeading')}
            </h4>
            <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">
              {t('emailSettings.templates.previewSampleNote')}
            </p>
          </div>
          <div className="rounded-2xl bg-[#f9f3f0] p-3 sm:p-5">
            <div className="mx-auto max-w-[480px] overflow-hidden rounded-xl border border-[#f2e7e2] bg-white shadow-xl">
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
                  <div className="inline-flex rounded-lg bg-slate-100 px-5 py-3 font-mono text-xl font-bold tracking-[0.3em] text-slate-900">
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
      </div>
    </section>
  )
}
