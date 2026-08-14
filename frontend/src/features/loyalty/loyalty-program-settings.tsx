import { useCallback, useEffect, useState } from 'react'
import api from '../../api/client'
import { Button } from '../../components/ui/button'
import { Card } from '../../components/ui/card'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { useAppToast } from '../../lib/toast/useAppToast'

type SettingRow = { key: string; value: string | null }
type ServiceOpt = { id: string; name: string }
type Tier = { id: string; name: string; minPoints: number }

const put = (key: string, value: string, description: string) =>
  api.put(`/api/settings/${key}`, { value, description })

export function LoyaltyProgramSettings() {
  const { success, error } = useAppToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [enabled, setEnabled] = useState(false)
  const [pointsPer, setPointsPer] = useState('1')
  const [earnTip, setEarnTip] = useState(false)
  const [minAmount, setMinAmount] = useState('0')
  const [redeemOn, setRedeemOn] = useState(false)
  const [redeemRate, setRedeemRate] = useState('0.1')
  const [minRedeem, setMinRedeem] = useState('0')
  const [maxPct, setMaxPct] = useState('100')
  const [excluded, setExcluded] = useState<string[]>([])
  const [services, setServices] = useState<ServiceOpt[]>([])
  const [tiers, setTiers] = useState<Tier[]>([])

  const load = useCallback(() => {
    setLoading(true)
    Promise.all([
      api.get<SettingRow[]>('/api/loyalty/settings'),
      api.get<ServiceOpt[] | { items: ServiceOpt[] }>('/api/services'),
    ])
      .then(([setRes, svcRes]) => {
        const map = new Map((Array.isArray(setRes.data) ? setRes.data : []).map((s) => [s.key, s.value ?? '']))
        setEnabled(map.get('loyalty_enabled') === 'true')
        setPointsPer(map.get('loyalty_points_per_currency') || '1')
        setEarnTip(map.get('loyalty_earn_on_tip') === 'true')
        setMinAmount(map.get('loyalty_min_amount_for_earn') || '0')
        setRedeemOn(map.get('loyalty_redeem_enabled') === 'true')
        setRedeemRate(map.get('loyalty_redeem_rate') || '0.1')
        setMinRedeem(map.get('loyalty_min_points_to_redeem') || '0')
        setMaxPct(map.get('loyalty_max_discount_percent') || '100')
        try {
          const ex = JSON.parse(map.get('loyalty_excluded_services') || '[]') as unknown
          setExcluded(Array.isArray(ex) ? ex.filter((x) => typeof x === 'string') : [])
        } catch {
          setExcluded([])
        }
        try {
          const raw = JSON.parse(map.get('loyalty_tiers') || '[]') as Tier[]
          setTiers(Array.isArray(raw) ? raw : [])
        } catch {
          setTiers([])
        }
        const rawSvc = svcRes.data
        const list = Array.isArray(rawSvc) ? rawSvc : rawSvc.items
        setServices(Array.isArray(list) ? list : [])
      })
      .catch(() => error('Greška pri učitavanju loyalty postavki'))
      .finally(() => setLoading(false))
  }, [error])

  useEffect(() => {
    load()
  }, [load])

  const save = async () => {
    setSaving(true)
    try {
      await Promise.all([
        put('loyalty_enabled', enabled ? 'true' : 'false', 'Loyalty uključen'),
        put('loyalty_points_per_currency', pointsPer, 'Bodovi po KM'),
        put('loyalty_earn_on_tip', earnTip ? 'true' : 'false', 'Bodovi na napojnicu'),
        put('loyalty_min_amount_for_earn', minAmount, 'Min iznos'),
        put('loyalty_redeem_enabled', redeemOn ? 'true' : 'false', 'Redeem'),
        put('loyalty_redeem_rate', redeemRate, 'Vrijednost boda'),
        put('loyalty_min_points_to_redeem', minRedeem, 'Min bodova'),
        put('loyalty_max_discount_percent', maxPct, 'Max %'),
        put('loyalty_excluded_services', JSON.stringify(excluded), 'Isključene usluge'),
        put('loyalty_tiers', JSON.stringify(tiers), 'Tierovi'),
      ])
      success('Loyalty pravila sačuvana')
    } catch {
      error('Greška pri čuvanju')
    } finally {
      setSaving(false)
    }
  }

  const toggleExcluded = (id: string) => {
    setExcluded((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  if (loading) return <p className="text-sm text-slate-500">Učitavanje pravila...</p>

  return (
    <Card className="mb-6 p-6 space-y-4">
      <div className="flex items-center justify-between">
        <Label>Program uključen</Label>
        <Switch checked={enabled} onCheckedChange={setEnabled} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Bodovi po 1 KM</Label>
          <Input type="number" value={pointsPer} onChange={(e) => setPointsPer(e.target.value)} />
        </div>
        <div>
          <Label>Min. iznos za bodove (KM)</Label>
          <Input type="number" value={minAmount} onChange={(e) => setMinAmount(e.target.value)} />
        </div>
        <div>
          <Label>KM po 1 bodu (redeem)</Label>
          <Input type="number" value={redeemRate} onChange={(e) => setRedeemRate(e.target.value)} />
        </div>
        <div>
          <Label>Min. bodova za redeem</Label>
          <Input type="number" value={minRedeem} onChange={(e) => setMinRedeem(e.target.value)} />
        </div>
        <div>
          <Label>Max % računa bodovima</Label>
          <Input type="number" value={maxPct} onChange={(e) => setMaxPct(e.target.value)} />
        </div>
      </div>
      <div className="flex items-center justify-between">
        <Label>Bodovi i na napojnicu</Label>
        <Switch checked={earnTip} onCheckedChange={setEarnTip} />
      </div>
      <div className="flex items-center justify-between">
        <Label>Redeem uključen</Label>
        <Switch checked={redeemOn} onCheckedChange={setRedeemOn} />
      </div>
      <div>
        <Label>Isključene usluge</Label>
        <div className="mt-2 max-h-40 space-y-1 overflow-auto rounded-md border border-slate-200 p-2 text-sm dark:border-slate-800">
          {services.map((s) => (
            <label key={s.id} className="flex items-center gap-2">
              <input type="checkbox" checked={excluded.includes(s.id)} onChange={() => toggleExcluded(s.id)} />
              {s.name}
            </label>
          ))}
        </div>
      </div>
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Nivoi (tier)</Label>
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={() => setTiers((t) => [...t, { id: `tier-${t.length + 1}`, name: '', minPoints: 0 }])}
          >
            Dodaj
          </Button>
        </div>
        <div className="space-y-2">
          {tiers.map((tier, idx) => (
            <div key={`${tier.id}-${idx}`} className="grid grid-cols-3 gap-2">
              <Input placeholder="id" value={tier.id} onChange={(e) => setTiers((t) => t.map((x, i) => (i === idx ? { ...x, id: e.target.value } : x)))} />
              <Input placeholder="ime" value={tier.name} onChange={(e) => setTiers((t) => t.map((x, i) => (i === idx ? { ...x, name: e.target.value } : x)))} />
              <Input
                type="number"
                placeholder="min bodova"
                value={String(tier.minPoints)}
                onChange={(e) => setTiers((t) => t.map((x, i) => (i === idx ? { ...x, minPoints: Number(e.target.value || 0) } : x)))}
              />
            </div>
          ))}
        </div>
      </div>
      <Button type="button" onClick={() => void save()} disabled={saving}>
        Sačuvaj pravila
      </Button>
    </Card>
  )
}
