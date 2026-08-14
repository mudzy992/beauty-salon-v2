import { useSettings } from '../context/SettingsContext'
import { site } from './site'
import { getUploadUrl } from '../utils/uploadUrl'

const PAGE_KEYS: Record<string, { title: string; description: string }> = {
  '/': { title: 'seo_page_home_title', description: 'seo_page_home_description' },
  '/usluge': { title: 'seo_page_services_title', description: 'seo_page_services_description' },
  '/blog': { title: 'seo_page_blog_title', description: 'seo_page_blog_description' },
  '/galerija': { title: 'seo_page_gallery_title', description: 'seo_page_gallery_description' },
  '/kontakt': { title: 'seo_page_contact_title', description: 'seo_page_contact_description' },
  '/rezervacija': { title: 'seo_page_reserve_title', description: 'seo_page_reserve_description' },
}

export function useSeoSettings() {
  const { getSetting } = useSettings()
  const base = getSetting('public_site_base_url', '').replace(/\/$/, '') || site.baseUrl
  const defaultTitle = getSetting('seo_default_title', '') || site.defaultTitle
  const defaultDescription = getSetting('seo_default_description', '') || site.defaultDescription
  const ogImageRaw = getSetting('seo_og_image', '')
  const ogImage = ogImageRaw
    ? ogImageRaw.startsWith('http')
      ? ogImageRaw
      : getUploadUrl(ogImageRaw)
    : site.defaultOgImagePath
  const forPath = (pathname: string) => {
    const keys = PAGE_KEYS[pathname]
    return {
      title: keys ? getSetting(keys.title, '') : '',
      description: keys ? getSetting(keys.description, '') : '',
    }
  }
  return { base, defaultTitle, defaultDescription, ogImage, forPath }
}
