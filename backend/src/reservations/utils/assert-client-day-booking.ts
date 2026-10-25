import { BadRequestException } from '@nestjs/common'
import type { Prisma } from '@prisma/client'
import {
  CLIENT_LIVE_STATUSES,
  CLIENT_SERVICE_DAY_STATUSES,
} from '../constants'
import {
  getDateOnlyDayBounds,
  toDateOnlyString,
} from '../../common/utils/date-only'
import { intervalsOverlap, timeToMinutes } from './time-slot.utils'

type AssertClientDayBookingInput = {
  prisma: Pick<Prisma.TransactionClient, 'reservation'>
  clientId: string
  reservationDate: Date | string
  startTime: string
  endTime: string
  serviceIds: string[]
  excludeReservationId?: string
}

type OtherRow = {
  status: string
  startTime: string
  endTime: string
  serviceId: string
  items: { serviceId: string; service: { name: string } | null }[]
}

const getReservationDayBounds = (value: Date | string) => {
  const dateOnly =
    typeof value === 'string' ? value : toDateOnlyString(value)
  return getDateOnlyDayBounds(dateOnly)
}

const collectServices = (
  row: OtherRow,
): { id: string; name: string }[] => {
  if (row.items.length > 0) {
    return row.items.map((item) => ({
      id: item.serviceId,
      name: item.service?.name ?? item.serviceId,
    }))
  }
  return [{ id: row.serviceId, name: row.serviceId }]
}

export const assertClientDayBookingAllowed = async (
  input: AssertClientDayBookingInput,
): Promise<void> => {
  let dayBounds: ReturnType<typeof getDateOnlyDayBounds>
  try {
    dayBounds = getReservationDayBounds(input.reservationDate)
  } catch {
    throw new BadRequestException('Datum rezervacije nije validan.')
  }
  const requested = new Set(input.serviceIds.filter(Boolean))
  const others = (await input.prisma.reservation.findMany({
    where: {
      clientId: input.clientId,
      reservationDate: { gte: dayBounds.gte, lt: dayBounds.lt },
      status: { in: [...CLIENT_SERVICE_DAY_STATUSES] },
      ...(input.excludeReservationId
        ? { id: { not: input.excludeReservationId } }
        : {}),
    },
    select: {
      status: true,
      startTime: true,
      endTime: true,
      serviceId: true,
      items: {
        select: { serviceId: true, service: { select: { name: true } } },
      },
    },
  })) as OtherRow[]
  const startMin = timeToMinutes(input.startTime)
  const endMin = timeToMinutes(input.endTime)
  const live = new Set<string>(CLIENT_LIVE_STATUSES)
  const overlap = others.find(
    (row) =>
      live.has(row.status) &&
      intervalsOverlap(
        startMin,
        endMin,
        timeToMinutes(row.startTime),
        timeToMinutes(row.endTime),
      ),
  )
  if (overlap) {
    throw new BadRequestException(
      `Već imate rezervaciju u tom periodu (${overlap.startTime}–${overlap.endTime}).`,
    )
  }
  for (const row of others) {
    const hit = collectServices(row).find((service) => requested.has(service.id))
    if (hit) {
      throw new BadRequestException(
        `Već imate rezervaciju za ${hit.name} na odabrani dan.`,
      )
    }
  }
}
