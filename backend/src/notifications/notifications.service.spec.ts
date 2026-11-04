import { BadRequestException } from '@nestjs/common';
import { NotificationsService } from './notifications.service';
import { CampaignAudienceDto } from './dto/campaign-audience.dto';
import { SendCampaignDto } from './dto/send-campaign.dto';

describe('NotificationsService campaign audience policy', () => {
  const repo = {
    findCampaignEmailConsent: jest.fn(),
    setCampaignEmailConsent: jest.fn(),
    findCampaignJobByRequest: jest.fn(),
    createCampaignJob: jest.fn(),
    findUsers: jest.fn(),
    createNotification: jest.fn(),
  };
  const config = { get: jest.fn() };
  const events = { emitToUser: jest.fn() };
  const settings = { getValue: jest.fn() };

  let service: NotificationsService;

  beforeEach(() => {
    jest.clearAllMocks();
    repo.findUsers.mockResolvedValue([]);
    repo.findCampaignJobByRequest.mockResolvedValue(null);
    repo.findCampaignEmailConsent.mockResolvedValue(null);
    repo.setCampaignEmailConsent.mockResolvedValue({
      optedIn: false,
      consentedAt: null,
      withdrawnAt: null,
    });
    settings.getValue.mockResolvedValue(null);
    service = new NotificationsService(
      repo as never,
      config as never,
      events as never,
      settings as never,
    );
  });

  it('returns opted out for legacy users without a consent row', async () => {
    await expect(
      service.getCampaignEmailConsent('legacy-user'),
    ).resolves.toEqual({
      optedIn: false,
      consentedAt: null,
      withdrawnAt: null,
    });
  });

  it('persists only the authenticated user ID and chosen preference', async () => {
    const consentedAt = new Date('2026-11-04T12:00:00.000Z');
    repo.setCampaignEmailConsent.mockResolvedValue({
      optedIn: true,
      consentedAt,
      withdrawnAt: null,
    });

    await expect(
      service.setCampaignEmailConsent('own-user', true),
    ).resolves.toEqual({
      optedIn: true,
      consentedAt,
      withdrawnAt: null,
    });
    expect(repo.setCampaignEmailConsent).toHaveBeenCalledWith('own-user', true);
  });

  it('enforces verified email and explicit marketing consent in the bounded database query', async () => {
    const audience: CampaignAudienceDto = {
      roles: ['CLIENT'],
      onlyActive: true,
      onlyEmailVerified: false,
      includeUserIds: ['included-user'],
      excludeUserIds: ['excluded-user'],
    };
    const recipient = {
      id: 'eligible-user',
      username: 'eligible',
      email: 'eligible@example.test',
      firstName: 'Eligible',
      lastName: 'User',
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    };
    repo.findUsers.mockResolvedValue([recipient]);

    await expect(service.getCampaignAudienceSummary(audience)).resolves.toEqual(
      {
        total: 1,
        maxRecipients: 100,
        exceedsLimit: false,
        sample: [
          {
            id: recipient.id,
            username: recipient.username,
            email: recipient.email,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
          },
        ],
      },
    );
    expect(repo.findUsers).toHaveBeenCalledWith({
      where: {
        isEmailVerified: true,
        email: { not: null },
        campaignEmailConsent: {
          is: { optedIn: true, consentedAt: { not: null } },
        },
        isActive: true,
        id: { in: ['included-user'], notIn: ['excluded-user'] },
        userRoles: { some: { role: { name: { in: ['CLIENT'] } } } },
      },
      select: {
        id: true,
        username: true,
        email: true,
        firstName: true,
        lastName: true,
        createdAt: true,
        campaignEmailConsent: {
          select: { id: true, consentedAt: true },
        },
      },
      orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
      take: 101,
    });
  });

  it('creates one persistent job with a consent and recipient snapshot', async () => {
    const consentedAt = new Date('2026-11-04T12:00:00.000Z');
    repo.findUsers.mockResolvedValue([
      {
        id: 'eligible-user',
        username: 'eligible',
        email: 'eligible@example.test',
        firstName: 'Eligible',
        lastName: 'User',
        createdAt: consentedAt,
        campaignEmailConsent: { id: 'consent-1', consentedAt },
      },
    ]);
    settings.getValue.mockImplementation(async (key: string) => {
      if (key === 'system_email_campaign_templates') {
        return JSON.stringify([
          { id: 'newsletter', name: 'Newsletter', html: '<p>Hello</p>' },
        ]);
      }
      if (key === 'system_email_host') return 'smtp.example.test';
      if (key === 'system_notif_email_from') return 'campaign@example.test';
      return null;
    });
    const createdJob = {
      id: 'job-1',
      status: 'QUEUED',
      totalRecipients: 1,
    };
    repo.createCampaignJob.mockResolvedValue(createdJob);

    await expect(
      service.sendCampaign(
        {
          idempotencyKey: 'a5bc3179-06f7-4ec0-97aa-9d6720d54388',
          templateId: 'newsletter',
          audience: {},
        },
        'admin-1',
      ),
    ).resolves.toMatchObject({
      ok: true,
      queued: true,
      jobId: 'job-1',
      status: 'QUEUED',
      totalTargeted: 1,
      duplicate: false,
    });
    expect(repo.createCampaignJob).toHaveBeenCalledWith(
      expect.objectContaining({
        templateId: 'newsletter',
        templateHtml: '<p>Hello</p>',
        requestedByUserId: 'admin-1',
        idempotencyKey: 'a5bc3179-06f7-4ec0-97aa-9d6720d54388',
        totalRecipients: 1,
      }),
      [
        expect.objectContaining({
          userId: 'eligible-user',
          email: 'eligible@example.test',
          consentId: 'consent-1',
          consentedAt,
          status: 'PENDING',
        }),
      ],
    );
  });

  it('returns the existing job for a repeated idempotency key', async () => {
    repo.findCampaignJobByRequest.mockResolvedValue({
      id: 'job-existing',
      status: 'RUNNING',
      totalRecipients: 3,
    });

    await expect(
      service.sendCampaign(
        {
          idempotencyKey: 'f53a0cf4-f2f7-47a4-b997-bf61e51bf082',
          templateId: 'template-no-longer-configured',
          audience: {},
        },
        'admin-1',
      ),
    ).resolves.toMatchObject({
      jobId: 'job-existing',
      status: 'RUNNING',
      totalTargeted: 3,
      duplicate: true,
    });
    expect(repo.findUsers).not.toHaveBeenCalled();
    expect(repo.createCampaignJob).not.toHaveBeenCalled();
  });

  it('reports a bounded over-limit preview and refuses to send it', async () => {
    const recipients = Array.from({ length: 101 }, (_, index) => ({
      id: `user-${index}`,
      username: `user-${index}`,
      email: `user-${index}@example.test`,
      firstName: null,
      lastName: null,
      createdAt: new Date('2026-11-01T00:00:00.000Z'),
    }));
    repo.findUsers.mockResolvedValue(recipients);
    settings.getValue.mockResolvedValue(
      JSON.stringify([
        { id: 'newsletter', name: 'Newsletter', html: '<p>Hello</p>' },
      ]),
    );

    await expect(service.getCampaignAudienceSummary({})).resolves.toMatchObject(
      {
        total: 101,
        maxRecipients: 100,
        exceedsLimit: true,
        sample: expect.any(Array),
      },
    );
    await expect(
      service.sendCampaign(
        {
          templateId: 'newsletter',
          audience: {},
        } as SendCampaignDto,
        'admin-user',
      ),
    ).rejects.toBeInstanceOf(BadRequestException);
    expect(config.get).not.toHaveBeenCalled();
    expect(repo.createNotification).not.toHaveBeenCalled();
  });
});
