import { Download, ExternalLink, Paperclip } from 'lucide-react'

import { getUploadUrl } from '../../../utils/uploadUrl'
import type { ExpenseAttachment } from '../finance.types'

type Props = {
  attachments: ExpenseAttachment[]
  compact?: boolean
}

const actionClass =
  'inline-flex h-7 w-7 items-center justify-center rounded-md text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-slate-50'

export function ExpenseAttachmentsList({ attachments, compact = false }: Props) {
  if (attachments.length === 0) {
    return compact ? (
      <span className="text-xs text-slate-400">—</span>
    ) : null
  }

  return (
    <ul className={compact ? 'grid gap-1' : 'grid gap-2'}>
      {attachments.map((attachment) => {
        const upload = attachment.upload
        const name = upload?.originalName || attachment.description || 'Prilog'
        const href = getUploadUrl(upload?.pathOriginal)
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
              className={actionClass}
              aria-label={`Otvori prilog ${name}`}
            >
              <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
            <a
              href={href}
              download={name}
              className={actionClass}
              aria-label={`Preuzmi prilog ${name}`}
            >
              <Download className="h-3.5 w-3.5" aria-hidden="true" />
            </a>
          </li>
        )
      })}
    </ul>
  )
}
