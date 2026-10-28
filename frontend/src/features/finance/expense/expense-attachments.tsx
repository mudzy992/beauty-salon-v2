import { Download, ExternalLink, Paperclip } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import api from '../../../api/client'
import { getUploadUrl } from '../../../utils/uploadUrl'
import type { ExpenseAttachment } from '../finance.types'

type Props = {
  attachments: ExpenseAttachment[]
  compact?: boolean
}

const actionClass =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'

async function openPrivateAttachment(
  event: React.MouseEvent<HTMLAnchorElement>,
  url: string,
  name: string,
  mode: 'open' | 'download',
  errorMessage: string,
) {
  event.preventDefault()
  const popup = mode === 'open' ? window.open('about:blank', '_blank') : null
  if (popup) popup.opener = null
  try {
    const { data } = await api.get<Blob>(url, { responseType: 'blob' })
    const objectUrl = URL.createObjectURL(data)
    if (popup) {
      popup.location.replace(objectUrl)
    } else {
      const anchor = document.createElement('a')
      anchor.href = objectUrl
      anchor.download = mode === 'download' ? name : ''
      anchor.rel = 'noopener noreferrer'
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
    }
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000)
  } catch {
    popup?.close()
    window.alert(errorMessage)
  }
}

export function ExpenseAttachmentsList({ attachments, compact = false }: Props) {
  const { t } = useTranslation()
  if (attachments.length === 0) {
    return compact ? (
      <span className="text-xs text-slate-400">—</span>
    ) : null
  }

  return (
    <ul className={compact ? 'grid gap-1' : 'grid gap-2'}>
      {attachments.map((attachment) => {
        const upload = attachment.upload
        const name = upload?.originalName || attachment.description || t('finance.expenseForm.attachment')
        const href = getUploadUrl(upload?.pathOriginal)
        const privateUpload = upload?.pathOriginal?.startsWith('private/') ?? false
        if (!href) {
          return (
            <li key={attachment.id} className="text-xs text-slate-500">
              {name}
            </li>
          )
        }
        return (
          <li
            key={attachment.id}
            className="flex min-w-0 items-center gap-0.5 text-xs text-slate-700 dark:text-slate-200"
          >
            <Paperclip className="h-3 w-3 shrink-0" aria-hidden="true" />
            <span className="min-w-0 flex-1 truncate" title={name}>
              {name}
            </span>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              onClick={
                privateUpload
                  ? (event) =>
                      void openPrivateAttachment(
                        event,
                        href,
                        name,
                        'open',
                        t('finance.expenseForm.attachmentLoadFailed'),
                      )
                  : undefined
              }
              className={actionClass}
              aria-label={t('finance.expenseForm.openAttachment', { name })}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a
              href={href}
              download={name}
              onClick={
                privateUpload
                  ? (event) =>
                      void openPrivateAttachment(
                        event,
                        href,
                        name,
                        'download',
                        t('finance.expenseForm.attachmentLoadFailed'),
                      )
                  : undefined
              }
              className={actionClass}
              aria-label={t('finance.expenseForm.downloadAttachment', { name })}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
