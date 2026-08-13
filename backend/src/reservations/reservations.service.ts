import { Injectable } from '@nestjs/common';
import { ReservationQueriesService } from './reservation-queries.service';
import { ReservationListService } from './reservation-list.service';
import { ReservationCreateService } from './reservation-create.service';
import { ReservationDirectCreateService } from './reservation-direct-create.service';
import { ReservationUpdateService } from './reservation-update.service';
import { ReservationClientActionsService } from './reservation-client-actions.service';
import { ReservationStaffAttendanceService } from './reservation-staff-attendance.service';
import { ReservationStylistLockService } from './reservation-stylist-lock.service';
import { ReservationStylistAcceptService } from './reservation-stylist-accept.service';
import { ReservationStylistRejectService } from './reservation-stylist-reject.service';
import { ReservationRuntimeService } from './reservation-runtime.service';
import { ReservationRuntimeCancelService } from './reservation-runtime-cancel.service';
import { ReservationRescheduleService } from './reservation-reschedule.service';
import { ReservationRescheduleCommitService } from './reservation-reschedule-commit.service';
import { ReservationRescheduleClientService } from './reservation-reschedule-client.service';
import { ReservationReorderService } from './reservation-reorder.service';
import { ReservationCronService } from './reservation-cron.service';
import { ReservationAttendanceCronService } from './reservation-attendance-cron.service';
import { ReservationDirectDailyLogCronService } from './reservation-direct-daily-log-cron.service';
import { ReservationInboxCronService } from './reservation-inbox-cron.service';
import { ReservationReorderCronService } from './reservation-reorder-cron.service';
import type { CreateReservationDto } from './dto/create-reservation.dto';
import type { AdminCreateReservationDto } from './dto/admin-create-reservation.dto';
import type { StylistDirectCreateReservationDto } from './dto/stylist-direct-create-reservation.dto';
import type { CancelReservationDto } from './dto/cancel-reservation.dto';
import type { StylistRejectDto } from './dto/stylist-respond.dto';
import type { StylistNoShowDto } from './dto/stylist-no-show.dto';
import type { UpdateReservationDto } from './dto/update-reservation.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import type { PublicReservationViewDto } from './dto/public-reservation-view.dto';
import type { RescheduleMode } from './reservation-reschedule.service';

@Injectable()
export class ReservationsService {
  constructor(
    private readonly queriesSvc: ReservationQueriesService,
    private readonly listSvc: ReservationListService,
    private readonly createSvc: ReservationCreateService,
    private readonly directCreateSvc: ReservationDirectCreateService,
    private readonly updateSvc: ReservationUpdateService,
    private readonly clientActionsSvc: ReservationClientActionsService,
    private readonly staffAttendanceSvc: ReservationStaffAttendanceService,
    private readonly stylistLockSvc: ReservationStylistLockService,
    private readonly stylistAcceptSvc: ReservationStylistAcceptService,
    private readonly stylistRejectSvc: ReservationStylistRejectService,
    private readonly runtimeSvc: ReservationRuntimeService,
    private readonly runtimeCancelSvc: ReservationRuntimeCancelService,
    private readonly rescheduleSvc: ReservationRescheduleService,
    private readonly rescheduleCommitSvc: ReservationRescheduleCommitService,
    private readonly rescheduleClientSvc: ReservationRescheduleClientService,
    private readonly reorderSvc: ReservationReorderService,
    private readonly cronSvc: ReservationCronService,
    private readonly attendanceCronSvc: ReservationAttendanceCronService,
    private readonly reorderCronSvc: ReservationReorderCronService,
    private readonly directDailyLogCronSvc: ReservationDirectDailyLogCronService,
    private readonly inboxCronSvc: ReservationInboxCronService,
  ) {}

  findPublicByViewToken(token: string): Promise<PublicReservationViewDto> {
    return this.queriesSvc.findPublicByViewToken(token);
  }

  findAll(
    query: {
      fromDate?: string;
      toDate?: string;
      status?: string;
      clientSearch?: string;
      asClient?: boolean;
      asStylist?: boolean;
      page?: number;
      pageSize?: number;
    },
    user: CurrentUserPayload,
  ) {
    return this.listSvc.findAll(query, user);
  }

  findOne(id: string, user: CurrentUserPayload) {
    return this.queriesSvc.findOne(id, user);
  }

  create(dto: CreateReservationDto, clientId: string) {
    return this.createSvc.create(dto, clientId);
  }

  createByAdmin(dto: AdminCreateReservationDto, userId: string) {
    if (dto.bookingMode === 'STAFF_ADMIN_DIRECT') {
      return this.directCreateSvc.createByAdmin(dto, userId);
    }
    return this.createSvc.createByAdmin(dto);
  }

  createByStylistDirect(dto: StylistDirectCreateReservationDto, userId: string) {
    return this.directCreateSvc.createByStylist(dto, userId);
  }

  updateByAdmin(reservationId: string, dto: UpdateReservationDto) {
    return this.updateSvc.updateByAdmin(reservationId, dto);
  }

  cancelByClient(id: string, clientId: string, dto?: CancelReservationDto) {
    return this.clientActionsSvc.cancelByClient(id, clientId, dto);
  }

  cancelByAdmin(id: string, dto?: CancelReservationDto) {
    return this.clientActionsSvc.cancelByAdmin(id, dto);
  }

  confirmAttendance(id: string, clientId: string) {
    return this.clientActionsSvc.confirmAttendance(id, clientId);
  }

  staffConfirmAttendance(id: string, user: CurrentUserPayload) {
    return this.staffAttendanceSvc.confirmAttendanceByStaff(id, user);
  }

  stylistLock(reservationId: string, stylistProfileId: string, userId: string) {
    return this.stylistLockSvc.stylistLock(reservationId, stylistProfileId, userId);
  }

  stylistUnlock(reservationId: string, stylistProfileId: string, userId: string) {
    return this.stylistLockSvc.stylistUnlock(reservationId, stylistProfileId, userId);
  }

  stylistAccept(reservationId: string, stylistProfileId: string, userId: string) {
    return this.stylistAcceptSvc.stylistAccept(reservationId, stylistProfileId, userId);
  }

  stylistReject(
    reservationId: string,
    stylistProfileId: string,
    userId: string,
    dto?: StylistRejectDto,
  ) {
    return this.stylistRejectSvc.stylistReject(reservationId, stylistProfileId, userId, dto);
  }

  stylistMarkComplete(reservationId: string, userId: string) {
    return this.runtimeSvc.stylistMarkComplete(reservationId, userId);
  }

  stylistStart(reservationId: string, userId: string) {
    return this.runtimeSvc.stylistStart(reservationId, userId);
  }

  setUseBreakAfterOverrun(reservationId: string, userId: string, useBreak: boolean) {
    return this.runtimeSvc.setUseBreakAfterOverrun(reservationId, userId, useBreak);
  }

  stylistCancel(reservationId: string, userId: string, dto: { cancelReason?: string }) {
    return this.runtimeCancelSvc.stylistCancel(reservationId, userId, dto);
  }

  stylistMarkNoShow(reservationId: string, userId: string, dto: StylistNoShowDto) {
    return this.runtimeCancelSvc.stylistMarkNoShow(reservationId, userId, dto);
  }

  proposeReschedule(
    reservationId: string,
    userId: string,
    opts: { includeBreaks: boolean; mode?: RescheduleMode; manualShiftMinutes?: number },
  ) {
    return this.rescheduleSvc.proposeReschedule(reservationId, userId, opts);
  }

  commitReschedule(
    reservationId: string,
    userId: string,
    opts: { includeBreaks: boolean; mode?: RescheduleMode; manualShiftMinutes?: number },
  ) {
    return this.rescheduleCommitSvc.commitReschedule(reservationId, userId, opts);
  }

  acceptReschedule(reservationId: string, userId: string) {
    return this.rescheduleClientSvc.acceptReschedule(reservationId, userId);
  }

  declineReschedule(reservationId: string, userId: string) {
    return this.rescheduleClientSvc.declineReschedule(reservationId, userId);
  }

  requestReorder(
    reservationId: string,
    userId: string,
    dto: { targetStartTime: string; targetEndTime: string },
  ) {
    return this.reorderSvc.requestReorder(reservationId, userId, dto);
  }

  processPendingRescheduleTimeouts() {
    return this.cronSvc.processPendingRescheduleTimeouts();
  }

  processAttendanceDeadlines() {
    return this.attendanceCronSvc.processAttendanceDeadlines();
  }

  processAutoReordersAfterAttendanceCancellations() {
    return this.reorderCronSvc.processAutoReordersAfterAttendanceCancellations();
  }

  autoStartUpcomingReservations() {
    return this.cronSvc.autoStartUpcomingReservations();
  }

  processDirectBookingDailyLogSeeds() {
    return this.directDailyLogCronSvc.processDirectBookingDailyLogSeeds();
  }

  processPendingDailyLogReminders() {
    return this.directDailyLogCronSvc.processPendingDailyLogReminders();
  }

  processExpiredLocks() {
    return this.inboxCronSvc.processExpiredLocks();
  }

  processInboxTimeouts() {
    return this.inboxCronSvc.processInboxTimeouts();
  }
}
