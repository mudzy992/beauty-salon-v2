import { useCallback, useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import {
  fetchAllPublicServiceCategories,
  fetchAllPublicServices,
  fetchAllPublicServiceSubcategories,
} from '../../api/catalog'
import { useSettings } from '../../context/SettingsContext'
import { cssBackgroundImage } from '../../constants/media-fallback'
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'

interface ServiceOption {
  id: string;
  subcategoryId: string;
  name: string;
  durationMinutes: number;
}

interface ServiceSubcategory {
  id: string;
  categoryId: string;
  name: string;
  services?: ServiceOption[];
}

interface ServiceCategory {
  id: string;
  name: string;
  subcategories?: ServiceSubcategory[];
}

interface CatalogService extends ServiceOption {
  subcategory?: { categoryId: string };
}

const MotionDiv = motion.div;

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.1 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function PublicServices() {
  const { t } = useTranslation()
  const { getSetting } = useSettings()
  const [categories, setCategories] = useState<ServiceCategory[]>([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState(false)

  const loadCategories = useCallback(async () => {
    setLoading(true)
    setLoadError(false)
    try {
      const [categoryList, subcategoryList, serviceList] = await Promise.all([
        fetchAllPublicServiceCategories<ServiceCategory>({ activeOnly: true }),
        fetchAllPublicServiceSubcategories<ServiceSubcategory>({ activeOnly: true }),
        fetchAllPublicServices<CatalogService>({ activeOnly: true }),
      ])
      const servicesBySubcategory = new Map<string, ServiceOption[]>();
      serviceList.forEach((service) => {
        const services = servicesBySubcategory.get(service.subcategoryId) ?? [];
        services.push(service);
        servicesBySubcategory.set(service.subcategoryId, services);
      });
      const subcategoriesByCategory = new Map<string, ServiceSubcategory[]>();
      subcategoryList.forEach((subcategory) => {
        subcategory.services = servicesBySubcategory.get(subcategory.id) ?? [];
        const subcategories = subcategoriesByCategory.get(subcategory.categoryId) ?? [];
        subcategories.push(subcategory);
        subcategoriesByCategory.set(subcategory.categoryId, subcategories);
      });
      setCategories(
        categoryList.map((category) => ({
          ...category,
          subcategories: subcategoriesByCategory.get(category.id) ?? [],
        })),
      )
    } catch {
      setCategories([])
      setLoadError(true)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadCategories()
  }, [loadCategories])

  const servicesHeroBg = getSetting('public_services_bg', '')

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className={`${publicPageHero.section} relative overflow-hidden`}>
        <div
          className="pointer-events-none absolute inset-0 bg-cover bg-center opacity-[0.08]"
          style={{ backgroundImage: cssBackgroundImage(servicesHeroBg) }}
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/95 via-white/85 to-white" />
        <div className={`${publicPageHero.innerNarrow} text-center relative z-[1]`}>
          <h1 className={publicHeader.title}>
            {getSetting('public_services_title', t('public.servicesPage.titleFallback'))}
          </h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            {getSetting(
              'public_services_subtitle',
              t('public.servicesPage.subtitleFallback'),
            )}
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        {loading ? (
          <div className="py-20 text-center text-slate-600">{t('public.servicesPage.loading')}</div>
        ) : loadError ? (
          <div className="py-14 text-center" role="alert">
            <p className="text-slate-600">{t('public.servicesPage.loadFailed')}</p>
            <button
              type="button"
              className="mt-4 font-medium text-slate-900 underline underline-offset-4"
              onClick={() => void loadCategories()}
            >
              {t('public.servicesPage.retry')}
            </button>
          </div>
        ) : categories.length === 0 ? (
          <div className="text-center text-slate-500 text-lg">{t('common.noData')}</div>
        ) : (
          <MotionDiv variants={containerVariants} initial="hidden" animate="visible">
            {categories.map((cat) => (
              <div key={cat.id} className="mb-16">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-950 mb-8 pb-3 border-b border-slate-200/80">
                  {cat.name}
                </h2>

                {cat.subcategories?.length ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {cat.subcategories.map((sub) => (
                      <MotionDiv
                        key={sub.id}
                        variants={itemVariants}
                        className="bg-white p-6 rounded-2xl shadow-soft border border-slate-200/80 transition-shadow hover:shadow-md"
                      >
                        <div className="text-lg font-semibold text-slate-800 mb-6">
                          {sub.name}
                        </div>
                        {sub.services?.length ? (
                          <ul className="m-0 p-0 list-none">
                            {sub.services.map((s) => (
                              <li
                                key={s.id}
                                className="flex items-center justify-between py-3 border-b border-slate-100 last:border-b-0 last:pb-0"
                              >
                                <Link
                                  to={`/usluge/${s.id}`}
                                  className="font-medium text-slate-900 hover:text-slate-600 transition-colors"
                                >
                                  {s.name}
                                </Link>
                                <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-600">
                                  {s.durationMinutes} min
                                </span>
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-slate-400 text-sm">{t('common.noData')}</div>
                        )}
                      </MotionDiv>
                    ))}
                  </div>
                ) : (
                  <div className="text-slate-500">{t('common.noData')}</div>
                )}
              </div>
            ))}
          </MotionDiv>
        )}
      </div>
    </div>
  )
}
