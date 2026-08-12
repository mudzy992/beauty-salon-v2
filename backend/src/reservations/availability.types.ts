export interface AvailableSlotDto {
  startTime: string;
  endTime: string;
  availableStylistCount: number;
}

export interface AvailableDateDto {
  date: string; // YYYY-MM-DD
  available: boolean;
}
