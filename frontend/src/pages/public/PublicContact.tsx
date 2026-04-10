import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'

import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useAppToast } from '../../lib/toast/useAppToast'
import { useSettings } from '../../context/SettingsContext'
import { publicHeader, publicPage, publicPageHero } from '../../features/shell/public/public-ui'

const MotionDiv = motion.div

export default function PublicContact() {
  const { getSetting } = useSettings()
  const toast = useAppToast()
  
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setTimeout(() => {
      setLoading(false)
      toast.success('Poruka poslata', 'Uskoro ćemo Vam odgovoriti.')
      setName('')
      setEmail('')
      setMessage('')
    }, 1000)
  }

  return (
    <div className="bg-white min-h-screen pb-20">
      <div className={publicPageHero.section}>
        <div className={`${publicPageHero.innerNarrow} text-center`}>
          <h1 className={publicHeader.title}>
            {getSetting('public_contact_title', 'Kontaktirajte Nas')}
          </h1>
          <p className={`${publicHeader.subtitle} mt-4 max-w-2xl mx-auto`}>
            {getSetting(
              'public_contact_subtitle',
              'Tu smo za sva vaša pitanja. Javite nam se ili nas posjetite u salonu.',
            )}
          </p>
        </div>
      </div>

      <div className={`${publicPage.container} ${publicPage.contentAfterHero}`}>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <MotionDiv
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card className="rounded-2xl border-slate-200/80 shadow-soft">
              <CardContent className="p-8">
                <div className="text-lg font-semibold tracking-tight text-slate-950 mb-6">
                  Pošaljite nam poruku
                </div>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-2">
                    <Label htmlFor="fullName">Ime i Prezime</Label>
                    <Input
                      id="fullName"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      autoComplete="email"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="message">Poruka</Label>
                    <Textarea
                      id="message"
                      rows={5}
                      value={message}
                      onChange={(e) => setMessage(e.target.value)}
                    />
                  </div>
                  <Button type="submit" disabled={loading}>
                    {loading ? 'Slanje…' : 'Pošalji'}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </MotionDiv>

          <MotionDiv
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="space-y-8">
              <Card className="rounded-2xl border-slate-200/80 shadow-soft">
                <CardContent className="p-8">
                  <div className="text-base font-semibold tracking-tight text-slate-950 mb-4">
                    Informacije
                  </div>
                  <div className="space-y-4 text-slate-600">
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Adresa
                      </div>
                      <div>
                        {getSetting(
                          'public_contact_address',
                          'Titova 12, 71000 Sarajevo',
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Telefon
                      </div>
                      <div>
                        {getSetting('public_contact_phone', '+387 61 234 567')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Email
                      </div>
                      <div>
                        {getSetting('public_contact_email', 'info@salon.ba')}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                        Radno vrijeme
                      </div>
                      <div className="whitespace-pre-line">
                        {getSetting(
                          'public_contact_working_hours_text',
                          'Pon - Sub: 09:00 - 18:00\nNedjelja: Zatvoreno',
                        )}
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {getSetting('public_contact_map_embed', '') ? (
                <div className="rounded-2xl overflow-hidden shadow-soft h-[300px] bg-white border border-slate-200/80">
                  <iframe
                    src={getSetting('public_contact_map_embed', '')}
                    width="100%"
                    height="100%"
                    style={{ border: 0 }}
                    allowFullScreen
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    title="Lokacija salona"
                  />
                </div>
              ) : (
                <div className="rounded-2xl overflow-hidden shadow-sm h-[300px] bg-slate-200 flex items-center justify-center flex-col text-slate-500">
                  <div className="font-semibold">Google Mapa</div>
                  <div className="text-sm">Lokacija salona</div>
                </div>
              )}
            </div>
          </MotionDiv>
        </div>
      </div>
    </div>
  )
}