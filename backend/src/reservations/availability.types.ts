export interface AvailableSlotDto {
  startTime: string;
  endTime: string;
  availableStylistCount: number;
  holdState?: 'none' | 'pending_hold';
}

export interface AvailableDateDto {
  date: string; // YYYY-MM-DD
  available: boolean;
}
