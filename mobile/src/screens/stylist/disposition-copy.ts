export type DispositionAction =
  | 'reorder'
  | 'cancel_as_client'
  | 'cancel_as_stylist'
  | 'no_show';

export const DISPOSITION_ACTION_LABELS: Record<DispositionAction, string> = {
  reorder: 'Pomjeri termin',
  cancel_as_stylist: 'Otkaži u ime salona',
  cancel_as_client: 'Otkaži u ime klijenta',
  no_show: 'Označi no-show',
};

export const DISPOSITION_ACTION_HINTS: Record<DispositionAction, string> = {
  reorder:
    'Novi datum i vrijeme se odmah primjenjuju. Klijent dobija obavijest; ne mora potvrđivati.',
  cancel_as_stylist:
    'Termin se otkazuje u ime salona. Klijent dobija obavijest. Nema kazne.',
  cancel_as_client:
    'Termin se otkazuje u ime klijenta. Klijent dobija obavijest i kaznu.',
  no_show: 'Klijent se nije pojavio. Dobija obavijest i kaznu.',
};

export const DISPOSITION_PANEL_TITLE = 'Termin se nije desio / treba drugi slot';
export const DISPOSITION_PANEL_HINT =
  'Naplata je gore: Završi zapis. Ove akcije su izuzeci — otkaz, no-show ili pomjeranje.';

export const DISPOSITION_ACTION_KEYS = Object.keys(
  DISPOSITION_ACTION_LABELS,
) as DispositionAction[];
