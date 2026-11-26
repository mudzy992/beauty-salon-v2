import { Star } from 'lucide-react'
import type { SettingGroup } from './types'

export const APPEARANCE_GROUPS: SettingGroup[] = [
  {
    label: 'Branding',
    prefix: 'app_',
    description: 'Logo i naziv te zadani svijetli ili tamni režim prikaza.',
    icon: Star,
    color: 'pink',
    defaults: [
      { key: 'app_title', desc: 'Naziv aplikacije', type: 'text' },
      { key: 'app_logo', desc: 'Logo', type: 'image' },
      { key: 'app_logo_svg_color', desc: 'Boja SVG loga', type: 'color' },
      { key: 'app_logo_text_color', desc: 'Boja teksta pored loga', type: 'color' },
      { key: 'app_logo_accent', desc: 'Accent loga', type: 'color' },
      { key: 'app_logo_animated', desc: 'Animacija loga', type: 'boolean' },
      { key: 'theme_default_mode', desc: 'theme_default_mode', type: 'select' },
    ],
  },
]
