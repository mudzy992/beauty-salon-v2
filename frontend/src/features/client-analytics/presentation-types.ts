export type DateFormatter = (value: string | null | undefined) => string
export type StylistFormatter = (stylist?: { user?: { firstName: string | null; lastName: string | null; username: string } }) => string
