import { BadRequestException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import {
  getDateOnlyDayBounds,
  toDateOnlyString,
} from '../../common/utils/date-only'
import { timeToMinutes } from './time-slot.utils'

type AssertAdminWorkingHoursInput = {
  prisma: Pick<
    Prisma.TransactionClient,
    | 'salonSettings'
    | 'holiday'
    | 'salonWorkingHours'
    | 'stylistWorkingHours'
  >
  reservationDate: Date
  startTime: string
  endTime: string
  confirmedStylistId: string | null
}

/** Ensure admin move/resize stays inside salon (+ stylist) working hours. */
export async function assertAdminSlotWithinWorkingHours(
  input: AssertAdminWorkingHoursInput,
): Promise<void> {
  const { prisma, reservationDate, startTime, endTime, confirmedStylistId } =
    input
  const salon = await prisma.salonSettings.findFirst()
  if (!salon) throw new BadRequestException('Salon nije konfigurisan.')

  const dateStr = toDateOnlyString(reservationDate)
  const dayOfWeek = reservationDate.getUTCDay()
  const startMin = timeToMinutes(startTime)
  const endMin = timeToMinutes(endTime)

  const { gte, lt } = getDateOnlyDayBounds(dateStr)
  const holiday = await prisma.holiday.findFirst({
    where: {
      salonSettingsId: salon.id,
      date: { gte, lt },
    },
    select: { id: true, name: true },
  })
  if (holiday) {
    throw new BadRequestException(
      `Termin pada na praznik${holiday.name ? ` (${holiday.name})` : ''}.`,
    )
  }

  const salonHours = await prisma.salonWorkingHours.findUnique({
    where: {
      salonSettingsId_dayOfWeek: {
        salonSettingsId: salon.id,
        dayOfWeek,
      },
    },
  })
  if (!salonHours || !salonHours.isWorkingDay) {
    throw new BadRequestException('Salon ne radi na odabrani dan.')
  }
  const salonOpen = timeToMinutes(salonHours.openTime)
  const salonClose = timeToMinutes(salonHours.closeTime)
  if (startMin < salonOpen || endMin > salonClose) {
    throw new BadRequestException(
      `Termin mora biti unutar radnog vremena salona (${salonHours.openTime}–${salonHours.closeTime}).`,
    )
  }

  if (!confirmedStylistId) return

  const stylistHours = await prisma.stylistWorkingHours.findMany({
    where: {
      stylistProfileId: confirmedStylistId,
      isWorkingDay: true,
    },
  })
  const override = stylistHours.find(
    (wh) =>
      wh.dateOverride && toDateOnlyString(wh.dateOverride) === dateStr,
  )
  const regular = stylistHours.find(
    (wh) => !wh.dateOverride && wh.dayOfWeek === dayOfWeek,
  )
  const match = override ?? regular
  if (!match) {
    throw new BadRequestException(
      'Potvrđeni stilist ne radi na odabrani dan.',
    )
  }
  const stylistOpen = timeToMinutes(match.startTime)
  const stylistClose = timeToMinutes(match.endTime)
  if (startMin < stylistOpen || endMin > stylistClose) {
    throw new BadRequestException(
      `Termin mora biti unutar radnog vremena stilista (${match.startTime}–${match.endTime}).`,
    )
  }
}
