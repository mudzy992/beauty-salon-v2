import { BadRequestException } from '@nestjs/common';

export const MAX_RESERVATION_SERVICE_ITEMS = 10;

export function assertReservationServiceItemLimit(
  serviceIds: readonly unknown[],
): void {
  if (serviceIds.length > MAX_RESERVATION_SERVICE_ITEMS) {
    throw new BadRequestException(
      `Rezervacija može sadržavati najviše ${MAX_RESERVATION_SERVICE_ITEMS} usluga.`,
    );
  }
}

export function normalizeReservationServiceIds(
  input: string[] | string,
): string[] {
  const rawServiceIds = Array.isArray(input) ? input : [input];
  assertReservationServiceItemLimit(rawServiceIds);
  return [
    ...new Set(
      rawServiceIds.map((serviceId) => serviceId.trim()).filter(Boolean),
    ),
  ];
}

export function parseAvailabilityServiceIds(
  serviceIds: string | undefined,
  serviceId: string | undefined,
): string[] | string {
  if (serviceIds == null || serviceIds === '') return serviceId ?? '';

  const parsedIds = serviceIds.split(',');
  assertReservationServiceItemLimit(parsedIds);
  const normalizedIds = normalizeReservationServiceIds(parsedIds);
  return normalizedIds.length > 0 ? normalizedIds : (serviceId ?? '');
}
