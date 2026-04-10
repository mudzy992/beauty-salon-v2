export interface PublicReservationViewDto {
  publicReferenceCode: string;
  reservationDate: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceName: string;
  stylistName: string | null;
  clientNotes: string | null;
  cancelReason: string | null;
  cancelledAt: string | null;
  rescheduleStatus: string | null;
  rescheduleProposedStartTime: string | null;
  rescheduleProposedEndTime: string | null;
}
