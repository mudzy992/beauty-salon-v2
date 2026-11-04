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
    campaignEmailConsent: {
      upsert: jest.fn(),
      updateMany: jest.fn(),
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
    tx.campaignEmailConsent.upsert.mockResolvedValue(consent);
    tx.campaignEmailConsent.updateMany.mockResolvedValue({ count: 1 });
    tx.campaignEmailConsent.findUniqueOrThrow.mockResolvedValue(consent);
    tx.campaignEmailConsentEvent.create.mockResolvedValue({ id: 'event-1' });
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

  it('does not create duplicate events for idempotent repeats', async () => {
    tx.campaignEmailConsent.updateMany.mockResolvedValue({ count: 0 });

    await repository.setCampaignEmailConsent('user-1', false);

    expect(tx.campaignEmailConsentEvent.create).not.toHaveBeenCalled();
  });
});
