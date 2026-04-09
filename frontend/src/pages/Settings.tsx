import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  AtSign,
  Bell,
  Calendar,
  Check,
  ExternalLink,
  Eye,
  Info,
  Loader2,
  Lock,
  Pencil,
  Settings2,
  Star,
  X,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import api from '../api/client'
import { useSettings } from '../context/SettingsContext'
import { useSocketEvent } from '../context/SocketContext'
import { getUploadUrl } from '../utils/uploadUrl'
import { useAppToast } from '../lib/toast/useAppToast'
import { cn } from '../lib/cn'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'
import { Badge } from '../components/ui/badge'
import { Button } from '../components/ui/button'
import { Card } from '../components/ui/card'
import { Input } from '../components/ui/input'
import { Separator } from '../components/ui/separator'
import { Switch } from '../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs'
import { Textarea } from '../components/ui/textarea'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '../components/ui/tooltip'
import type { LucideIcon } from 'lucide-react'

interface AppSetting {
  key: string
  value: string | null
  description: string | null
  isSecret?: boolean
  isConfigured?: boolean
  scope?: 'PUBLIC' | 'PRIVATE'
  type?: 'string' | 'boolean' | 'number' | 'json'
}

type SettingType = 'text' | 'textarea' | 'boolean' | 'number' | 'url' | 'image' | 'email' | 'color'

type RegistryItem = {
  key: string
  scope: 'PUBLIC' | 'PRIVATE'
  type: 'string' | 'boolean' | 'number' | 'json'
  isSecret?: boolean
  defaultValue?: string
  min?: number
  max?: number
}

interface SettingDef {
  key: string
  desc: string
  type: SettingType
  placeholder?: string
  min?: number
  max?: number
  suffix?: string
}

interface SettingGroup {
  label: string
  prefix: string
  description: string
  icon: LucideIcon
  color: string
  defaults: SettingDef[]
}

const GROUP_ICON_TEXT: Record<string, string> = {
  orange: 'text-orange-500',
  purple: 'text-purple-500',
  blue: 'text-blue-500',
  green: 'text-emerald-500',
  pink: 'text-pink-500',
  gray: 'text-slate-500',
  teal: 'text-teal-500',
  cyan: 'text-cyan-500',
  red: 'text-rose-500',
}

const SETTING_GROUPS: SettingGroup[] = [
  {
    label: 'Režim održavanja',
    prefix: 'maintenance_',
    description:
      'Kada je uključeno, javni web i mobilna početna prikazuju poruku umjesto sadržaja. Admin panel (/admin) i stranice prijave (/login) rade normalno.',
    icon: Lock,
    color: 'orange',
    defaults: [
      { key: 'system_maintenance_mode', desc: 'Režim održavanja (javni sadržaj blokiran)', type: 'boolean' },
      {
        key: 'public_maintenance_message',
        desc: 'Poruka za posjetioce (prazno = podrazumijevani tekst)',
        type: 'textarea',
        placeholder: 'Radimo na poboljšanjima. Pokušajte kasnije.',
      },
    ],
  },
  {
    label: 'Hero Sekcija',
    prefix: 'public_hero_',
    description: 'Postavke za hero (glavnu) sekciju na javnoj početnoj stranici. Ovdje definirate naslov, podnaslov, pozadinsku sliku i CTA dugme.',
    icon: Star,
    color: 'purple',
    defaults: [
      { key: 'public_hero_title', desc: 'Glavni naslov koji se prikazuje na hero sekciji', type: 'text', placeholder: 'Dobro došli u Beauty Salon Nejra' },
      { key: 'public_hero_subtitle', desc: 'Podnaslov ispod glavnog naslova', type: 'textarea', placeholder: 'Vaš frizerski salon za savršen izgled...' },
      { key: 'public_hero_image', desc: 'URL pozadinske slike za hero sekciju (preporučena veličina: 1920x800px)', type: 'image', placeholder: 'https://...' },
      { key: 'public_hero_cta_text', desc: 'Tekst na glavnom CTA (Call-to-Action) dugmetu', type: 'text', placeholder: 'Rezervišite termin' },
      { key: 'public_hero_cta_link', desc: 'Link na koji vodi CTA dugme', type: 'url', placeholder: '/rezervacija' },
    ],
  },
  {
    label: 'O Nama',
    prefix: 'public_about_',
    description: 'Sekcija "O nama" na javnoj stranici. Predstavite svoj salon, iskustvo i tim.',
    icon: Info,
    color: 'blue',
    defaults: [
      { key: 'public_about_title', desc: 'Naslov sekcije "O nama"', type: 'text', placeholder: 'O nama' },
      { key: 'public_about_text', desc: 'Tekst o salonu – opišite svoju priču, iskustvo i specijalizacije', type: 'textarea', placeholder: 'Beauty Salon Nejra nudi...' },
      { key: 'public_about_image', desc: 'Slika za sekciju "O nama" (preporučena: 600x400px)', type: 'image', placeholder: 'https://...' },
    ],
  },
  {
    label: 'Kontakt Informacije',
    prefix: 'public_contact_',
    description: 'Kontakt podaci koji se prikazuju na javnoj stranici i u footeru.',
    icon: AtSign,
    color: 'green',
    defaults: [
      { key: 'public_contact_bg', desc: 'Pozadinska slika stranice kontakt', type: 'image', placeholder: 'https://...' },
      { key: 'public_contact_title', desc: 'Naslov stranice kontakt', type: 'text', placeholder: 'Kontakt' },
      { key: 'public_contact_subtitle', desc: 'Podnaslov stranice kontakt', type: 'text', placeholder: 'Javite nam se' },
      { key: 'public_contact_address', desc: 'Fizička adresa salona', type: 'text', placeholder: 'Ulica i broj, Grad' },
      { key: 'public_contact_phone', desc: 'Kontakt telefon', type: 'text', placeholder: '+387 XX XXX XXX' },
      { key: 'public_contact_email', desc: 'Kontakt email adresa', type: 'email', placeholder: 'info@salon.ba' },
      { key: 'public_contact_map_embed', desc: 'Google Maps embed URL za prikaz mape (kopirajte iz Google Maps → Share → Embed)', type: 'url', placeholder: 'https://www.google.com/maps/embed?...' },
      { key: 'public_contact_working_hours_text', desc: 'Tekst radnog vremena za javni prikaz (npr. "Pon-Pet: 09-17h, Sub: 09-14h")', type: 'textarea', placeholder: 'Pon-Pet: 09:00-17:00\nSub: 09:00-14:00\nNed: Zatvoreno' },
    ],
  },
  {
    label: 'Društvene Mreže',
    prefix: 'public_social_',
    description: 'Linkovi na vaše profile na društvenim mrežama. Prikazuju se u footeru i kontakt sekciji.',
    icon: ExternalLink,
    color: 'pink',
    defaults: [
      { key: 'public_social_facebook', desc: 'Link na Facebook stranicu', type: 'url', placeholder: 'https://facebook.com/vaš-salon' },
      { key: 'public_social_instagram', desc: 'Link na Instagram profil', type: 'url', placeholder: 'https://instagram.com/vaš-salon' },
      { key: 'public_social_tiktok', desc: 'Link na TikTok profil', type: 'url', placeholder: 'https://tiktok.com/@vaš-salon' },
    ],
  },
  {
    label: 'Footer',
    prefix: 'public_footer_',
    description: 'Postavke za footer (podnožje) na svim javnim stranicama.',
    icon: Eye,
    color: 'gray',
    defaults: [
      { key: 'public_footer_text', desc: 'Tekst u footeru (npr. kratki opis salona)', type: 'textarea', placeholder: 'Beauty Salon Nejra - Vaš salon za ljepotu' },
      { key: 'public_footer_copyright', desc: 'Copyright tekst u footeru', type: 'text', placeholder: '© 2026 Beauty Salon Nejra. Sva prava zadržana.' },
    ],
  },
  {
    label: 'Rezervacija - Javna Stranica',
    prefix: 'public_reserve_',
    description: 'Postavke za stranicu rezervacije koja je vidljiva klijentima.',
    icon: Calendar,
    color: 'teal',
    defaults: [
      { key: 'public_reserve_title', desc: 'Naslov stranice za rezervaciju', type: 'text', placeholder: 'Rezervišite Vaš Termin' },
      { key: 'public_reserve_subtitle', desc: 'Podnaslov na stranici za rezervaciju', type: 'text', placeholder: 'Osigurajte svoje vrijeme...' },
      { key: 'public_reserve_bg', desc: 'Pozadinska slika za stranicu rezervacije (preporučena: 1920x1080px)', type: 'image', placeholder: 'https://...' },
    ],
  },
  {
    label: 'Blokovi (highlights)',
    prefix: 'public_highlight_',
    description: 'Tri istaknuta bloka na početnoj stranici.',
    icon: Star,
    color: 'purple',
    defaults: [
      { key: 'public_highlight_1_title', desc: 'Naslov bloka 1', type: 'text', placeholder: '' },
      { key: 'public_highlight_1_text', desc: 'Tekst bloka 1', type: 'textarea', placeholder: '' },
      { key: 'public_highlight_2_title', desc: 'Naslov bloka 2', type: 'text', placeholder: '' },
      { key: 'public_highlight_2_text', desc: 'Tekst bloka 2', type: 'textarea', placeholder: '' },
      { key: 'public_highlight_3_title', desc: 'Naslov bloka 3', type: 'text', placeholder: '' },
      { key: 'public_highlight_3_text', desc: 'Tekst bloka 3', type: 'textarea', placeholder: '' },
    ],
  },
  {
    label: 'Pregled usluga (kartice)',
    prefix: 'public_services_peek_',
    description: 'Naslovi i slike za sekciju usluga na početnoj stranici.',
    icon: Eye,
    color: 'teal',
    defaults: [
      { key: 'public_services_peek_title', desc: 'Naslov sekcije', type: 'text', placeholder: '' },
      { key: 'public_services_peek_subtitle', desc: 'Podnaslov sekcije', type: 'text', placeholder: '' },
      { key: 'public_service_1_title', desc: 'Naslov kartice 1', type: 'text', placeholder: '' },
      { key: 'public_service_1_img', desc: 'Slika kartice 1', type: 'image', placeholder: 'https://...' },
      { key: 'public_service_2_title', desc: 'Naslov kartice 2', type: 'text', placeholder: '' },
      { key: 'public_service_2_img', desc: 'Slika kartice 2', type: 'image', placeholder: 'https://...' },
      { key: 'public_service_3_title', desc: 'Naslov kartice 3', type: 'text', placeholder: '' },
      { key: 'public_service_3_img', desc: 'Slika kartice 3', type: 'image', placeholder: 'https://...' },
    ],
  },
  {
    label: 'Stranice (lista usluga, galerija, blog)',
    prefix: 'public_pages_',
    description: 'Hero naslovi i pozadine za stranice /usluge, /galerija, /blog.',
    icon: Eye,
    color: 'blue',
    defaults: [
      { key: 'public_services_bg', desc: 'Pozadina stranice lista usluga', type: 'image', placeholder: 'https://...' },
      { key: 'public_services_title', desc: 'Naslov stranice lista usluga', type: 'text', placeholder: '' },
      { key: 'public_services_subtitle', desc: 'Podnaslov stranice lista usluga', type: 'text', placeholder: '' },
      { key: 'public_gallery_bg', desc: 'Pozadina stranice galerije', type: 'image', placeholder: 'https://...' },
      { key: 'public_gallery_title', desc: 'Naslov stranice galerije', type: 'text', placeholder: '' },
      { key: 'public_gallery_subtitle', desc: 'Podnaslov stranice galerije', type: 'text', placeholder: '' },
      { key: 'public_blog_bg', desc: 'Pozadina stranice bloga', type: 'image', placeholder: 'https://...' },
      { key: 'public_blog_title', desc: 'Naslov stranice bloga', type: 'text', placeholder: '' },
      { key: 'public_blog_subtitle', desc: 'Podnaslov stranice bloga', type: 'text', placeholder: '' },
    ],
  },
  {
    label: 'Prijava i registracija',
    prefix: 'public_auth_',
    description: 'Slike i tekstovi za stranice /login i /register.',
    icon: Lock,
    color: 'gray',
    defaults: [
      { key: 'public_login_image', desc: 'Slika panela prijave', type: 'image', placeholder: 'https://...' },
      { key: 'public_login_title', desc: 'Naslov prijave', type: 'text', placeholder: '' },
      { key: 'public_login_subtitle', desc: 'Podnaslov prijave', type: 'text', placeholder: '' },
      { key: 'public_register_image', desc: 'Slika panela registracije', type: 'image', placeholder: 'https://...' },
      { key: 'public_register_title', desc: 'Naslov registracije', type: 'text', placeholder: '' },
      { key: 'public_register_subtitle', desc: 'Podnaslov registracije', type: 'text', placeholder: '' },
    ],
  },
]

const SYSTEM_GROUPS: SettingGroup[] = [
  {
    label: 'Branding',
    prefix: 'app_',
    description: 'Logo i naziv aplikacije. Ako je logo postavljen, prikazuje se umjesto naziva na webu i u mobilnom hero-u.',
    icon: Star,
    color: 'pink',
    defaults: [
      { key: 'app_title', desc: 'Naziv aplikacije', type: 'text', placeholder: 'Beauty Salon' },
      { key: 'app_logo', desc: 'Logo aplikacije (upload ili URL)', type: 'image', placeholder: 'https://... ili upload' },
      { key: 'app_logo_svg_color', desc: 'Boja SVG loga (ako je SVG)', type: 'color', placeholder: '#632238' },
      { key: 'app_logo_text_color', desc: 'Boja teksta pored loga', type: 'color', placeholder: '#632238' },
      { key: 'app_logo_icon', desc: 'Ikonica (n | scissors | flower | sparkles)', type: 'text', placeholder: 'n' },
      { key: 'app_logo_accent', desc: 'Accent boja (hex)', type: 'text', placeholder: '#D4A843' },
      { key: 'app_logo_animated', desc: 'Animacija loga', type: 'boolean' },
    ],
  },
  {
    label: 'Notifikacije',
    prefix: 'system_notif_',
    description: 'Postavke za email i push notifikacije.',
    icon: Bell,
    color: 'cyan',
    defaults: [
      { key: 'system_notif_email_from', desc: 'Email adresa s koje se šalju notifikacije (from)', type: 'email', placeholder: 'noreply@salon.ba' },
      { key: 'system_notif_email_name', desc: 'Ime pošiljaoca u email notifikacijama', type: 'text', placeholder: 'Beauty Salon Nejra' },
      { key: 'system_notif_reminder_hours', desc: 'Koliko sati prije termina poslati podsjetnik klijentu', type: 'number', min: 1, max: 48, suffix: 'sati' },
    ],
  },
  {
    label: 'Opće Postavke',
    prefix: 'system_general_',
    description: 'Opće sistemske postavke aplikacije.',
    icon: Lock,
    color: 'red',
    defaults: [
      { key: 'system_public_app_url', desc: 'Javni URL aplikacije (linkovi u emailovima, itd.)', type: 'url', placeholder: 'https://salon.ba' },
      { key: 'system_app_version', desc: 'Trenutna verzija aplikacije (informativno)', type: 'text', placeholder: '2.0.0' },
    ],
  },
  {
    label: 'Loyalty program',
    prefix: 'loyalty_',
    description:
      'Pravila bodovanja, nivoa i korištenja bodova za loyalty program. Ove postavke primjenjuju se globalno na sve klijente.',
    icon: Star,
    color: 'green',
    defaults: [
      { key: 'loyalty_enabled', desc: 'Loyalty program uključen (osnovni switch je i na stranici Loyalty)', type: 'boolean' },
      { key: 'loyalty_points_per_currency', desc: 'Broj bodova po 1 KM stvarne cijene usluge', type: 'number', min: 0, max: 100, suffix: 'bodova / KM' },
      { key: 'loyalty_earn_on_tip', desc: 'Računati bodove i na iznos napojnice (tip)', type: 'boolean' },
      { key: 'loyalty_min_amount_for_earn', desc: 'Minimalni iznos usluge za dodjelu bodova', type: 'number', min: 0, max: 10000, suffix: 'KM' },
      { key: 'loyalty_excluded_services', desc: 'JSON lista ID-ova servisa koji su isključeni iz bodovanja', type: 'textarea', placeholder: '["service-id-1","service-id-2"]' },
      { key: 'loyalty_redeem_enabled', desc: 'Dopustiti korištenje (redeem) bodova', type: 'boolean' },
      { key: 'loyalty_redeem_rate', desc: 'Informativno: vrijednost 1 boda u KM (trenutno za prikaz / buduće feature-e)', type: 'number', min: 0, max: 10, suffix: 'KM / bod' },
      { key: 'loyalty_min_points_to_redeem', desc: 'Minimalan broj bodova za jedno korištenje (redeem)', type: 'number', min: 0, max: 100000, suffix: 'bodova' },
      { key: 'loyalty_max_discount_percent', desc: 'Maksimalni procenat računa koji se može platiti bodovima (za buduću validaciju)', type: 'number', min: 0, max: 100, suffix: '%' },
      {
        key: 'loyalty_tiers',
        desc: 'JSON definicija nivoa (tierova) po ukupnim bodovima (Silver/Gold/Platinum...)',
        type: 'textarea',
        placeholder:
          '[{"id":"silver","name":"Silver","minPoints":0},{"id":"gold","name":"Gold","minPoints":500},{"id":"platinum","name":"Platinum","minPoints":1500}]',
      },
    ],
  },
]

const ALL_KNOWN_SETTING_KEYS = [
  ...SETTING_GROUPS.flatMap((g) => g.defaults.map((d) => d.key)),
  ...SYSTEM_GROUPS.flatMap((g) => g.defaults.map((d) => d.key)),
]

const HIDDEN_SETTINGS_KEYS = ['app_logo_text'] as const

function isMeaningfullyConfigured(row: AppSetting | undefined, reg: RegistryItem | undefined): boolean {
  if (!row || !reg) return false
  if (row.isSecret) return Boolean(row.isConfigured)
  const v = row.value
  if (v === null || v === undefined) return false
  const s = String(v).trim()
  if (reg.type === 'boolean') {
    const def = (reg.defaultValue ?? 'false').toLowerCase()
    return s.toLowerCase() !== def
  }
  if (reg.type === 'number') {
    const def = reg.defaultValue ?? '0'
    return s.trim() !== def
  }
  if (reg.type === 'json') {
    const def = (reg.defaultValue ?? '').trim()
    if (s === '') return false
    if (def !== '' && s === def) return false
    return true
  }
  const def = reg.defaultValue ?? ''
  if (s === '') return false
  if (def !== '' && s === def) return false
  return true
}

function SettingEditor({
  def,
  setting,
  onSave,
}: {
  def: SettingDef
  setting: AppSetting | undefined
  onSave: (key: string, value: string, desc: string) => Promise<void>
}) {
  const { success, error } = useAppToast()
  const [editing, setEditing] = useState(false)
  const [value, setValue] = useState(setting?.value ?? '')
  const [saving, setSaving] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  useEffect(() => {
    setValue(setting?.value ?? '')
    setSelectedFile(null)
  }, [setting])

  const handleSave = async () => {
    setSaving(true)
    try {
      await onSave(def.key, value, def.desc)
      setEditing(false)
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setValue(setting?.value ?? '')
    setSelectedFile(null)
    setEditing(false)
  }

  const handleUpload = async () => {
    if (!selectedFile) return
    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('entity', 'branding')
      const { data } = await api.post<{ pathOriginal: string }>('/api/uploads', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      if (!data?.pathOriginal) throw new Error('Upload failed')
      setValue(data.pathOriginal)
      setSelectedFile(null)
      success('Logo uploadovan')
    } catch {
      error('Greška pri uploadu')
    } finally {
      setUploading(false)
    }
  }

  const handleRemoveImage = async () => {
    const current = (value || '').trim()
    if (!current) return
    const shouldDeleteFromStorage =
      !current.startsWith('http') && !current.startsWith('data:') && !current.startsWith('blob:')
    setSaving(true)
    try {
      if (shouldDeleteFromStorage) {
        await api.delete('/api/uploads/by-path-original', { data: { pathOriginal: current } })
      }
      await onSave(def.key, '', def.desc)
      setEditing(false)
      success('Slika uklonjena')
    } catch {
      error('Greška pri uklanjanju')
    } finally {
      setSaving(false)
    }
  }

  const handleBooleanToggle = async (checked: boolean) => {
    setSaving(true)
    try {
      await onSave(def.key, checked ? 'true' : 'false', def.desc)
    } finally {
      setSaving(false)
    }
  }

  if (def.type === 'boolean') {
    const isOn = (setting?.value ?? 'false').toLowerCase() === 'true'
    return (
      <Card className="p-4 transition-shadow hover:shadow-md">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{def.desc}</p>
            <p className="mt-0.5 font-mono text-xs text-slate-400">{def.key}</p>
          </div>
          <Switch checked={isOn} onCheckedChange={handleBooleanToggle} disabled={saving} />
        </div>
      </Card>
    )
  }

  const hasValue = setting?.value !== null && setting?.value !== undefined && setting?.value !== ''

  if (!editing) {
    return (
      <Card className="p-4 transition-shadow hover:shadow-md">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="mb-1 flex flex-wrap items-center gap-2">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{def.desc}</p>
              {hasValue ? (
                <Badge variant="success" className="text-[10px]">
                  Postavljeno
                </Badge>
              ) : (
                <Badge variant="secondary" className="text-[10px]">
                  Nije postavljeno
                </Badge>
              )}
            </div>
            <p className="mb-1 font-mono text-xs text-slate-400">{def.key}</p>

            {hasValue && def.type === 'image' && setting?.value ? (
              <div className="mb-2 mt-2">
                <img
                  src={getUploadUrl(setting.value)}
                  alt={def.key}
                  className="max-h-20 w-auto rounded-md object-cover"
                  onError={(e) => {
                    e.currentTarget.style.display = 'none'
                  }}
                />
              </div>
            ) : null}

            {hasValue && def.type === 'color' && setting?.value ? (
              <div className="mt-2 flex items-center gap-2">
                <span
                  className="h-5 w-5 rounded border border-slate-200 dark:border-slate-800"
                  style={{ backgroundColor: setting.value }}
                  aria-hidden="true"
                />
                <p className="rounded-md bg-slate-50 px-2 py-1 text-sm text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                  {setting.value}
                </p>
              </div>
            ) : null}

            {hasValue && def.type === 'url' && setting?.value ? (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="max-w-full truncate text-left text-sm text-blue-600 underline-offset-4 hover:underline dark:text-blue-400"
                      onClick={() => window.open(setting.value!, '_blank')}
                    >
                      {setting.value}
                    </button>
                  </TooltipTrigger>
                  <TooltipContent>{setting.value}</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : null}

            {hasValue && def.type !== 'image' && def.type !== 'url' && def.type !== 'color' ? (
              <p className="line-clamp-2 rounded-md bg-slate-50 p-2 text-sm text-slate-700 dark:bg-slate-900/40 dark:text-slate-200">
                {setting?.value}
                {def.suffix ? <span className="ml-1 text-slate-400">{def.suffix}</span> : null}
              </p>
            ) : null}
          </div>
          <Button type="button" variant="ghost" size="sm" className="shrink-0" onClick={() => setEditing(true)}>
            <Pencil className="mr-2 h-4 w-4" />
            {hasValue ? 'Uredi' : 'Postavi'}
          </Button>
        </div>
      </Card>
    )
  }

  return (
    <Card className="border-2 border-brand-gold/40 p-4 shadow-md">
      <p className="text-sm font-semibold text-brand-gold">{def.desc}</p>
      <p className="mb-3 font-mono text-xs text-slate-400">{def.key}</p>

      <div className="mb-3 space-y-2">
        {def.type === 'textarea' ? (
          <Textarea
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder={def.placeholder}
            rows={3}
            autoFocus
          />
        ) : def.type === 'color' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="color"
              value={value || '#000000'}
              onChange={(e) => setValue(e.target.value)}
              className="h-10 w-12 p-1"
              aria-label={def.desc}
              autoFocus
            />
            <Input
              type="text"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={def.placeholder ?? '#632238'}
              className="max-w-[180px] font-mono"
            />
          </div>
        ) : def.type === 'number' ? (
          <div className="flex flex-wrap items-center gap-2">
            <Input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min={def.min}
              max={def.max}
              className="max-w-[150px]"
              autoFocus
            />
            {def.suffix ? <span className="text-sm text-slate-500">{def.suffix}</span> : null}
          </div>
        ) : def.type === 'email' ? (
          <div className="flex">
            <span className="inline-flex items-center rounded-l-md border border-r-0 border-slate-200 bg-slate-50 px-3 text-sm text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              @
            </span>
            <Input
              type="email"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={def.placeholder}
              className="rounded-l-none"
              autoFocus
            />
          </div>
        ) : def.type === 'url' || def.type === 'image' ? (
          <div className="space-y-2">
            <Input
              type="url"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              placeholder={def.placeholder}
              autoFocus
            />
            {def.type === 'image' ? (
              <div className="space-y-2">
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="file"
                    accept="image/png,image/svg+xml,image/jpeg,image/webp,image/gif"
                    className="max-w-xs cursor-pointer"
                    disabled={uploading || saving}
                    onChange={(e) => setSelectedFile(e.target.files?.[0] ?? null)}
                  />
                  <Button type="button" size="sm" variant="outline" onClick={handleUpload} disabled={!selectedFile || uploading}>
                    {uploading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Upload...
                      </>
                    ) : (
                      'Upload'
                    )}
                  </Button>
                  {value ? (
                    <Button type="button" size="sm" variant="ghost" className="text-rose-600" onClick={handleRemoveImage} disabled={saving}>
                      {saving ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Uklanjam...
                        </>
                      ) : (
                        'Ukloni'
                      )}
                    </Button>
                  ) : null}
                </div>
                {value ? (
                  <img
                    src={getUploadUrl(value)}
                    alt="Preview"
                    className="max-h-24 w-auto rounded-md bg-slate-50 object-contain dark:bg-slate-900/40"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                ) : null}
              </div>
            ) : null}
          </div>
        ) : (
          <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder={def.placeholder} autoFocus />
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button type="button" size="sm" variant="ghost" onClick={handleCancel}>
          <X className="mr-2 h-4 w-4" />
          Odustani
        </Button>
        <Button type="button" size="sm" onClick={handleSave} disabled={saving}>
          {saving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Čuvam...
            </>
          ) : (
            <>
              <Check className="mr-2 h-4 w-4" />
              Sačuvaj
            </>
          )}
        </Button>
      </div>
    </Card>
  )
}

function SettingGroupPanel({
  group,
  settingsList,
  onSave,
  registryMap,
}: {
  group: SettingGroup
  settingsList: AppSetting[]
  onSave: (key: string, value: string, desc: string) => Promise<void>
  registryMap: Map<string, RegistryItem>
}) {
  const getSettingByKey = (key: string): AppSetting | undefined => settingsList.find((s) => s.key === key)

  const configuredCount = group.defaults.filter((d) =>
    isMeaningfullyConfigured(getSettingByKey(d.key), registryMap.get(d.key)),
  ).length

  const GroupIcon = group.icon
  const iconClass = GROUP_ICON_TEXT[group.color] ?? 'text-slate-600'

  return (
    <div>
      <div className="mb-2 flex flex-wrap items-center gap-2">
        <GroupIcon className={cn('h-5 w-5', iconClass)} aria-hidden="true" />
        <h3 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{group.label}</h3>
        <Badge variant={configuredCount === group.defaults.length ? 'success' : 'secondary'} className="text-[10px]">
          {configuredCount}/{group.defaults.length}
        </Badge>
      </div>
      <p className="mb-4 text-sm leading-relaxed text-slate-600 dark:text-slate-300">{group.description}</p>
      <div className="space-y-3">
        {group.defaults.map((def) => (
          <SettingEditor key={def.key} def={def} setting={getSettingByKey(def.key)} onSave={onSave} />
        ))}
      </div>
    </div>
  )
}

export default function Settings() {
  const { t } = useTranslation()
  const { success, error } = useAppToast()
  const { refreshSettings } = useSettings()
  const [settingsList, setSettingsList] = useState<AppSetting[]>([])
  const [registry, setRegistry] = useState<RegistryItem[]>([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('public')

  const loadData = useCallback(() => {
    setLoading(true)
    Promise.all([api.get<AppSetting[]>('/api/settings'), api.get<RegistryItem[]>('/api/settings/registry')])
      .then(([settingsRes, registryRes]) => {
        setSettingsList(Array.isArray(settingsRes.data) ? settingsRes.data : [])
        setRegistry(Array.isArray(registryRes.data) ? registryRes.data : [])
      })
      .catch(() => {
        setSettingsList([])
        setRegistry([])
      })
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    loadData()
  }, [loadData])

  useSocketEvent(
    'settings:updated',
    useCallback(() => {
      loadData()
      refreshSettings()
    }, [loadData, refreshSettings]),
  )

  const handleSave = async (key: string, value: string, desc: string) => {
    try {
      await api.put(`/api/settings/${key}`, { value, description: desc })
      success('Postavka sačuvana')
      loadData()
      refreshSettings()
    } catch {
      error('Greška pri čuvanju')
      throw new Error('Save failed')
    }
  }

  const registryMap = useMemo(() => new Map(registry.map((r) => [r.key, r])), [registry])
  const registryKeys = useMemo(() => new Set(registry.map((r) => r.key)), [registry])
  const hiddenKeys = useMemo(() => new Set<string>(HIDDEN_SETTINGS_KEYS), [])
  const otherSettings = useMemo(
    () =>
      settingsList.filter(
        (s) => !ALL_KNOWN_SETTING_KEYS.includes(s.key) && !hiddenKeys.has(s.key),
      ),
    [settingsList, hiddenKeys],
  )
  const unknownSettings = useMemo(
    () =>
      settingsList.filter((s) => !registryKeys.has(s.key) && !hiddenKeys.has(s.key)),
    [settingsList, registryKeys, hiddenKeys],
  )
  const contractConfigured = useMemo(
    () => registry.filter((r) => isMeaningfullyConfigured(settingsList.find((s) => s.key === r.key), r)).length,
    [registry, settingsList],
  )
  const legacyRowCount = useMemo(() => settingsList.filter((s) => !registryMap.has(s.key)).length, [settingsList, registryMap])

  const tabKeys = useMemo(() => {
    const keys = ['public', 'system'] as const
    const out: string[] = [...keys]
    if (otherSettings.length > 0) out.push('other')
    if (unknownSettings.length > 0) out.push('legacy')
    return out
  }, [otherSettings.length, unknownSettings.length])

  useEffect(() => {
    if (!tabKeys.includes(activeTab)) setActiveTab(tabKeys[0] ?? 'public')
  }, [activeTab, tabKeys])

  if (loading) {
    return (
      <div className="flex h-[400px] items-center justify-center">
        <div className="flex flex-col items-center gap-3 text-slate-500">
          <Loader2 className="h-10 w-10 animate-spin text-brand-gold" aria-hidden="true" />
          <p>Učitavanje postavki...</p>
        </div>
      </div>
    )
  }

  return (
    <TooltipProvider>
      <div className="mx-auto max-w-6xl px-4 pb-10">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-[240px] flex-1">
            <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-50">{t('nav.settings')}</h1>
            <p className="mt-1 max-w-lg text-sm text-slate-600 dark:text-slate-300">
              Postavke iz kontrakta (registry) su jedini podržani ključevi. Broj ispod računa ključeve čija vrijednost nije prazna i razlikuje se od zadane (default).
            </p>
          </div>
          <div className="grid min-w-[220px] grid-cols-1 gap-2 sm:grid-cols-2">
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500">Kontrakt</p>
              <p className="font-semibold text-slate-900 dark:text-slate-50">
                {contractConfigured} / {registry.length}
              </p>
            </div>
            <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-900/40">
              <p className="text-xs uppercase tracking-wide text-slate-500">Redovi u bazi</p>
              <p className="font-semibold text-slate-900 dark:text-slate-50">
                {settingsList.length}
                {legacyRowCount > 0 ? ` (${legacyRowCount} izvan kontrakta)` : ''}
              </p>
            </div>
          </div>
        </div>

        <Alert className="mb-6">
          <Info className="h-4 w-4" />
          <AlertTitle>Kako čitati brojače</AlertTitle>
          <AlertDescription>
            „Kontrakt“ = ključevi definisani u backend registry-ju. „Postavljeno“ u grupi = vrijednost koja nije default i nije prazna. Nasumični ili zastarjeli ključevi u bazi pojavljuju se u kartici Legacy.
          </AlertDescription>
        </Alert>

        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
            <TabsTrigger value="public" className="gap-2">
              <Eye className="h-4 w-4" />
              Javna Stranica
            </TabsTrigger>
            <TabsTrigger value="system" className="gap-2">
              <Settings2 className="h-4 w-4" />
              Sistem
            </TabsTrigger>
            {otherSettings.length > 0 ? (
              <TabsTrigger value="other">Ostale ({otherSettings.length})</TabsTrigger>
            ) : null}
            {unknownSettings.length > 0 ? (
              <TabsTrigger value="legacy">Legacy / nepoznate ({unknownSettings.length})</TabsTrigger>
            ) : null}
          </TabsList>

          <TabsContent value="public" className="mt-6">
            <div className="space-y-8">
              {SETTING_GROUPS.map((group, idx) => (
                <div key={group.prefix}>
                  {idx > 0 ? <Separator className="my-8" /> : null}
                  <SettingGroupPanel group={group} settingsList={settingsList} onSave={handleSave} registryMap={registryMap} />
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="system" className="mt-6">
            <div className="space-y-8">
              {SYSTEM_GROUPS.map((group, idx) => (
                <div key={group.prefix}>
                  {idx > 0 ? <Separator className="my-8" /> : null}
                  <SettingGroupPanel group={group} settingsList={settingsList} onSave={handleSave} registryMap={registryMap} />
                </div>
              ))}
            </div>
          </TabsContent>

          {otherSettings.length > 0 ? (
            <TabsContent value="other" className="mt-6">
              <p className="mb-4 text-sm text-slate-500">
                Postavke koje nisu u predefinisanim grupama. Ove postavke možete ručno uređivati ili brisati.
              </p>
              <div className="space-y-3">
                {otherSettings.map((s) => (
                  <Card key={s.key} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.key}</p>
                          <Badge variant="success" className="text-[10px]">
                            Postavljeno
                          </Badge>
                        </div>
                        {s.description ? <p className="mb-1 text-xs text-slate-500">{s.description}</p> : null}
                        <p className="line-clamp-2 rounded-md bg-slate-50 p-2 text-sm dark:bg-slate-900/40">{s.value}</p>
                      </div>
                      <div className="flex shrink-0 gap-2">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => {
                            const newVal = window.prompt(`Vrijednost za "${s.key}":`, s.value ?? '')
                            if (newVal !== null) void handleSave(s.key, newVal, s.description ?? '')
                          }}
                        >
                          Uredi
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-rose-600"
                          onClick={async () => {
                            if (!window.confirm(`Obrisati postavku "${s.key}"?`)) return
                            try {
                              await api.delete(`/api/settings/${s.key}`)
                              success('Obrisano')
                              loadData()
                              refreshSettings()
                            } catch {
                              error('Greška')
                            }
                          }}
                        >
                          Obriši
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ) : null}

          {unknownSettings.length > 0 ? (
            <TabsContent value="legacy" className="mt-6">
              <p className="mb-2 text-sm font-semibold text-amber-800 dark:text-amber-200">Legacy / nepoznate postavke</p>
              <p className="mb-4 text-sm text-slate-500">
                Ove postavke nisu dio aktuelnog "settings contract"-a. Mogu biti zastarjele ili pogrešno imenovane. Preporuka je da ih migriramo ili obrišemo nakon provjere.
              </p>
              <div className="space-y-3">
                {unknownSettings.map((s) => (
                  <Card key={s.key} className="p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex flex-wrap items-center gap-2">
                          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{s.key}</p>
                          <Badge variant="warning" className="text-[10px]">
                            Legacy
                          </Badge>
                        </div>
                        {s.description ? <p className="mb-1 text-xs text-slate-500">{s.description}</p> : null}
                        <p className="line-clamp-2 rounded-md bg-slate-50 p-2 text-sm dark:bg-slate-900/40">{s.value}</p>
                      </div>
                      <div className="flex shrink-0">
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          className="text-rose-600"
                          onClick={async () => {
                            if (!window.confirm(`Obrisati legacy postavku "${s.key}"?`)) return
                            try {
                              await api.delete(`/api/settings/${s.key}`)
                              success('Obrisano')
                              loadData()
                              refreshSettings()
                            } catch {
                              error('Greška')
                            }
                          }}
                        >
                          Obriši
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </TabsContent>
          ) : null}
        </Tabs>
      </div>
    </TooltipProvider>
  )
}
