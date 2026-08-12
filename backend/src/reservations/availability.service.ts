import { Injectable } from '@nestjs/common';
import { AvailabilityDatesService } from './availability-dates.service';
import { AvailabilitySlotsService } from './availability-slots.service';
import { AvailabilityDebugService } from './availability-debug.service';
import type { AvailableDateDto, AvailableSlotDto } from './availability.types';

export { AvailableSlotDto, AvailableDateDto } from './availability.types';

@Injectable()
export class AvailabilityService {
  constructor(
    private readonly datesService: AvailabilityDatesService,
    private readonly slotsService: AvailabilitySlotsService,
    private readonly debugService: AvailabilityDebugService,
  ) {}

  getAvailableDates(
    serviceIdsInput: string[] | string,
    fromDate: Date,
    toDate?: Date,
  ): Promise<AvailableDateDto[]> {
    return this.datesService.getAvailableDates(serviceIdsInput, fromDate, toDate);
  }

  getAvailableSlots(
    serviceIdsInput: string[] | string,
    dateStr: string,
  ): Promise<AvailableSlotDto[]> {
    return this.slotsService.getAvailableSlots(serviceIdsInput, dateStr);
  }

  debugAvailability(serviceId: string) {
    return this.debugService.debugAvailability(serviceId);
  }
}
