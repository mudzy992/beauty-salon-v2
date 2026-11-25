import api from '../../api/client'

/**
 * Slanje privatnog para „prije/poslije" za završeni zapis usluge.
 *
 * Zahtjev je `multipart/form-data`; backend nikad ne objavljuje fotografije i
 * ne otvara saglasnost — to radi klijent, po svakoj fotografiji posebno.
 */
export const uploadWorkGalleryPair = async (
  serviceId: string,
  entryId: string,
  before: File,
  after: File,
): Promise<void> => {
  const form = new FormData()
  form.append('entryId', entryId)
  form.append('before', before)
  form.append('after', after)
  await api.post(`/api/services/admin/work-gallery/${encodeURIComponent(serviceId)}/private-pair`, form)
}
