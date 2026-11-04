import { NotificationsRepository } from './notifications.repository';

describe('NotificationsRepository campaign email consent', () => {
  const consent = {
    id: 'consent-1',
    userId: 'user-1',
    optedIn: true,
    consentedAt: new Date('2026-11-04T12:00:00.000Z'),
    withdrawnAt: null,
    createdAt: new Date('2026-11-04T12:00:00.000Z'),
    updatedAt: new Date('2026-11-04T12:00:00.000Z'),
  };
  const tx = {
    campaignJob: { create: jest.fn() },
    campaignRecipient: { createMany: jest.fn() },
    campaignEmailConsent: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
      findUnique: jest.fn(),
      findUniqueOrThrow: jest.fn(),
    },
    campaignEmailConsentEvent: { create: jest.fn() },
  };
  const prisma = {
    $transaction: jest.fn((callback: (transaction: typeof tx) => unknown) =>
      callback(tx),
    ),
    campaignEmailConsent: { findUnique: jest.fn() },
  };
  const repository = new NotificationsRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
    tx.campaignJob.create.mockResolvedValue({ id: 'job-1' });
    tx.campaignRecipient.createMany.mockResolvedValue({ count: 1 });
    tx.campaignEmailConsent.upsert.mockResolvedValue(consent);
    tx.campaignEmailConsent.updateMany.mockResolvedValue({ count: 1 });
    tx.campaignEmailConsent.findUniqueOrThrow.mockResolvedValue(consent);
    tx.campaignEmailConsentEvent.create.mockResolvedValue({ id: 'event-1' });
  });

  it('persists the campaign job and bounded recipient snapshot atomically', async () => {
    await expect(
      repository.createCampaignJob(
        { requestedByUserId: 'admin-1' } as never,
        [
          {
            userId: 'user-1',
            email: 'user@example.test',
            username: 'user',
            consentId: 'consent-1',
            consentedAt: consent.consentedAt,
          },
        ] as never,
      ),
    ).resolves.toEqual({ id: 'job-1' });

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.campaignJob.create).toHaveBeenCalledWith({
      data: { requestedByUserId: 'admin-1' },
    });
    expect(tx.campaignRecipient.createMany).toHaveBeenCalledWith({
      data: [
        expect.objectContaining({
          jobId: 'job-1',
          userId: 'user-1',
          email: 'user@example.test',
          consentId: 'consent-1',
        }),
      ],
    });
  });

  it('audits a consent transition in the same transaction as the state update', async () => {
    await expect(
      repository.setCampaignEmailConsent('user-1', true),
    ).resolves.toEqual(consent);

    expect(prisma.$transaction).toHaveBeenCalledTimes(1);
    expect(tx.campaignEmailConsent.upsert).toHaveBeenCalledWith({
      where: { userId: 'user-1' },
      create: { userId: 'user-1', optedIn: false },
      update: {},
    });
    expect(tx.campaignEmailConsent.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', optedIn: { not: true } },
      data: {
        optedIn: true,
        consentedAt: expect.any(Date),
        withdrawnAt: null,
      },
    });
    expect(tx.campaignEmailConsentEvent.create).toHaveBeenCalledWith({
      data: {
        consentId: 'consent-1',
        userId: 'user-1',
        action: 'OPT_IN',
        source: 'ACCOUNT_SETTINGS',
        occurredAt: expect.any(Date),
      },
    });
  });

  it('audits an opt-out transition', async () => {
    tx.campaignEmailConsent.findUniqueOrThrow.mockResolvedValue({
      ...consent,
      optedIn: false,
      withdrawnAt: new Date('2026-11-04T12:00:00.000Z'),
    });

    await repository.setCampaignEmailConsent('user-1', false);

    expect(tx.campaignEmailConsent.updateMany).toHaveBeenCalledWith({
      where: { userId: 'user-1', optedIn: { not: false } },
      data: {
        optedIn: false,
        withdrawnAt: expect.any(Date),
      },
    });
    expect(tx.campaignEmailConsentEvent.create).toHaveBeenCalledWith({
      data: {
        consentId: 'consent-1',
        userId: 'user-1',
        action: 'OPT_OUT',
        source: 'ACCOUNT_SETTINGS',
        occurredAt: expect.any(Date),
      },
    });
  });

  it('records email unsubscribe in the same transaction and binds it to the consent snapshot', async () => {
    const consentedAt = consent.consentedAt;
    tx.campaignEmailConsent.findUnique.mockResolvedValue(consent);
    tx.campaignEmailConsent.updateMany.mockResolvedValue({ count: 1 });

    await expect(
      repository.unsubscribeCampaignEmailConsent('consent-1', consentedAt),
    ).resolves.toBe(true);

    expect(tx.campaignEmailConsent.updateMany).toHaveBeenCalledWith({
      where: { id: 'consent-1', optedIn: true, consentedAt },
      data: { optedIn: false, withdrawnAt: expect.any(Date) },
    });
    expect(tx.campaignEmailConsentEvent.create).toHaveBeenCalledWith({
      data: {
        consentId: 'consent-1',
        userId: 'user-1',
        action: 'OPT_OUT',
        source: 'EMAIL_UNSUBSCRIBE',
        occurredAt: expect.any(Date),
      },
    });
  });

  it('does not apply an old unsubscribe link to a later opt-in', async () => {
    tx.campaignEmailConsent.findUnique.mockResolvedValue({
      ...consent,
      consentedAt: new Date('2026-11-05T12:00:00.000Z'),
    });

    await expect(
      repository.unsubscribeCampaignEmailConsent('consent-1', consent.consentedAt),
    ).resolves.toBe(false);

    expect(tx.campaignEmailConsent.updateMany).not.toHaveBeenCalled();
    expect(tx.campaignEmailConsentEvent.create).not.toHaveBeenCalled();
  });

  it('treats repeat unsubscribe requests as successful without duplicate audit events', async () => {
    tx.campaignEmailConsent.findUnique.mockResolvedValue({ ...consent, optedIn: false });

    await expect(
      repository.unsubscribeCampaignEmailConsent('consent-1', consent.consentedAt),
    ).resolves.toBe(true);

    expect(tx.campaignEmailConsent.updateMany).not.toHaveBeenCalled();
    expect(tx.campaignEmailConsentEvent.create).not.toHaveBeenCalled();
  });

  it('recognizes a concurrent unsubscribe after its conditional update loses the race', async () => {
    tx.campaignEmailConsent.findUnique
      .mockResolvedValueOnce(consent)
      .mockResolvedValueOnce({ optedIn: false, consentedAt: consent.consentedAt });
    tx.campaignEmailConsent.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      repository.unsubscribeCampaignEmailConsent('consent-1', consent.consentedAt),
    ).resolves.toBe(true);

    expect(tx.campaignEmailConsentEvent.create).not.toHaveBeenCalled();
  });

  it('does not create duplicate events for idempotent repeats', async () => {
    tx.campaignEmailConsent.updateMany.mockResolvedValue({ count: 0 });

    await repository.setCampaignEmailConsent('user-1', false);

    expect(tx.campaignEmailConsentEvent.create).not.toHaveBeenCalled();
  });
});
