import { Download, Printer } from 'lucide-react'
import { useTranslation } from 'react-i18next'

import { Button } from '../../../components/ui/button'

type ExportMenuProps = {
  onExportCsv: () => void
  onPrint: () => void
  disabled?: boolean
}

export function ExportMenu({
  onExportCsv,
  onPrint,
  disabled,
}: ExportMenuProps) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={onExportCsv}
        disabled={disabled}
        aria-label={t('finance.export.downloadCsv')}
      >
        <Download className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        CSV
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={onPrint}
        disabled={disabled}
        aria-label={t('finance.export.printPdf')}
      >
        <Printer className="mr-2 h-3.5 w-3.5" aria-hidden="true" />
        PDF
      </Button>
    </div>
  )
}
