import { CampaignQueueService } from './campaign-queue.service';

describe('CampaignQueueService', () => {
  const job = {
    id: 'job-1',
    templateId: 'template-1',
    templateName: 'Campaign',
    subject: 'Hello',
    templateHtml: '<p>Hello</p>',
    appUrl: 'https://example.test',
    campaignName: 'Campaign',
    tags: ['marketing'],
    createInAppNotification: false,
    requestedByUserId: 'admin-1',
    idempotencyKey: 'request-1',
    status: 'QUEUED',
    totalRecipients: 2,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    createdAt: new Date('2026-11-04T12:00:00.000Z'),
    updatedAt: new Date('2026-11-04T12:00:00.000Z'),
  };
  const recipient = {
    id: 'recipient-1',
    jobId: 'job-1',
    userId: 'user-1',
    email: 'client@example.test',
    username: 'client',
    firstName: 'Client',
    lastName: 'One',
    consentId: 'consent-1',
    consentedAt: new Date('2026-11-04T11:00:00.000Z'),
    status: 'PENDING',
    attempts: 0,
    attemptedAt: null,
    deliveredAt: null,
    lastError: null,
    createdAt: new Date('2026-11-04T12:00:00.000Z'),
    updatedAt: new Date('2026-11-04T12:00:00.000Z'),
  };
  const tx = {
    campaignJob: {
      findUnique: jest.fn(),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
    campaignRecipient: { updateMany: jest.fn() },
    campaignJobRetryAudit: { findUnique: jest.fn(), create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
    campaignWorkerLock: { updateMany: jest.fn() },
    campaignRecipient: {
      updateMany: jest.fn(),
      findFirst: jest.fn(),
      groupBy: jest.fn(),
    },
    campaignJob: {
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      updateMany: jest.fn(),
    },
    campaignJobRetryAudit: { findUnique: jest.fn() },
    user: { findFirst: jest.fn() },
  };
  const notifications = { deliverCampaignRecipient: jest.fn() };
  let service: CampaignQueueService;

  beforeEach(() => {
    jest.clearAllMocks();
    prisma.campaignWorkerLock.updateMany
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.campaignJob.findFirst.mockResolvedValue(job);
    prisma.campaignJob.findUnique
      .mockResolvedValueOnce({ status: 'RUNNING' })
      .mockResolvedValueOnce({
        id: job.id,
        status: 'RUNNING',
        totalRecipients: 2,
      });
    prisma.campaignJob.updateMany.mockResolvedValue({ count: 1 });
    prisma.campaignRecipient.findFirst.mockResolvedValue(recipient);
    prisma.campaignRecipient.updateMany
      .mockResolvedValueOnce({ count: 0 })
      .mockResolvedValueOnce({ count: 1 })
      .mockResolvedValueOnce({ count: 1 });
    prisma.campaignRecipient.groupBy.mockResolvedValue([
      { status: 'DELIVERED', _count: { _all: 1 } },
      { status: 'PENDING', _count: { _all: 1 } },
    ]);
    prisma.user.findFirst.mockResolvedValue({ id: recipient.userId });
    notifications.deliverCampaignRecipient.mockResolvedValue(undefined);
    service = new CampaignQueueService(prisma as never, notifications as never);
  });

  it('claims and attempts at most one recipient per tick, with a one-second lock gap', async () => {
    await service.processQueueTick();

    expect(notifications.deliverCampaignRecipient).toHaveBeenCalledTimes(1);
    expect(prisma.campaignRecipient.updateMany).toHaveBeenNthCalledWith(
      2,
      expect.objectContaining({
        where: { id: recipient.id, status: 'PENDING' },
        data: expect.objectContaining({
          status: 'PROCESSING',
          attempts: { increment: 1 },
        }),
      }),
    );
    const releaseLock = prisma.campaignWorkerLock.updateMany.mock.calls[1]![0];
    expect(releaseLock.where.lockedBy).toEqual(expect.any(String));
    expect(releaseLock.data.lockedUntil.getTime()).toBeGreaterThan(Date.now());
    expect(prisma.campaignJob.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: job.id, status: 'QUEUED' },
        data: expect.objectContaining({ status: 'RUNNING' }),
      }),
    );
  });

  it('does not send if the global worker lock is already held', async () => {
    prisma.campaignWorkerLock.updateMany
      .mockReset()
      .mockResolvedValue({ count: 0 });

    await service.processQueueTick();

    expect(prisma.campaignJob.findFirst).not.toHaveBeenCalled();
    expect(notifications.deliverCampaignRecipient).not.toHaveBeenCalled();
  });

  it('requires and audits an explicit at-least-once retry request', async () => {
    await expect(
      service.retryFailedRecipients('job-1', 'admin-1', {
        confirmAtLeastOnce: false,
        requestId: 'f53a0cf4-f2f7-47a4-b997-bf61e51bf082',
      }),
    ).rejects.toThrow('eksplicitna potvrda je obavezna');
    expect(prisma.$transaction).not.toHaveBeenCalled();

    prisma.$transaction.mockImplementation((callback) => callback(tx));
    tx.campaignJobRetryAudit.findUnique.mockResolvedValue(null);
    tx.campaignJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'PARTIAL',
    });
    tx.campaignRecipient.updateMany.mockResolvedValue({ count: 1 });
    tx.campaignJobRetryAudit.create.mockResolvedValue({ id: 'retry-audit-1' });
    tx.campaignJob.update.mockResolvedValue({ id: 'job-1', status: 'QUEUED' });
    prisma.campaignJob.findUnique.mockReset().mockResolvedValue({
      ...job,
      status: 'QUEUED',
      recipients: [
        {
          id: recipient.id,
          userId: recipient.userId,
          username: recipient.username,
          status: 'PENDING',
          attempts: 1,
          lastError: null,
          deliveredAt: null,
        },
      ],
      retryAudits: [{ id: 'retry-audit-1' }],
    });

    await service.retryFailedRecipients('job-1', 'admin-actor', {
      confirmAtLeastOnce: true,
      requestId: 'f53a0cf4-f2f7-47a4-b997-bf61e51bf082',
    });

    expect(tx.campaignRecipient.updateMany).toHaveBeenCalledWith({
      where: { jobId: 'job-1', status: 'FAILED' },
      data: { status: 'PENDING', attemptedAt: null, lastError: null },
    });
    expect(tx.campaignJobRetryAudit.create).toHaveBeenCalledWith({
      data: {
        jobId: 'job-1',
        requestedByUserId: 'admin-actor',
        requestId: 'f53a0cf4-f2f7-47a4-b997-bf61e51bf082',
        confirmedAtLeastOnce: true,
        affectedRecipients: 1,
      },
    });
  });

  it('cancels pending recipients transactionally but retains job progress', async () => {
    prisma.$transaction.mockImplementation((callback) => callback(tx));
    tx.campaignJob.findUnique.mockResolvedValue({
      id: 'job-1',
      status: 'RUNNING',
    });
    tx.campaignJob.updateMany.mockResolvedValue({ count: 1 });
    tx.campaignRecipient.updateMany.mockResolvedValue({ count: 1 });
    prisma.campaignJob.findUnique.mockReset().mockResolvedValue({
      ...job,
      status: 'CANCELLED',
      recipients: [
        {
          id: recipient.id,
          userId: recipient.userId,
          username: recipient.username,
          status: 'CANCELLED',
          attempts: 0,
          lastError: null,
          deliveredAt: null,
        },
      ],
      retryAudits: [],
    });

    await expect(service.cancelJob('job-1')).resolves.toMatchObject({
      ok: true,
      status: 'CANCELLED',
      counts: { cancelled: 1 },
    });
    expect(tx.campaignRecipient.updateMany).toHaveBeenCalledWith({
      where: { jobId: 'job-1', status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  });

  it('suppresses a recipient whose verification or consent changed after enqueue', async () => {
    prisma.user.findFirst.mockResolvedValue(null);
    prisma.campaignJob.findUnique
      .mockReset()
      .mockResolvedValueOnce({ status: 'RUNNING' })
      .mockResolvedValueOnce({
        id: job.id,
        status: 'RUNNING',
        totalRecipients: 2,
      });
    prisma.campaignRecipient.groupBy.mockResolvedValue([
      { status: 'SKIPPED', _count: { _all: 1 } },
      { status: 'PENDING', _count: { _all: 1 } },
    ]);

    await service.processQueueTick();

    expect(notifications.deliverCampaignRecipient).not.toHaveBeenCalled();
    expect(prisma.user.findFirst).toHaveBeenCalledWith({
      where: {
        id: recipient.userId,
        email: recipient.email,
        isEmailVerified: true,
        campaignEmailConsent: {
          is: {
            id: recipient.consentId,
            optedIn: true,
            consentedAt: recipient.consentedAt,
          },
        },
      },
      select: { id: true },
    });
    expect(prisma.campaignRecipient.updateMany).toHaveBeenLastCalledWith(
      expect.objectContaining({
        where: { id: recipient.id, status: 'PROCESSING' },
        data: expect.objectContaining({
          status: 'SKIPPED',
          lastError: 'Eligibility changed after the campaign snapshot.',
        }),
      }),
    );
  });
});
