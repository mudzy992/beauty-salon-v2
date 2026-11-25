import { useTranslation } from 'react-i18next'
import { UserRound } from 'lucide-react'

import { Alert, AlertDescription } from '../../components/ui/alert'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'

export type UsernameAvailability = {
  loading: boolean
  available: boolean | null
  suggestions: string[]
}

type Props = {
  value: string
  initialUsername: string
  status: UsernameAvailability
  onChange: (value: string) => void
}

/**
 * Polje korisničkog imena sa provjerom dostupnosti i zamjenom prijedloga.
 *
 * Poruke o dostupnosti idu uz polje (tekstualno), a ne samo u boji — WCAG 1.4.1.
 */
export function EditUserUsernameField({ value, initialUsername, status, onChange }: Props) {
  const { t } = useTranslation()
  const unchanged = value.trim() === initialUsername.trim()

  return (
    <div className="space-y-2">
      <Label htmlFor="users-username">{t('users.username')}</Label>
      <Input id="users-username" aria-required="true" value={value} onChange={event => onChange(event.target.value)} />
      {status.loading ? <p className="text-xs text-content-strong">{t('users.usernameAvailability.checking')}</p> : null}
      {!status.loading && status.available === true && unchanged ? (
        <p className="text-xs text-blue-600">{t('users.usernameAvailability.current')}</p>
      ) : null}
      {!status.loading && status.available === true && !unchanged ? (
        <p className="text-xs text-ok-foreground">{t('users.usernameAvailability.available')}</p>
      ) : null}
      {!status.loading && status.available === false ? (
        <p className="text-xs text-rose-600">{t('users.usernameAvailability.unavailable')}</p>
      ) : null}

      {status.suggestions.length > 0 && status.available === false ? (
        <Alert className="mt-2">
          <UserRound className="h-4 w-4" aria-hidden="true" />
          <p className="mb-1 font-medium leading-none tracking-tight">{t('users.usernameAvailability.suggestions')}</p>
          <AlertDescription>
            <div className="mt-2 flex flex-wrap gap-2">
              {status.suggestions.map((item) => (
                <Button key={item} type="button" size="sm" variant="outline" onClick={() => onChange(item)}>
                  {item}
                </Button>
              ))}
            </div>
          </AlertDescription>
        </Alert>
      ) : null}
    </div>
  )
}
