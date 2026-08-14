import { Eye } from 'lucide-react'
import type { SettingGroup } from './types'

export const SEO_GROUPS: SettingGroup[] = [
  {
    label: 'SEO zadano',
    prefix: 'seo_default_',
    description: 'Fallback ako stranica nema svoj naslov. Canonical koristi public_site_base_url (Sajt).',
    icon: Eye,
    color: 'blue',
    defaults: [
      { key: 'seo_default_title', desc: 'Zadani title', type: 'text' },
      { key: 'seo_default_description', desc: 'Zadani description', type: 'textarea' },
      { key: 'seo_og_image', desc: 'OG slika', type: 'image' },
    ],
  },
  {
    label: 'SEO po stranici',
    prefix: 'seo_page_',
    description: 'Naslov i opis za glavne javne rute.',
    icon: Eye,
    color: 'teal',
    defaults: [
      { key: 'seo_page_home_title', desc: 'Početna — title', type: 'text' },
      { key: 'seo_page_home_description', desc: 'Početna — description', type: 'textarea' },
      { key: 'seo_page_services_title', desc: 'Usluge — title', type: 'text' },
      { key: 'seo_page_services_description', desc: 'Usluge — description', type: 'textarea' },
      { key: 'seo_page_blog_title', desc: 'Blog — title', type: 'text' },
      { key: 'seo_page_blog_description', desc: 'Blog — description', type: 'textarea' },
      { key: 'seo_page_gallery_title', desc: 'Galerija — title', type: 'text' },
      { key: 'seo_page_gallery_description', desc: 'Galerija — description', type: 'textarea' },
      { key: 'seo_page_contact_title', desc: 'Kontakt — title', type: 'text' },
      { key: 'seo_page_contact_description', desc: 'Kontakt — description', type: 'textarea' },
      { key: 'seo_page_reserve_title', desc: 'Rezervacija — title', type: 'text' },
      { key: 'seo_page_reserve_description', desc: 'Rezervacija — description', type: 'textarea' },
    ],
  },
]
