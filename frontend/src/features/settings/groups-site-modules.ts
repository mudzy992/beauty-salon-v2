import { Eye, Lock, MessageCircle, ToggleLeft } from 'lucide-react'
import type { SettingGroup } from './types'

/**
 * Grupe postavki — javni moduli i komentari (S9).
 *
 * Izdvojeno iz `groups-site.ts` bez promjene: iste grupe, isti `prefix`,
 * isti `defaults` i isti `icon` / `color`.
 */
export const SITE_MODULE_GROUPS: SettingGroup[] = [
  {
    label: 'Galerija',
    prefix: 'public_gallery_',
    description: 'Naslov, podnaslov i pozadinska slika javne galerije.',
    icon: Eye,
    color: 'green',
    defaults: [
      { key: 'public_gallery_bg', desc: 'Galerija — pozadina', type: 'image' },
      { key: 'public_gallery_title', desc: 'Galerija — naslov', type: 'text' },
      { key: 'public_gallery_subtitle', desc: 'Galerija — podnaslov', type: 'text' },
    ],
  },
  {
    label: 'Blog',
    prefix: 'public_blog_',
    description: 'Naslov, podnaslov i pozadinska slika javnog bloga.',
    icon: MessageCircle,
    color: 'cyan',
    defaults: [
      { key: 'public_blog_bg', desc: 'Blog — pozadina', type: 'image' },
      { key: 'public_blog_title', desc: 'Blog — naslov', type: 'text' },
      { key: 'public_blog_subtitle', desc: 'Blog — podnaslov', type: 'text' },
    ],
  },
  {
    label: 'Prijava i registracija',
    prefix: 'public_auth_',
    description: 'Slike, naslovi i podnaslovi za javne ekrane prijave i registracije.',
    icon: Lock,
    color: 'blue',
    defaults: [
      { key: 'public_login_image', desc: 'Prijava — slika', type: 'image' },
      { key: 'public_login_title', desc: 'Prijava — naslov', type: 'text' },
      { key: 'public_login_subtitle', desc: 'Prijava — podnaslov', type: 'text' },
      { key: 'public_register_image', desc: 'Registracija — slika', type: 'image' },
      { key: 'public_register_title', desc: 'Registracija — naslov', type: 'text' },
      { key: 'public_register_subtitle', desc: 'Registracija — podnaslov', type: 'text' },
    ],
  },
  {
    label: 'Javni moduli',
    prefix: 'public_feature_',
    description: 'Sakrij blog, galeriju ili recenzije na webu i mobilnoj.',
    icon: ToggleLeft,
    color: 'teal',
    defaults: [
      { key: 'public_feature_blog', desc: 'Prikaži blog', type: 'boolean' },
      { key: 'public_feature_gallery', desc: 'Prikaži galeriju', type: 'boolean' },
      { key: 'public_feature_reviews', desc: 'Prikaži recenzije', type: 'boolean' },
    ],
  },
  {
    label: 'Komentari (blog)',
    prefix: 'comments_',
    description: 'Auto-odobrenje, zabranjene riječi i blokirani korisnici.',
    icon: MessageCircle,
    color: 'orange',
    defaults: [
      { key: 'comments_auto_approve', desc: 'Automatski odobri komentare', type: 'boolean' },
      { key: 'comments_badwords', desc: 'Zabranjene riječi', type: 'textarea' },
      { key: 'comments_blocked_user_ids', desc: 'Blokirani userId', type: 'textarea' },
    ],
  },
]
