import { BadRequestException } from '@nestjs/common';
import { validate } from 'class-validator';
import { CreateReservationDto } from '../dto/create-reservation.dto';
import { AdminCreateReservationDto } from '../dto/admin-create-reservation.dto';
import { StylistDirectCreateReservationDto } from '../dto/stylist-direct-create-reservation.dto';
import {
  MAX_RESERVATION_SERVICE_ITEMS,
  normalizeReservationServiceIds,
  parseAvailabilityServiceIds,
} from './reservation-service-limits';

describe('reservation service item limits', () => {
  it('accepts at most ten unique service IDs and rejects oversized raw selections', () => {
    const ids = Array.from(
      { length: MAX_RESERVATION_SERVICE_ITEMS },
      (_, index) => `service-${index}`,
    );
    expect(normalizeReservationServiceIds(ids)).toEqual(ids);
    expect(() => normalizeReservationServiceIds([...ids, 'service-0'])).toThrow(
      BadRequestException,
    );
  });

  it('bounds availability query lists before de-duplicating them', () => {
    const repeated = Array(MAX_RESERVATION_SERVICE_ITEMS + 1).fill('service-1');
    expect(() =>
      parseAvailabilityServiceIds(repeated.join(','), undefined),
    ).toThrow(BadRequestException);
    expect(
      parseAvailabilityServiceIds('service-1, service-2', undefined),
    ).toEqual(['service-1', 'service-2']);
    expect(parseAvailabilityServiceIds(undefined, 'service-legacy')).toBe(
      'service-legacy',
    );
  });

  it.each([
    ['client create', CreateReservationDto],
    ['admin create', AdminCreateReservationDto],
    ['stylist direct create', StylistDirectCreateReservationDto],
  ])('validates the service-count ceiling for %s DTOs', async (_name, Dto) => {
    const dto = Object.assign(new Dto(), {
      clientId: '76ecde81-d21c-4b11-9624-f5d24f3bf3f0',
      bookingMode: 'STANDARD',
      reservationDate: '2026-11-10',
      startTime: '09:00',
      endTime: '10:00',
      serviceIds: Array.from(
        { length: MAX_RESERVATION_SERVICE_ITEMS + 1 },
        (_, index) =>
          `76ecde81-d21c-4b11-9624-f5d24f3bf${String(index).padStart(3, '0')}`,
      ),
    });
    const errors = await validate(dto);
    const serviceIdsError = errors.find(
      (error) => error.property === 'serviceIds',
    );

    expect(serviceIdsError?.constraints).toHaveProperty('arrayMaxSize');
  });
});
