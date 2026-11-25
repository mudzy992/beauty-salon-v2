import { useTranslation } from 'react-i18next'
import { Loader2 } from 'lucide-react'

import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Select } from '../../components/ui/select'
import { Textarea } from '../../components/ui/textarea'
import { EXISTING_TEMPLATE_TYPES } from './email-settings-constants'
import { EmailVisualEditor } from './email-visual-editor'
import type { ExistingTemplateType } from './email-settings-types'
import type { useEmailTemplates } from './use-email-templates'

/**
 * Template tab admin email postavki (S9).
 *
 * Markup prenesen iz `pages/EmailSettings.tsx` **bez promjene**: isti
 * `htmlFor`/`id` parovi, isti `EmailVisualEditor` (koji i dalje ne renderuje
 * `dangerouslySetInnerHTML`), ista `Badge` oznaka premium dizajna i ista akcija
 * za spremanje.
 */
export function EmailTemplatesPanel({
  templates,
}: {
  templates: ReturnType<typeof useEmailTemplates>
}) {
  const { t } = useTranslation()
  const selectClass =
    'flex h-10 w-full rounded-md border border-line bg-surface px-3 text-sm text-content'

  return (
    <Card className="p-6">
      <div className="space-y-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0 flex-1">
            <Label htmlFor="email-templates-existing-template-type">{t('emailSettings.templates.selectorLabel')}</Label>
            <Select id="email-templates-existing-template-type"
              className={`${selectClass} mt-1`}
              value={templates.existingTemplateType}
              onChange={(event) => templates.setExistingTemplateType(event.target.value as ExistingTemplateType)}
            >
              {EXISTING_TEMPLATE_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(`emailSettings.templates.types.${item.id}`)}
                </option>
              ))}
            </Select>
          </div>
          <Badge variant="brand" className="w-fit px-3 py-2">
            {t('emailSettings.templates.premiumDesignActive')}
          </Badge>
        </div>

        <div className="max-w-3xl space-y-2">
          <Label htmlFor="existing-email-subject">
            {t('emailSettings.templates.subject')}
          </Label>
          <Input
            id="existing-email-subject"
            value={templates.existingTemplate.subject}
            onChange={(event) =>
              templates.setExistingTemplate((prev) => ({ ...prev, subject: event.target.value }))
            }
          />
        </div>

        <EmailVisualEditor
          blocks={templates.existingTemplate.blocks ?? []}
          showVerificationCode={templates.existingTemplateType === 'verification'}
          onChange={(blocks) =>
            templates.setExistingTemplate((prev) => ({ ...prev, blocks }))
          }
        />

        <div className="space-y-2">
          <Label htmlFor="existing-email-plain-text">
            {t('emailSettings.templates.plainTextFallback')}
          </Label>
          <Textarea
            id="existing-email-plain-text"
            className="min-h-[120px]"
            value={templates.existingTemplate.plainText}
            onChange={(event) =>
              templates.setExistingTemplate((prev) => ({ ...prev, plainText: event.target.value }))
            }
          />
        </div>

        <Button type="button" onClick={() => void templates.handleSaveExistingTemplate()} disabled={templates.savingTemplate}>
          {templates.savingTemplate ? <Loader2 className="mr-2 h-4 w-4 animate-spin motion-reduce:animate-none" /> : null}
          {t('emailSettings.templates.saveExisting')}
        </Button>
      </div>
    </Card>
  )
}
