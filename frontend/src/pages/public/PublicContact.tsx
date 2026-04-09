import { useState, FormEvent } from 'react'
import { motion } from 'framer-motion'

import { Card, CardContent } from '../../components/ui/card'
import { Button } from '../../components/ui/button'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Textarea } from '../../components/ui/textarea'
import { useAppToast } from '../../lib/toast/useAppToast'
import { useSettings } from '../../context/SettingsContext'

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
    <div className="bg-slate-50 min-h-screen pt-10 pb-20">
      <div className="bg-slate-950 text-white py-16 mb-12 text-center relative overflow-hidden">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30"
          style={{
            backgroundImage: `url('${getSetting(
              'public_contact_bg',
              'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?auto=format&fit=crop&q=80&w=2000',
            )}')`,
          }}
        />
        <div className="mx-auto max-w-5xl px-4 relative z-10">
          <div className="text-4xl font-semibold mb-4">
            {getSetting('public_contact_title', 'Kontaktirajte Nas')}
          </div>
          <div className="text-lg text-slate-200">
            {getSetting(
              'public_contact_subtitle',
              'Tu smo za sva vaša pitanja. Javite nam se ili nas posjetite u salonu.',
            )}
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-6xl px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          <MotionDiv
            initial={{ opacity: 0, x: -50 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardContent className="p-8">
                <div className="text-xl font-semibold text-slate-900 mb-6">
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
              <Card>
                <CardContent className="p-8">
                  <div className="text-base font-semibold text-slate-900 mb-4">
                    Informacije
                  </div>
                  <div className="space-y-4 text-slate-700">
                    <div>
                      <div className="text-sm font-semibold text-brand-gold">
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
                      <div className="text-sm font-semibold text-brand-gold">
                        Telefon
                      </div>
                      <div>
                        {getSetting('public_contact_phone', '+387 61 234 567')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-brand-gold">
                        Email
                      </div>
                      <div>
                        {getSetting('public_contact_email', 'info@salon.ba')}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-brand-gold">
                        Radno Vrijeme
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
                <div className="rounded-2xl overflow-hidden shadow-sm h-[300px] bg-white border border-slate-200">
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