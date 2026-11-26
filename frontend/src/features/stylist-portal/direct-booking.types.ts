export type DirectBookingClient = {
  id: string
  username: string
  firstName: string | null
  lastName: string | null
  gender?: 'MALE' | 'FEMALE'
}

export type DirectBookingService = {
  id: string
  name: string
  durationMinutes?: number
  price?: number | string
  gender?: 'MALE' | 'FEMALE'
}
