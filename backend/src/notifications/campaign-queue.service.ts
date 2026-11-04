import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import type { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from './notifications.service';
import { RetryCampaignJobDto } from './dto/retry-campaign-job.dto';

const WORKER_LOCK_ID = 'global-campaign-email-sender';
const WORKER_LEASE_MS = 10 * 60 * 1000;
const AMBIGUOUS_DELIVERY_ERROR =
  'Delivery outcome unknown after worker lease expired; explicit retry confirmation required.';

type CampaignJob = Prisma.CampaignJob;

@Injectable()
export class CampaignQueueService {
  private readonly logger = new Logger(CampaignQueueService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  @Cron('*/1 * * * * *', { waitForCompletion: true })
  async processQueueTick(): Promise<void> {
    const workerId = randomUUID();
    const now = new Date();
    let nextAllowedAt = new Date(0);
    try {
      const lock = await this.prisma.campaignWorkerLock.updateMany({
        where: { id: WORKER_LOCK_ID, lockedUntil: { lte: now } },
        data: {
          lockedBy: workerId,
          lockedUntil: new Date(now.getTime() + WORKER_LEASE_MS),
        },
      });
      if (lock.count !== 1) return;

      await this.recoverExpiredRecipientClaims(now);
      await this.processOneRecipient(() => {
        nextAllowedAt = new Date(Date.now() + 1000);
      });
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'Error';
      this.logger.warn(`Campaign queue tick failed (${errorType}).`);
    } finally {
      try {
        await this.prisma.campaignWorkerLock.updateMany({
          where: { id: WORKER_LOCK_ID, lockedBy: workerId },
          data: {
            lockedBy: null,
            lockedUntil: new Date(
              Math.max(nextAllowedAt.getTime(), Date.now()),
            ),
          },
        });
      } catch {
        // The lease expires if the worker cannot release its lock.
      }
    }
  }

  async getJob(jobId: string) {
    const job = await this.prisma.campaignJob.findUnique({
      where: { id: jobId },
      include: {
        recipients: {
          orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
          select: {
            id: true,
            userId: true,
            username: true,
            status: true,
            attempts: true,
            lastError: true,
            deliveredAt: true,
          },
        },
        retryAudits: { select: { id: true } },
      },
    });
    if (!job) throw new NotFoundException('Campaign job nije pronađen.');

    const counts: Record<string, number> = {
      pending: 0,
      processing: 0,
      delivered: 0,
      skipped: 0,
      failed: 0,
      cancelled: 0,
    };
    for (const recipient of job.recipients) {
      const key = recipient.status.toLowerCase();
      if (key in counts) counts[key] += 1;
    }
    return {
      id: job.id,
      templateId: job.templateId,
      templateName: job.templateName,
      campaignName: job.campaignName,
      subject: job.subject,
      status: job.status,
      totalRecipients: job.totalRecipients,
      counts,
      retryCount: job.retryAudits.length,
      createdAt: job.createdAt,
      startedAt: job.startedAt,
      completedAt: job.completedAt,
      cancelledAt: job.cancelledAt,
      recipients: job.recipients,
    };
  }

  async cancelJob(jobId: string) {
    await this.prisma.$transaction(async (tx) => {
      const job = await tx.campaignJob.findUnique({
        where: { id: jobId },
        select: { id: true, status: true },
      });
      if (!job) throw new NotFoundException('Campaign job nije pronađen.');
      if (!['QUEUED', 'RUNNING'].includes(job.status)) {
        throw new ConflictException('Campaign job više nije moguće otkazati.');
      }

      const now = new Date();
      const cancelled = await tx.campaignJob.updateMany({
        where: { id: jobId, status: { in: ['QUEUED', 'RUNNING'] } },
        data: { status: 'CANCELLED', cancelledAt: now },
      });
      if (cancelled.count !== 1) {
        throw new ConflictException('Campaign job više nije moguće otkazati.');
      }
      await tx.campaignRecipient.updateMany({
        where: { jobId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
    });
    return { ok: true, ...(await this.getJob(jobId)) };
  }

  async retryFailedRecipients(
    jobId: string,
    actorUserId: string,
    dto: RetryCampaignJobDto,
  ) {
    if (!dto.confirmAtLeastOnce) {
      throw new ConflictException(
        'Retry može ponoviti isporuku ako je prethodni SMTP rezultat bio neizvjestan; eksplicitna potvrda je obavezna.',
      );
    }

    try {
      await this.prisma.$transaction(async (tx) => {
        const existing = await tx.campaignJobRetryAudit.findUnique({
          where: { jobId_requestId: { jobId, requestId: dto.requestId } },
        });
        if (existing) return;

        const job = await tx.campaignJob.findUnique({
          where: { id: jobId },
          select: { id: true, status: true },
        });
        if (!job) throw new NotFoundException('Campaign job nije pronađen.');
        if (!['PARTIAL', 'FAILED', 'CANCELLED'].includes(job.status)) {
          throw new ConflictException(
            'Retry je dozvoljen tek nakon završetka ili otkazivanja kampanje.',
          );
        }

        const reset = await tx.campaignRecipient.updateMany({
          where: { jobId, status: 'FAILED' },
          data: { status: 'PENDING', attemptedAt: null, lastError: null },
        });
        if (reset.count === 0) {
          throw new ConflictException(
            'Nema neuspjelih primalaca za ponovni pokušaj.',
          );
        }
        await tx.campaignJobRetryAudit.create({
          data: {
            jobId,
            requestedByUserId: actorUserId,
            requestId: dto.requestId,
            confirmedAtLeastOnce: true,
            affectedRecipients: reset.count,
          },
        });
        await tx.campaignJob.update({
          where: { id: jobId },
          data: {
            status: 'QUEUED',
            completedAt: null,
            cancelledAt: null,
          },
        });
      });
    } catch (error) {
      const existing = await this.prisma.campaignJobRetryAudit.findUnique({
        where: { jobId_requestId: { jobId, requestId: dto.requestId } },
      });
      if (!existing) throw error;
    }
    return { ok: true, ...(await this.getJob(jobId)) };
  }

  private async processOneRecipient(
    onDeliveryAttempt: () => void,
  ): Promise<void> {
    const job = await this.prisma.campaignJob.findFirst({
      where: { status: { in: ['QUEUED', 'RUNNING'] } },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (!job) return;

    const now = new Date();
    await this.prisma.campaignJob.updateMany({
      where: { id: job.id, status: 'QUEUED' },
      data: { status: 'RUNNING', startedAt: now },
    });

    const recipient = await this.prisma.campaignRecipient.findFirst({
      where: { jobId: job.id, status: 'PENDING' },
      orderBy: [{ createdAt: 'asc' }, { id: 'asc' }],
    });
    if (!recipient) {
      await this.finalizeJob(job.id);
      return;
    }
    const claimed = await this.prisma.campaignRecipient.updateMany({
      where: { id: recipient.id, status: 'PENDING' },
      data: {
        status: 'PROCESSING',
        attempts: { increment: 1 },
        attemptedAt: now,
      },
    });
    if (claimed.count !== 1) return;

    const currentJob = await this.prisma.campaignJob.findUnique({
      where: { id: job.id },
      select: { status: true },
    });
    if (currentJob?.status === 'CANCELLED') {
      await this.finishRecipient(recipient.id, 'CANCELLED');
      await this.finalizeJob(job.id);
      return;
    }

    try {
      const eligible = await this.prisma.user.findFirst({
        where: {
          id: recipient.userId,
          email: recipient.email,
          isEmailVerified: true,
          campaignEmailConsent: {
            is: { optedIn: true, consentedAt: { not: null } },
          },
        },
        select: { id: true },
      });
      if (!eligible) {
        await this.finishRecipient(
          recipient.id,
          'SKIPPED',
          'Eligibility changed after the campaign snapshot.',
        );
      } else {
        onDeliveryAttempt();
        await this.notifications.deliverCampaignRecipient(job, recipient);
        await this.finishRecipient(recipient.id, 'DELIVERED');
      }
    } catch (error) {
      const errorType = error instanceof Error ? error.name : 'Error';
      await this.finishRecipient(
        recipient.id,
        'FAILED',
        `Delivery failed (${errorType}).`,
      );
      this.logger.warn(
        `Campaign recipient ${recipient.id} failed (${errorType}, attempt ${recipient.attempts + 1}).`,
      );
    }
    await this.finalizeJob(job.id);
  }

  private async finishRecipient(
    recipientId: string,
    status: 'DELIVERED' | 'SKIPPED' | 'FAILED' | 'CANCELLED',
    lastError: string | null = null,
  ): Promise<void> {
    await this.prisma.campaignRecipient.updateMany({
      where: { id: recipientId, status: 'PROCESSING' },
      data: {
        status,
        lastError,
        ...(status === 'DELIVERED' ? { deliveredAt: new Date() } : {}),
      },
    });
  }

  private async finalizeJob(jobId: string): Promise<void> {
    const [job, grouped] = await Promise.all([
      this.prisma.campaignJob.findUnique({
        where: { id: jobId },
        select: { id: true, status: true, totalRecipients: true },
      }),
      this.prisma.campaignRecipient.groupBy({
        by: ['status'],
        where: { jobId },
        _count: { _all: true },
      }),
    ]);
    if (!job || job.status === 'CANCELLED') return;

    const counts = new Map(grouped.map((row) => [row.status, row._count._all]));
    const pending = counts.get('PENDING') || 0;
    const processing = counts.get('PROCESSING') || 0;
    if (pending || processing) return;

    const failed = counts.get('FAILED') || 0;
    const delivered = counts.get('DELIVERED') || 0;
    const skipped = counts.get('SKIPPED') || 0;
    const cancelled = counts.get('CANCELLED') || 0;
    const status =
      cancelled === job.totalRecipients
        ? 'CANCELLED'
        : failed > 0
          ? delivered + skipped > 0
            ? 'PARTIAL'
            : 'FAILED'
          : cancelled > 0
            ? 'PARTIAL'
            : 'COMPLETED';
    await this.prisma.campaignJob.updateMany({
      where: { id: jobId, status: { in: ['QUEUED', 'RUNNING'] } },
      data: { status, completedAt: new Date() },
    });
  }

  private async recoverExpiredRecipientClaims(now: Date): Promise<void> {
    const expiredBefore = new Date(now.getTime() - WORKER_LEASE_MS);
    await this.prisma.campaignRecipient.updateMany({
      where: {
        status: 'PROCESSING',
        attemptedAt: { lt: expiredBefore },
      },
      data: {
        status: 'FAILED',
        lastError: AMBIGUOUS_DELIVERY_ERROR,
      },
    });
  }
}
