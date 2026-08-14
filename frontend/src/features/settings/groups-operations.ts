import { Bell, Calendar, Lock } from 'lucide-react'
import type { SettingGroup } from './types'

export const OPERATIONS_GROUPS: SettingGroup[] = [
  {
    label: 'Vremenska zona',
    prefix: 'salon.',
    description: 'Koristi se za rezervacije, rokove i podsjetnike.',
    icon: Lock,
    color: 'red',
    defaults: [
      {
        key: 'salon.timezone',
        desc: 'Vremenska zona salona',
        type: 'select',
        options: [
          { value: 'Europe/Sarajevo', label: 'Europe/Sarajevo' },
          { value: 'Europe/Zagreb', label: 'Europe/Zagreb' },
          { value: 'Europe/Belgrade', label: 'Europe/Belgrade' },
          { value: 'UTC', label: 'UTC' },
        ],
      },
    ],
  },
  {
    label: 'Rezervacije — rokovi',
    prefix: 'system_reservation_',
    description: 'Lock minuta je na stranici Salon. Ovdje su potvrda dolaska, inbox i dnevna knjiga.',
    icon: Calendar,
    color: 'teal',
    defaults: [
      {
        key: 'system_reservation_attendance_hours',
        desc: 'Sati prije početka do kada klijent mora potvrditi dolazak',
        type: 'number',
        min: 1,
        max: 72,
        suffix: 'sati',
      },
      {
        key: 'system_reservation_inbox_timeout_hours',
        desc: 'Auto-otkaz PENDING/REVIEW zahtjeva',
        type: 'number',
        min: 1,
        max: 168,
        suffix: 'sati',
      },
      {
        key: 'system_reservation_daily_log_reminder_hours',
        desc: 'Podsjetnik stilistu za PENDING dnevnu knjigu',
        type: 'number',
        min: 1,
        max: 168,
        suffix: 'sati',
      },
    ],
  },
  {
    label: 'Notifikacije',
    prefix: 'system_notif_',
    description: 'Email from/name su na Email postavkama. Ovdje je podsjetnik i push.',
    icon: Bell,
    color: 'cyan',
    defaults: [
      {
        key: 'system_notif_reminder_hours',
        desc: 'Koliko sati prije termina poslati podsjetnik klijentu',
        type: 'number',
        min: 1,
        max: 168,
        suffix: 'sati',
      },
      { key: 'system_push_enabled', desc: 'Šalji push notifikacije (globalno)', type: 'boolean' },
    ],
  },
]
