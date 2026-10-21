jest.mock('../prisma/prisma.service', () => ({
  PrismaService: class PrismaService {},
}));

import { EventsGateway } from '../events/events.gateway';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import type { PrismaService } from '../prisma/prisma.service';
import { StylistsService } from './stylists.service';

type ProfileUpdateArgs = {
  where: { id: string };
  data: Record<string, unknown>;
};

const mockEventsGateway = {
  disconnectUserSockets: jest.fn(),
};

const mockPrisma = {
  user: { findUnique: jest.fn() },
  stylistProfile: {
    findUnique: jest.fn(),
    create: jest.fn(),
    update: jest.fn<(args: ProfileUpdateArgs) => Promise<unknown>>(),
    delete: jest.fn(),
  },
  role: { findUnique: jest.fn() },
  userRole: {
    findFirst: jest.fn(),
    create: jest.fn(),
    deleteMany: jest.fn(),
  },
};

const owner: CurrentUserPayload = {
  sub: 'owner-1',
  username: 'owner',
  email: '',
  roles: ['OWNER'],
};

describe('StylistsService socket revocation', () => {
  let service: StylistsService;

  beforeEach(() => {
    jest.clearAllMocks();
    service = new StylistsService(
      mockPrisma as unknown as PrismaService,
      mockEventsGateway as unknown as EventsGateway,
    );
  });

  it('disconnects the stylist after profile eligibility changes', async () => {
    const activeProfile = {
      id: 'profile-1',
      userId: 'stylist-user-1',
      isActive: true,
      status: 'ACTIVE',
    };
    mockPrisma.stylistProfile.findUnique
      .mockResolvedValueOnce(activeProfile)
      .mockResolvedValueOnce(activeProfile);
    mockPrisma.stylistProfile.update.mockResolvedValue({
      ...activeProfile,
      isActive: false,
    });

    await service.update('profile-1', { isActive: false }, owner);

    expect(mockPrisma.stylistProfile.update).toHaveBeenCalledTimes(1);
    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'stylist-user-1',
    );
  });

  it('disconnects the stylist when its status becomes pending', async () => {
    const activeProfile = {
      id: 'profile-1',
      userId: 'stylist-user-1',
      isActive: true,
      status: 'ACTIVE',
    };
    mockPrisma.stylistProfile.findUnique
      .mockResolvedValueOnce(activeProfile)
      .mockResolvedValueOnce({ ...activeProfile, status: 'PENDING' });
    mockPrisma.stylistProfile.update.mockResolvedValue({
      ...activeProfile,
      status: 'PENDING',
    });

    await service.update('profile-1', { status: 'PENDING' }, owner);

    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'stylist-user-1',
    );
  });

  it('disconnects existing sessions when creating a stylist profile and role', async () => {
    mockPrisma.user.findUnique.mockResolvedValue({ id: 'stylist-user-1' });
    mockPrisma.stylistProfile.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'profile-1',
        userId: 'stylist-user-1',
        isActive: true,
        status: 'ACTIVE',
      });
    mockPrisma.stylistProfile.create.mockResolvedValue({
      id: 'profile-1',
      userId: 'stylist-user-1',
    });
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'stylist-role-1' });
    mockPrisma.userRole.findFirst.mockResolvedValue(null);
    mockPrisma.userRole.create.mockResolvedValue({});

    await service.create({ userId: 'stylist-user-1' }, ['OWNER']);

    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'stylist-user-1',
    );
    expect(mockPrisma.userRole.create).toHaveBeenCalledWith({
      data: { userId: 'stylist-user-1', roleId: 'stylist-role-1' },
    });
  });

  it('disconnects the stylist immediately after profile removal', async () => {
    mockPrisma.stylistProfile.findUnique.mockResolvedValue({
      id: 'profile-1',
      userId: 'stylist-user-1',
    });
    mockPrisma.stylistProfile.delete.mockResolvedValue({});
    mockPrisma.role.findUnique.mockResolvedValue({ id: 'stylist-role-1' });
    mockPrisma.userRole.deleteMany.mockResolvedValue({ count: 1 });

    await expect(service.remove('profile-1', ['OWNER'])).resolves.toEqual({
      deleted: true,
    });

    expect(mockEventsGateway.disconnectUserSockets).toHaveBeenCalledWith(
      'stylist-user-1',
    );
    expect(
      mockPrisma.stylistProfile.delete.mock.invocationCallOrder[0],
    ).toBeLessThan(
      mockEventsGateway.disconnectUserSockets.mock.invocationCallOrder[0],
    );
  });
});
