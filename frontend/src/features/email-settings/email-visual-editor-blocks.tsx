import { type DragEvent } from 'react'
import { ArrowDown, ArrowUp, Trash2 } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import type { EmailContentBlock } from './email-visual-editor-types'

/**
 * Lista blokova vizualnog editora (S9).
 *
 * Izdvojeno iz `email-visual-editor.tsx` bez promjene: isti drag&drop
 * (`text/plain` prijenos `block.id`), isti `aria-label` za pomjeranje i
 * brisanje, ista polja (istri `htmlFor`/`id` obrazac) i isti limiti.
 */
export function EmailVisualEditorBlocks({
  blocks,
  editorId,
  onChange,
  onDropBlock,
}: {
  blocks: EmailContentBlock[]
  editorId: string
  onChange: (blocks: EmailContentBlock[]) => void
  onDropBlock: (event: DragEvent<HTMLDivElement>, targetId: string) => void
}) {
  const { t } = useTranslation()

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

  return (
    <div className="space-y-3">
      {blocks.map((block, index) => (
        <Card
          key={block.id}
          draggable
          onDragStart={(event) => event.dataTransfer.setData('text/plain', block.id)}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => onDropBlock(event, block.id)}
          className="border border-line p-4"
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
                className="h-8 w-8 text-danger"
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
            <p className="text-sm text-content-strong">
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
  )
}
