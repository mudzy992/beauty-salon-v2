export type DispositionAction =
  | 'reorder'
  | 'cancel_as_client'
  | 'cancel_as_stylist'
  | 'no_show'

export const DISPOSITION_ACTION_KEYS: DispositionAction[] = [
  'reorder',
  'cancel_as_stylist',
  'cancel_as_client',
  'no_show',
]

export const DISPOSITION_ACTION_LABEL_KEYS: Record<DispositionAction, string> = {
  reorder: 'stylistWorkbook.disposition.actions.reorder.label',
  cancel_as_stylist: 'stylistWorkbook.disposition.actions.cancelAsStylist.label',
  cancel_as_client: 'stylistWorkbook.disposition.actions.cancelAsClient.label',
  no_show: 'stylistWorkbook.disposition.actions.noShow.label',
}

export const DISPOSITION_ACTION_HINT_KEYS: Record<DispositionAction, string> = {
  reorder: 'stylistWorkbook.disposition.actions.reorder.hint',
  cancel_as_stylist: 'stylistWorkbook.disposition.actions.cancelAsStylist.hint',
  cancel_as_client: 'stylistWorkbook.disposition.actions.cancelAsClient.hint',
  no_show: 'stylistWorkbook.disposition.actions.noShow.hint',
}

export const DISPOSITION_PANEL_TITLE_KEY = 'stylistWorkbook.disposition.title'
export const DISPOSITION_PANEL_HINT_KEY = 'stylistWorkbook.disposition.hint'
