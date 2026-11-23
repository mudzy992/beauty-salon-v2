import type { Dispatch, SetStateAction } from 'react'
import { useTranslation } from 'react-i18next'
import { Loader2, X } from 'lucide-react'
import { Badge } from '../../components/ui/badge'
import { Button } from '../../components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '../../components/ui/dialog'
import { Input } from '../../components/ui/input'
import { Label } from '../../components/ui/label'
import { Switch } from '../../components/ui/switch'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../components/ui/tabs'
import { Textarea } from '../../components/ui/textarea'
import { StylistWorkingHours } from './stylist-working-hours'
import { ErrorState } from '../shell/admin/ui/data-state'
import type { ServiceOption, StylistProfile, WorkingHours } from './stylist-types'

type Form = { bio: string; specialization: string; isActive: boolean; hireDate: string }
type Props = {
  open: boolean; setOpen: (open: boolean) => void; selectedStylist: StylistProfile | null
  editorState: 'loading' | 'error' | 'ready'; editorErrorKey: string; retryEditor: () => void; onCloseAutoFocus: (event: Event) => void
  form: Form; setForm: Dispatch<SetStateAction<Form>>; workingHours: WorkingHours[]
  updateWH: (day: number, field: keyof WorkingHours, value: string | boolean) => void
  selectedServices: ServiceOption[]; unselectedServices: ServiceOption[]; allServices: ServiceOption[]
  stylistServiceIds: string[]; toggleService: (id: string) => void; saving: boolean; onSave: () => void
}
export function StylistEditorDialog({ open, setOpen, selectedStylist, editorState, editorErrorKey, retryEditor, onCloseAutoFocus, form, setForm, workingHours, updateWH, selectedServices, unselectedServices, allServices, stylistServiceIds, toggleService, saving, onSave }: Props) {
  const { t } = useTranslation()
  const competencyName = (service: ServiceOption) => {
    const matches = allServices.filter(candidate => candidate.name === service.name)
    return matches.length > 1 ? `${service.name} (${matches.findIndex(candidate => candidate.id === service.id) + 1})` : service.name
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent className="max-w-3xl" onCloseAutoFocus={onCloseAutoFocus}>
        <DialogHeader>
          <DialogTitle>
            {t('stylists.profileTitle')}{' '}
            {selectedStylist && String(selectedStylist.status ?? '').toUpperCase() === 'PENDING' ? (
              <Badge variant="warning" className="ml-2 align-middle text-[10px]">
                {t('stylists.status.pending')}
              </Badge>
            ) : null}
          </DialogTitle>
        </DialogHeader>

        {editorState === 'loading' ? <div role="status" className="flex justify-center p-6"><span className="sr-only">{t('common.loading')}</span><Loader2 className="h-8 w-8 animate-spin motion-reduce:animate-none" aria-hidden="true" /></div> : null}
        {editorState === 'error' ? <ErrorState description={t(editorErrorKey)} onRetry={retryEditor} /> : null}
        {editorState === 'ready' ? <Tabs defaultValue="profile">
          <TabsList className="h-auto w-full flex-wrap justify-start gap-1 p-2">
            <TabsTrigger value="profile">{t('stylists.tabs.profile')}</TabsTrigger>
            <TabsTrigger value="hours">{t('stylists.tabs.hours')}</TabsTrigger>
            <TabsTrigger value="skills">{t('stylists.tabs.competencies')}</TabsTrigger>
          </TabsList>

          <TabsContent value="profile" className="mt-4">
            <div className="space-y-4">
              <div>
                <Label htmlFor="stylists-specialization-auto">{t('stylists.specializationAuto')}</Label>
                <Input id="stylists-specialization-auto" className="mt-1" value={form.specialization} readOnly />
                <p className="mt-1 text-xs text-content-strong">
                  {t('stylists.specializationHint')}
                </p>
                {selectedServices.length > 0 ? (
                  <div className="mt-3">
                    <p className="mb-1 text-xs text-content-strong ">{t('stylists.selectedCompetencies')}</p>
                    <div className="flex flex-wrap gap-2">
                      {selectedServices.map((svc) => (
                        <Badge key={svc.id} variant="brand" className="text-[10px]">
                          {svc.name}
                        </Badge>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>

              <div>
                <Label htmlFor="stylists-bio">{t('stylists.bio')}</Label>
                <Textarea id="stylists-bio" className="mt-1" value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} rows={3} />
              </div>

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <Label htmlFor="stylists-hire-date">{t('stylists.hireDate')}</Label>
                  <Input id="stylists-hire-date" className="mt-1" type="date" value={form.hireDate} onChange={(e) => setForm({ ...form, hireDate: e.target.value })} />
                </div>
                <div className="flex items-center justify-between gap-3 md:pt-7">
                  <Label className="mb-0">{t('common.active')}</Label>
                  <Switch aria-label={t('stylists.aria.activeToggle')} checked={form.isActive} onCheckedChange={(checked) => setForm({ ...form, isActive: checked })} />
                </div>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="hours" className="mt-4">
            <StylistWorkingHours workingHours={workingHours} updateWH={updateWH} />
          </TabsContent>

          <TabsContent value="skills" className="mt-4">
            <div className="space-y-4">
              <div>
                <p className="mb-1 text-xs text-content-strong ">{t('stylists.selectedCompetencies')} ({t('stylists.removeCompetencyHint')})</p>
                {selectedServices.length === 0 ? (
                  <p className="text-sm text-content-strong">{t('stylists.noSelectedCompetencies')}</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {selectedServices.map((svc) => (
                      <Badge key={svc.id} variant="secondary" className="gap-1 px-2 py-1 text-[11px] font-medium">
                        <span>{svc.name}</span>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => toggleService(svc.id)}
                          className="h-5 w-5 rounded-full hover:bg-surface-sunken"
                          aria-label={t('stylists.aria.removeCompetency', { name: competencyName(svc) })}
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </Button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <p className="mb-1 text-xs text-content-strong ">{t('stylists.availableCompetencies')}</p>
                {unselectedServices.length === 0 ? (
                  <p className="text-sm text-content-strong">{t('stylists.allCompetenciesSelected')}</p>
                ) : (
                  <div className="max-h-[320px] space-y-2 overflow-y-auto">
                    {unselectedServices.map((svc) => (
                      <label
                        key={svc.id}
                        className="flex cursor-pointer items-start gap-3 rounded-md border border-line p-3 hover:bg-surface-muted"
                      >
                        <input
                          type="checkbox"
                          checked={stylistServiceIds.includes(svc.id)}
                          onChange={() => toggleService(svc.id)}
                          className="mt-0.5 h-4 w-4 accent-brand-gold-ring"
                        />
                        <span className="text-sm">
                          <span className="font-medium text-content">{svc.name}</span>
                          {svc.subcategory ? (
                            <span className="ml-1 text-content-strong">
                              ({svc.subcategory.category?.name} &gt; {svc.subcategory.name})
                            </span>
                          ) : null}
                        </span>
                      </label>
                    ))}
                  </div>
                )}
                {allServices.length === 0 ? <p className="text-sm text-content-strong">{t('stylists.noServicesAvailable')}</p> : null}
              </div>
            </div>
          </TabsContent>
        </Tabs> : null}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" onClick={onSave} disabled={saving || editorState !== 'ready'}>
            {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            {saving ? t('common.saving') : t('common.save')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
