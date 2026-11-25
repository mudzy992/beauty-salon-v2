import { randomUUID } from 'node:crypto';
import type { INestApplication } from '@nestjs/common';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { EventsGateway } from '../src/events/events.gateway';
import { PrismaService } from '../src/prisma/prisma.service';
import { StylistsController } from '../src/stylists/stylists.controller';
import { StylistsService } from '../src/stylists/stylists.service';
import { UploadsRepository } from '../src/uploads/uploads.repository';
import { UploadsService } from '../src/uploads/uploads.service';
import { UsersController } from '../src/users/users.controller';
import { UsersRepository } from '../src/users/users.repository';
import { UsersService } from '../src/users/users.service';

/**
 * Ugovor analitičkih „pickera“ (klijenti / stilisti).
 *
 * Zašto postoji: frontend pickeri (`features/client-analytics/use-client-picker.ts`
 * i `features/stylist-analytics/use-stylist-picker.ts`) čitaju payload direktno i
 * odbacuju svaki odgovor koji nema `items` + `total`. Ta nepisana pravila su
 * jedino mjesto gdje se frontend i backend mogu raziđi bez ijednog pada.
 *
 * Ovaj test DIREKTNO provjerava odgovore prave kontrolere
 * (`GET /api/users/clients/admin`, `GET /api/stylists/admin`) nad pravim
 * PostgreSQL-om, pa su izvor isti kao u produkciji — ne mock i ne ručno
 * prepisan DTO.
 *
 * Ovo NIJE mjerenje učinkovitosti, mjerenje na pravom mobilnom uređaju ni
 * AT audit — samo provjera oblika odgovora.
 */

function disposableDatabaseUrl(): string {
  const url = new URL(process.env.E2E_DATABASE_URL ?? '');
  const name = decodeURIComponent(url.pathname.slice(1));
  if (
    !['postgres:', 'postgresql:'].includes(url.protocol) ||
    !['localhost', '127.0.0.1', '::1', '[::1]'].includes(url.hostname) ||
    !/(^|[_-])(test|e2e|ci)([_-]|$)/i.test(name)
  ) {
    throw new Error('A disposable local test PostgreSQL database is required');
  }
  return url.toString();
}

const secret = 'isolated-analytics-picker-e2e-secret';

describe('analytics pickers (HTTP and real PostgreSQL)', () => {
  let app: INestApplication;
  let db: PrismaService;
  let jwt: JwtService;
  let ownerToken: string;
  let clientToken: string;
  const roles: Record<string, string[]> = {};
  const createdUserIds: string[] = [];
  const createdProfileIds: string[] = [];

  const owner = () => `Bearer ${ownerToken}`;

  beforeAll(async () => {
    const config = new ConfigService({
      DATABASE_URL: disposableDatabaseUrl(),
      DATABASE_PROVIDER: 'postgres',
      JWT_SECRET: secret,
    });
    db = new PrismaService(config);
    await db.$connect();

    const auth = {
      validateUser: async (id: string) =>
        roles[id]
          ? { sub: id, username: id, email: '', roles: roles[id], mustChangePassword: false }
          : null,
    };
    const module = await Test.createTestingModule({
      imports: [PassportModule.register({ defaultStrategy: 'jwt' }), JwtModule.register({ secret })],
      controllers: [UsersController, StylistsController],
      providers: [
        UsersService,
        UsersRepository,
        StylistsService,
        UploadsService,
        UploadsRepository,
        RolesGuard,
        JwtStrategy,
        {
          provide: EventsGateway,
          useValue: {
            emitToAdmins: jest.fn(),
            emitToStylists: jest.fn(),
            emitToAll: jest.fn(),
            emitToUser: jest.fn(),
            disconnectUserSockets: jest.fn(),
          },
        },
        { provide: ConfigService, useValue: config },
        { provide: PrismaService, useValue: db },
        { provide: AuthService, useValue: auth },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();
    app = module.createNestApplication();
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
    await app.init();
    jwt = module.get(JwtService);

    const clientRole = await db.role.findUnique({ where: { name: 'CLIENT' } });
    const ownerRole = await db.role.findUnique({ where: { name: 'OWNER' } });
    if (!clientRole || !ownerRole) throw new Error('Fixture roles are missing');

    const client = await db.user.create({
      data: {
        username: `picker-client-${randomUUID()}`,
        firstName: 'Picker',
        lastName: 'Klijent',
        email: 'picker.client@example.test',
        phone: '+38761123456',
        userRoles: { create: { roleId: clientRole.id } },
      },
    });
    createdUserIds.push(client.id);
    roles[client.id] = ['CLIENT'];
    clientToken = jwt.sign({ sub: client.id });

    const ownerUser = await db.user.create({
      data: {
        username: `picker-owner-${randomUUID()}`,
        firstName: 'Picker',
        lastName: 'Vlasnik',
        email: 'picker.owner@example.test',
        userRoles: { create: { roleId: ownerRole.id } },
      },
    });
    createdUserIds.push(ownerUser.id);
    roles[ownerUser.id] = ['OWNER'];
    ownerToken = jwt.sign({ sub: ownerUser.id });

    const stylistUser = await db.user.create({
      data: {
        username: `picker-stylist-${randomUUID()}`,
        firstName: 'Picker',
        lastName: 'Stilista',
        email: 'picker.stylist@example.test',
        userRoles: { create: { roleId: clientRole.id } },
      },
    });
    createdUserIds.push(stylistUser.id);
    roles[stylistUser.id] = ['STYLIST'];
    const profile = await db.stylistProfile.create({
      data: { userId: stylistUser.id, status: 'ACTIVE', specialization: 'Boja' },
    });
    createdProfileIds.push(profile.id);
  });

  afterAll(async () => {
    if (!db) return;
    await db.stylistProfile.deleteMany({ where: { id: { in: createdProfileIds } } });
    await db.user.deleteMany({ where: { id: { in: createdUserIds } } });
    if (app) await app.close();
    await db.$disconnect();
  });

  it('returns the paginated client envelope the picker parses', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users/clients/admin')
      .query({ page: 0, pageSize: 20 })
      .set('Authorization', owner())
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(Number.isSafeInteger(response.body.total)).toBe(true);
    expect(Number.isSafeInteger(response.body.page)).toBe(true);

    const row = response.body.items.find(
      (item: { email: string | null }) => item.email === 'picker.client@example.test',
    );
    expect(row).toBeDefined();
    // Svako polje koje `use-client-picker.ts` čita mora postojati u odgovoru.
    expect(typeof row.id).toBe('string');
    expect(typeof row.username).toBe('string');
    expect(row.firstName).toBe('Picker');
    expect(row.lastName).toBe('Klijent');
    expect(row.email).toBe('picker.client@example.test');
    expect(row.phone).toBe('+38761123456');
    // Privatni polja korisnika nikad ne smiju biti u admin listi klijenata.
    expect(row).not.toHaveProperty('passwordHash');
    expect(row).not.toHaveProperty('mustChangePassword');
  });

  it('filters the admin client list by the picker search term', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/users/clients/admin')
      .query({ q: 'picker.client@example.test', page: 0, pageSize: 20 })
      .set('Authorization', owner())
      .expect(200);

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].email).toBe('picker.client@example.test');
    expect(response.body.total).toBe(1);
  });

  it('keeps the client picker behind the admin role matrix', async () => {
    await request(app.getHttpServer())
      .get('/api/users/clients/admin')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/users/clients/admin')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });

  it('returns the paginated stylist envelope the picker parses', async () => {
    const response = await request(app.getHttpServer())
      .get('/api/stylists/admin')
      .query({ page: 0, pageSize: 20 })
      .set('Authorization', owner())
      .expect(200);

    expect(Array.isArray(response.body.items)).toBe(true);
    expect(Number.isSafeInteger(response.body.total)).toBe(true);
    expect(Number.isSafeInteger(response.body.page)).toBe(true);

    const row = response.body.items.find(
      (item: { user?: { email: string | null } }) => item.user?.email === 'picker.stylist@example.test',
    );
    expect(row).toBeDefined();
    // `use-stylist-picker.ts` čita ove polja.
    expect(typeof row.id).toBe('string');
    expect(typeof row.isActive).toBe('boolean');
    expect(typeof row.status).toBe('string');
    expect(row.specialization).toBe('Boja');
    expect(typeof row.user.username).toBe('string');
    expect(row.user.firstName).toBe('Picker');
    expect(row.user.lastName).toBe('Stilista');
    expect(row.user.email).toBe('picker.stylist@example.test');
    expect(row.user).not.toHaveProperty('passwordHash');
  });

  it('keeps the stylist picker behind the admin role matrix', async () => {
    await request(app.getHttpServer())
      .get('/api/stylists/admin')
      .expect(401);
    await request(app.getHttpServer())
      .get('/api/stylists/admin')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
  });
});
