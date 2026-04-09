import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'

import api from '../../api/client'
import { useSettings } from '../../context/SettingsContext'

interface ServiceOption {
  id: string;
  name: string;
  durationMinutes: number;
}

interface ServiceCategory {
  id: string;
  name: string;
  subcategories?: { id: string; name: string; services?: ServiceOption[] }[];
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

  useEffect(() => {
    api
      .get<ServiceCategory[]>('/api/services/categories', { params: { activeOnly: 'true' } })
      .then(async (r) => {
        const list = Array.isArray(r.data) ? r.data : [];
        const withServices = await Promise.all(
          list.map((c) =>
            api.get<ServiceCategory>(`/api/services/categories/${c.id}`).then((res) => res.data)
          )
        );
        setCategories(withServices);
      })
      .catch(() => setCategories([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="bg-slate-50 min-h-screen pt-10 pb-20">
      {/* HEADER */}
      <div className="bg-slate-950 text-white py-16 mb-12 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: `url('${getSetting(
              'public_services_bg',
              'https://images.unsplash.com/photo-1595476108010-b4d1f10d5e43?auto=format&fit=crop&q=80&w=2000',
            )}')`,
          }}
        />
        <div className="mx-auto max-w-5xl px-4 relative z-10">
          <div className="text-4xl font-semibold mb-4">
            {getSetting('public_services_title', 'Naše Frizerske Usluge')}
          </div>
          <div className="text-lg text-slate-200">
            {getSetting(
              'public_services_subtitle',
              'Bilo da tražite moderno šišanje, spektakularnu boju ili dubinsku njegu kose, naš tim je tu da ispuni vaše želje.',
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        {loading ? (
          <div className="py-20 text-center text-slate-600">Učitavanje…</div>
        ) : categories.length === 0 ? (
          <div className="text-center text-slate-500 text-lg">{t('common.noData')}</div>
        ) : (
          <MotionDiv variants={containerVariants} initial="hidden" animate="visible">
            {categories.map((cat) => (
              <div key={cat.id} className="mb-16">
                <div className="text-2xl font-semibold text-slate-900 inline-block border-b-2 border-brand-champagne pb-2 mb-8">
                  {cat.name}
                </div>

                {cat.subcategories?.length ? (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    {cat.subcategories.map((sub) => (
                      <MotionDiv
                        key={sub.id}
                        variants={itemVariants}
                        className="bg-white p-6 rounded-2xl shadow-sm hover:shadow-md transition-all duration-300 border border-slate-200"
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
                                <Link to={`/usluge/${s.id}`} className="font-medium text-slate-800 hover:text-brand-gold hover:underline">
                                  {s.name}
                                </Link>
                                <span className="inline-flex items-center rounded-md bg-brand-champagne/30 text-slate-900 border border-brand-champagne px-2 py-1 text-xs font-medium">
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
