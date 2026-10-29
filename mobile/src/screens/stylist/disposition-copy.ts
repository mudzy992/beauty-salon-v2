export type DispositionAction =
  | 'reorder'
  | 'cancel_as_client'
  | 'cancel_as_stylist'
  | 'no_show';

export const DISPOSITION_ACTION_LABEL_KEYS: Record<DispositionAction, string> = {
  reorder: 'stylist.dailyLogDetail.dispositionActionReorderLabel',
  cancel_as_stylist: 'stylist.dailyLogDetail.dispositionActionCancelStylistLabel',
  cancel_as_client: 'stylist.dailyLogDetail.dispositionActionCancelClientLabel',
  no_show: 'stylist.dailyLogDetail.dispositionActionNoShowLabel',
};

export const DISPOSITION_ACTION_HINT_KEYS: Record<DispositionAction, string> = {
  reorder: 'stylist.dailyLogDetail.dispositionActionReorderHint',
  cancel_as_stylist: 'stylist.dailyLogDetail.dispositionActionCancelStylistHint',
  cancel_as_client: 'stylist.dailyLogDetail.dispositionActionCancelClientHint',
  no_show: 'stylist.dailyLogDetail.dispositionActionNoShowHint',
};

export const DISPOSITION_PANEL_TITLE = 'Termin se nije desio / treba drugi slot';
export const DISPOSITION_PANEL_HINT =
  'Naplata je gore: Završi zapis. Ove akcije su izuzeci — otkaz, no-show ili pomjeranje.';

export const DISPOSITION_ACTION_KEYS = Object.keys(
  DISPOSITION_ACTION_LABEL_KEYS,
) as DispositionAction[];
