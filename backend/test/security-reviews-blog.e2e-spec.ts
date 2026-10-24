// The real sanitizer is covered by the Node regression; keep this CJS Jest suite independent of its ESM dependency graph.
jest.mock('../src/blog/utils/sanitize-blog-content', () => ({
  sanitizeBlogContent: (content: string) => content,
}));

import { randomUUID } from 'node:crypto';
import { appendFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { performance } from 'node:perf_hooks';
import type { Server } from 'node:http';
import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { JwtModule, JwtService } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import sharp from 'sharp';
import { AuthService } from '../src/auth/auth.service';
import { JwtStrategy } from '../src/auth/strategies/jwt.strategy';
import { JwtAuthGuard } from '../src/common/guards/jwt-auth.guard';
import { RolesGuard } from '../src/common/guards/roles.guard';
import { DecimalToNumberInterceptor } from '../src/common/interceptors/decimal-to-number.interceptor';
import { BlogCommentsService } from '../src/blog/blog-comments.service';
import { BlogController } from '../src/blog/blog.controller';
import { BlogService } from '../src/blog/blog.service';
import { DailyLogAdminService } from '../src/daily-log/daily-log-admin.service';
import { DailyLogController } from '../src/daily-log/daily-log.controller';
import { MediaConsentController } from '../src/media-consent/media-consent.controller';
import { MediaConsentService } from '../src/media-consent/media-consent.service';
import { UploadsController } from '../src/uploads/uploads.controller';
import { UploadsRepository } from '../src/uploads/uploads.repository';
import { UploadsService } from '../src/uploads/uploads.service';
import { DailyLogDispositionService } from '../src/daily-log/daily-log-disposition.service';
import { DailyLogPublicService } from '../src/daily-log/daily-log-public.service';
import { DailyLogRestoreService } from '../src/daily-log/daily-log-restore.service';
import { DailyLogService } from '../src/daily-log/daily-log.service';
import { ClientDebtsController } from '../src/finance/client-debts.controller';
import { ClientDebtsService } from '../src/finance/client-debts.service';
import { IncomeBookRepository } from '../src/finance/repositories/income-book.repository';
import { IncomeBooksService } from '../src/finance/income-books.service';
import { IncomeManualEntriesService } from '../src/finance/income-manual-entries.service';
import { IncomeSyncService } from '../src/finance/income-sync.service';
import { AvailabilityDebugService } from '../src/reservations/availability-debug.service';
import { AvailabilityDatesService } from '../src/reservations/availability-dates.service';
import { AvailabilityService } from '../src/reservations/availability.service';
import { AvailabilitySlotsService } from '../src/reservations/availability-slots.service';
import { ReservationsController } from '../src/reservations/reservations.controller';
import { ReservationsService } from '../src/reservations/reservations.service';
import { ReservationCreateService } from '../src/reservations/reservation-create.service';
import { ReservationDirectCreateService } from '../src/reservations/reservation-direct-create.service';
import { ReservationClientActionsService } from '../src/reservations/reservation-client-actions.service';
import { ReservationDateService } from '../src/reservations/reservation-date.service';
import { ReservationNotifyService } from '../src/reservations/reservation-notify.service';
import { ReservationOutboxService } from '../src/reservations/reservation-outbox.service';
import { ReservationQueriesService } from '../src/reservations/reservation-queries.service';
import { ReservationRescheduleClientService } from '../src/reservations/reservation-reschedule-client.service';
import { ReservationSharedService } from '../src/reservations/reservation-shared.service';
import type { CreateReservationDto } from '../src/reservations/dto/create-reservation.dto';
import type { AdminCreateReservationDto } from '../src/reservations/dto/admin-create-reservation.dto';
import type { CancelReservationDto } from '../src/reservations/dto/cancel-reservation.dto';
import { LoyaltyService } from '../src/loyalty/loyalty.service';
import { NotificationsService } from '../src/notifications/notifications.service';
import { AnalyticsController } from '../src/analytics/analytics.controller';
import { AnalyticsService } from '../src/analytics/analytics.service';
import { ServicesController } from '../src/services/services.controller';
import { ServicesService } from '../src/services/services.service';
import { StylistsController } from '../src/stylists/stylists.controller';
import { StylistsService } from '../src/stylists/stylists.service';
import { PrismaService } from '../src/prisma/prisma.service';
import { ReviewsController } from '../src/reviews/reviews.controller';
import { ReviewsService } from '../src/reviews/reviews.service';
import { EventsGateway } from '../src/events/events.gateway';
import { SettingsService } from '../src/settings/settings.service';
import { UsersController } from '../src/users/users.controller';
import { UsersRepository } from '../src/users/users.repository';
import { UsersService } from '../src/users/users.service';

const TEST_JWT_SECRET = 'db-backed-security-http-tests-only-secret';
const LOCAL_TEST_DATABASE_HOSTS = new Set([
  'localhost',
  '127.0.0.1',
  '::1',
  '[::1]',
]);
const TEST_DATABASE_NAME_PATTERN = /(?:^|[_-])(test|e2e|ci)(?:$|[_-])/i;

const getDisposableDatabaseUrl = (): string => {
  const url = process.env.E2E_DATABASE_URL;
  if (!url) {
    throw new Error(
      'E2E_DATABASE_URL is required; use a disposable local PostgreSQL database named with test, e2e, or ci.',
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('E2E_DATABASE_URL is not a valid PostgreSQL URL.');
  }

  const databaseName = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  if (
    !['postgres:', 'postgresql:'].includes(parsed.protocol) ||
    !LOCAL_TEST_DATABASE_HOSTS.has(parsed.hostname) ||
    !TEST_DATABASE_NAME_PATTERN.test(databaseName)
  ) {
    throw new Error(
      'Refusing E2E_DATABASE_URL: tests require a local PostgreSQL database whose name contains a test, e2e, or ci segment.',
    );
  }

  return url;
};

const getHttpServer = (app: INestApplication): Server =>
  app.getHttpServer() as Server;

const addWeeks = (date: string, weeks: number): string => {
  const [year, month, day] = date.split('-').map(Number);
  const value = new Date(Date.UTC(year!, month! - 1, day! + weeks * 7));
  return value.toISOString().slice(0, 10);
};

type FixtureIds = {
  users: string[];
  posts: string[];
  comments: string[];
  reviews: string[];
  dailyLogEntries: string[];
  consentedDailyLogEntries: string[];
  galleryCategories: string[];
  dailyLogImages: string[];
  mediaConsents: string[];
  consentedUploadIds: string[];
  uploads: string[];
  clientDebts: string[];
  incomeManualEntries: string[];
  incomeBookId?: string;
  incomeBookCreatedByTest?: string;
  ownerUserId?: string;
  stylistProfile?: string;
  additionalStylistProfiles: string[];
  reservationIds: string[];
  serviceCategory?: string;
  serviceSubcategory?: string;
  service?: string;
  salonSettings?: string;
};

const fixtureIds: FixtureIds = {
  users: [],
  posts: [],
  comments: [],
  reviews: [],
  dailyLogEntries: [],
  consentedDailyLogEntries: [],
  galleryCategories: [],
  dailyLogImages: [],
  mediaConsents: [],
  consentedUploadIds: [],
  uploads: [],
  clientDebts: [],
  incomeManualEntries: [],
  additionalStylistProfiles: [],
  reservationIds: [],
};

describe('DB-backed HTTP contracts for SEC-01, SEC-02, SEC-04/PRIV-01, SEC-07, API-02, BIZ-01, BIZ-02 and BIZ-04', () => {
  let app: INestApplication | undefined;
  let prisma: PrismaService | undefined;
  let jwtService: JwtService;
  let clientToken: string;
  let clientUserId: string;
  let ownerToken: string;
  let stylistToken: string;
  let systemAdminToken: string;
  let concurrentClientTokens: Array<{ userId: string; token: string }>;
  let clientEmail: string;
  let pickerQueryPrefix: string;
  let pickerClientIds: string[];
  let mixedRoleClientId: string;
  let serviceId: string;
  let serviceName: string;
  let publishedReviewId: string;
  let secondPublishedReviewId: string;
  let pendingReviewId: string;
  let publishedPostId: string;
  let publishedPostSlug: string;
  let draftPostId: string;
  let draftPostSlug: string;
  let approvedCommentId: string;
  let pendingCommentId: string;
  let availabilityDate: string;
  let firstBeforeImageId: string;
  let unconsentedDailyLogEntryId: string;
  let readConsentDerivativeMock: jest.SpyInstance;
  let uploadRoot: string | undefined;
  let lastBookingServerError: string | undefined;

  const submitClientBooking = async (params: {
    reservationDate: string;
    token?: string;
    startTime?: string;
    endTime?: string;
    idempotencyKey?: string;
    desiredLoyaltyPercent?: number;
  }) => {
    const key = params.idempotencyKey ?? randomUUID();
    const body = {
      serviceIds: [serviceId],
      reservationDate: params.reservationDate,
      startTime: params.startTime ?? '09:00',
      endTime: params.endTime ?? '09:45',
      ...(params.desiredLoyaltyPercent === undefined
        ? {}
        : { desiredLoyaltyPercent: params.desiredLoyaltyPercent }),
    };
    lastBookingServerError = undefined;
    const response = await request(getHttpServer(app!))
      .post('/api/reservations')
      .set('Authorization', `Bearer ${params.token ?? clientToken}`)
      .set('Idempotency-Key', key)
      .send(body);
    if (typeof response.body?.id === 'string') {
      fixtureIds.reservationIds.push(response.body.id);
    }
    return {
      response,
      key,
      body,
      serverError: lastBookingServerError,
    };
  };

  const expectClientBookingCreated = (
    result: Awaited<ReturnType<typeof submitClientBooking>>,
    label: string,
  ): void => {
    if (result.response.status === 201) return;

    const responseBody = result.response.body as {
      error?: unknown;
      message?: unknown;
    };
    const error =
      typeof responseBody?.error === 'string'
        ? responseBody.error.slice(0, 100)
        : '';
    const message =
      typeof responseBody?.message === 'string'
        ? responseBody.message.slice(0, 240)
        : Array.isArray(responseBody?.message)
          ? responseBody.message
              .filter((part): part is string => typeof part === 'string')
              .join('; ')
              .slice(0, 240)
          : '';
    const serverError = result.serverError ?? '';
    throw new Error(
      `${label}: expected HTTP 201, received ${result.response.status}; error=${error}; message=${message}; server=${serverError}`,
    );
  };

  beforeAll(async () => {
    const databaseUrl = getDisposableDatabaseUrl();
    uploadRoot = await mkdtemp(join(tmpdir(), 'beauty-salon-avatar-e2e-'));
    const configValues: Record<string, string> = {
      DATABASE_URL: databaseUrl,
      DATABASE_PROVIDER: 'postgres',
      JWT_SECRET: TEST_JWT_SECRET,
      UPLOAD_ROOT: uploadRoot,
    };
    const configService = {
      get: (key: string, defaultValue?: string) =>
        configValues[key] ?? defaultValue,
    };
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret: TEST_JWT_SECRET }),
      ],
      controllers: [
        ReviewsController,
        AnalyticsController,
        BlogController,
        UsersController,
        UploadsController,
        DailyLogController,
        ClientDebtsController,
        MediaConsentController,
        ReservationsController,
        ServicesController,
        StylistsController,
      ],
      providers: [
        PrismaService,
        UsersRepository,
        UsersService,
        ClientDebtsService,
        IncomeBookRepository,
        IncomeBooksService,
        IncomeManualEntriesService,
        IncomeSyncService,
        ReviewsService,
        {
          provide: AnalyticsService,
          useValue: { getDashboard: jest.fn().mockResolvedValue({}) },
        },
        ServicesService,
        StylistsService,
        BlogService,
        BlogCommentsService,
        DailyLogPublicService,
        MediaConsentService,
        UploadsRepository,
        UploadsService,
        { provide: DailyLogService, useValue: {} },
        { provide: DailyLogAdminService, useValue: {} },
        { provide: DailyLogDispositionService, useValue: {} },
        { provide: DailyLogRestoreService, useValue: {} },
        {
          provide: ReservationsService,
          useFactory: (
            createSvc: ReservationCreateService,
            directCreateSvc: ReservationDirectCreateService,
            clientActionsSvc: ReservationClientActionsService,
            rescheduleClientSvc: ReservationRescheduleClientService,
          ) => ({
            create: (
              dto: CreateReservationDto,
              clientId: string,
              idempotencyKey?: string,
            ) => createSvc.create(dto, clientId, { idempotencyKey }),
            createByAdmin: (dto: AdminCreateReservationDto, userId: string) =>
              dto.bookingMode === 'STAFF_ADMIN_DIRECT'
                ? directCreateSvc.createByAdmin(dto, userId)
                : createSvc.createByAdmin(dto),
            cancelByClient: (
              id: string,
              clientId: string,
              dto: CancelReservationDto,
            ) => clientActionsSvc.cancelByClient(id, clientId, dto),
            acceptReschedule: (id: string, userId: string) =>
              rescheduleClientSvc.acceptReschedule(id, userId),
          }),
          inject: [
            ReservationCreateService,
            ReservationDirectCreateService,
            ReservationClientActionsService,
            ReservationRescheduleClientService,
          ],
        },
        AvailabilityService,
        AvailabilityDatesService,
        AvailabilitySlotsService,
        AvailabilityDebugService,
        ReservationDateService,
        ReservationSharedService,
        ReservationQueriesService,
        ReservationCreateService,
        ReservationDirectCreateService,
        ReservationClientActionsService,
        ReservationRescheduleClientService,
        ReservationOutboxService,
        LoyaltyService,
        AuthService,
        JwtStrategy,
        RolesGuard,
        {
          provide: ConfigService,
          useValue: configService,
        },
        {
          provide: NotificationsService,
          useValue: {
            sendToMany: jest.fn().mockResolvedValue(undefined),
            send: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: ReservationNotifyService,
          useValue: {
            notifyStylistAboutClientDecision: jest
              .fn()
              .mockResolvedValue(undefined),
          },
        },
        {
          provide: SettingsService,
          useValue: {
            getBoolean: () => Promise.resolve(false),
            getString: () => Promise.resolve('Europe/Sarajevo'),
            getValue: async (key: string) => {
              const values: Record<string, string> = {
                loyalty_enabled: 'true',
                loyalty_redeem_enabled: 'true',
                loyalty_tiers: JSON.stringify([
                  {
                    id: 'test',
                    name: 'Test',
                    minPoints: 0,
                    maxDiscountPercent: 100,
                  },
                ]),
                loyalty_max_discount_percent: '100',
                loyalty_redeem_rate: '0.1',
                loyalty_min_points_to_redeem: '0',
              };
              return values[key] ?? null;
            },
          },
        },
        {
          provide: EventsGateway,
          useValue: {
            emitToAdmins: jest.fn(),
            emitToStylists: jest.fn(),
            emitToAll: jest.fn(),
            emitToUser: jest.fn(),
          },
        },
        { provide: APP_GUARD, useClass: JwtAuthGuard },
      ],
    }).compile();

    const uploadsService = moduleRef.get(UploadsService);
    readConsentDerivativeMock = jest
      .spyOn(uploadsService, 'readConsentDerivative')
      .mockResolvedValue({
        buffer: Buffer.from('synthetic-webp'),
        mimeType: 'image/webp',
        fileName: 'synthetic.webp',
        inline: true,
      });

    const testLogger = {
      log: () => undefined,
      warn: () => undefined,
      debug: () => undefined,
      verbose: () => undefined,
      fatal: () => undefined,
      error: (message: unknown, ...optionalParams: unknown[]) => {
        const errorValue =
          message instanceof Error
            ? message
            : optionalParams.find(
                (value): value is Error => value instanceof Error,
              );
        const trace = optionalParams.find(
          (value): value is string => typeof value === 'string',
        );
        const traceHead = trace?.split(/\r?\n/).find((line) => line.trim());
        const codeValue =
          errorValue && 'code' in errorValue ? errorValue.code : undefined;
        const errorCode = typeof codeValue === 'string' ? codeValue : '';
        const details = errorValue
          ? `${errorValue.name}${errorCode ? ` ${errorCode}` : ''}: ${errorValue.message}`
          : (traceHead ?? String(message));
        lastBookingServerError = details
          .replace(/\s+/g, ' ')
          .trim()
          .replace(/postgres(?:ql)?:\/\/[^\s"'`]+/gi, '[DATABASE_URL_REDACTED]')
          .replace(/\bBearer\s+["']?[^\s"'`]+["']?/gi, 'Bearer [REDACTED]')
          .replace(
            /\b[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}\b/g,
            '[JWT_REDACTED]',
          )
          .replace(
            /(["']?(?:password|pass|token|secret)["']?)(\s*[:=]\s*)["']?[^\s,"']+["']?/gi,
            '$1$2[REDACTED]',
          )
          .slice(0, 300);
      },
    };
    const nestApp = moduleRef.createNestApplication({ logger: testLogger });
    nestApp.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
    nestApp.useGlobalInterceptors(new DecimalToNumberInterceptor());
    app = nestApp;
    await nestApp.init();
    prisma = nestApp.get(PrismaService);
    jwtService = moduleRef.get(JwtService);

    const suffix = randomUUID().replaceAll('-', '');
    const clientRole = await prisma.role.upsert({
      where: { name: 'CLIENT' },
      update: {},
      create: { name: 'CLIENT' },
    });
    const ownerRole = await prisma.role.upsert({
      where: { name: 'OWNER' },
      update: {},
      create: { name: 'OWNER' },
    });
    const stylistRole = await prisma.role.upsert({
      where: { name: 'STYLIST' },
      update: {},
      create: { name: 'STYLIST' },
    });
    const systemAdminRole = await prisma.role.upsert({
      where: { name: 'SYSTEM_ADMIN' },
      update: {},
      create: { name: 'SYSTEM_ADMIN' },
    });
    pickerQueryPrefix = `sec-picker-${suffix}`;
    pickerClientIds = [];

    clientEmail = `sec-client-${suffix}@example.test`;
    const client = await prisma.user.create({
      data: {
        username: `sec-client-${suffix}`,
        email: clientEmail,
        passwordHash: `synthetic-hash-${suffix}`,
        emailVerificationToken: `synthetic-verification-${suffix}`,
        emailVerificationExpiresAt: new Date(Date.now() + 60_000),
        googleId: `synthetic-google-${suffix}`,
        facebookId: `synthetic-facebook-${suffix}`,
        phone: '+38761000000',
        gender: 'FEMALE',
        genderOnboardingCompleted: true,
        isEmailVerified: true,
        firstName: 'Test',
        lastName: 'Client',
      },
    });
    fixtureIds.users.push(client.id);
    clientUserId = client.id;
    await prisma.userRole.create({
      data: { userId: client.id, roleId: clientRole.id },
    });

    const owner = await prisma.user.create({
      data: {
        username: `sec-owner-${suffix}`,
        email: `sec-owner-${suffix}@example.test`,
        firstName: 'Test',
        lastName: 'Owner',
      },
    });
    fixtureIds.users.push(owner.id);
    fixtureIds.ownerUserId = owner.id;
    await prisma.userRole.create({
      data: { userId: owner.id, roleId: ownerRole.id },
    });

    clientToken = jwtService.sign({ sub: client.id }, { expiresIn: '5m' });
    ownerToken = jwtService.sign({ sub: owner.id }, { expiresIn: '5m' });

    const stylist = await prisma.user.create({
      data: {
        username: `sec-stylist-${suffix}`,
        email: `sec-stylist-${suffix}@example.test`,
        firstName: 'Test',
        lastName: 'Stylist',
      },
    });
    fixtureIds.users.push(stylist.id);
    await prisma.userRole.create({
      data: { userId: stylist.id, roleId: stylistRole.id },
    });
    const stylistProfile = await prisma.stylistProfile.create({
      data: { userId: stylist.id, status: 'ACTIVE' },
    });
    fixtureIds.stylistProfile = stylistProfile.id;
    stylistToken = jwtService.sign({ sub: stylist.id }, { expiresIn: '5m' });

    const systemAdmin = await prisma.user.create({
      data: {
        username: `sec-admin-${suffix}`,
        email: `sec-admin-${suffix}@example.test`,
        firstName: 'Test',
        lastName: 'Administrator',
      },
    });
    fixtureIds.users.push(systemAdmin.id);
    await prisma.userRole.create({
      data: { userId: systemAdmin.id, roleId: systemAdminRole.id },
    });
    systemAdminToken = jwtService.sign(
      { sub: systemAdmin.id },
      { expiresIn: '5m' },
    );

    concurrentClientTokens = [];
    for (let index = 0; index < 20; index += 1) {
      const clientForConcurrency = await prisma.user.create({
        data: {
          username: `biz02-client-${suffix}-${index}`,
          email: `biz02-client-${suffix}-${index}@example.test`,
          phone: `+3876200${String(index).padStart(4, '0')}`,
          gender: 'FEMALE',
          genderOnboardingCompleted: true,
          isEmailVerified: true,
          firstName: 'BIZ02',
          lastName: `Client ${index}`,
        },
      });
      fixtureIds.users.push(clientForConcurrency.id);
      await prisma.userRole.create({
        data: { userId: clientForConcurrency.id, roleId: clientRole.id },
      });
      concurrentClientTokens.push({
        userId: clientForConcurrency.id,
        token: jwtService.sign(
          { sub: clientForConcurrency.id },
          { expiresIn: '5m' },
        ),
      });
    }

    for (const suffixPart of ['a', 'b']) {
      const pickerClient = await prisma.user.create({
        data: {
          username: `${pickerQueryPrefix}-${suffixPart}`,
          email: `${pickerQueryPrefix}-${suffixPart}@example.test`,
          firstName: 'Picker',
          lastName: 'Fixture',
        },
      });
      fixtureIds.users.push(pickerClient.id);
      pickerClientIds.push(pickerClient.id);
      await prisma.userRole.create({
        data: { userId: pickerClient.id, roleId: clientRole.id },
      });
    }

    const mixedRoleClient = await prisma.user.create({
      data: {
        username: `${pickerQueryPrefix}-mixed-role`,
        email: `${pickerQueryPrefix}-mixed@example.test`,
        firstName: 'Picker',
        lastName: 'Mixed',
      },
    });
    fixtureIds.users.push(mixedRoleClient.id);
    mixedRoleClientId = mixedRoleClient.id;
    await prisma.userRole.createMany({
      data: [
        { userId: mixedRoleClient.id, roleId: clientRole.id },
        { userId: mixedRoleClient.id, roleId: stylistRole.id },
      ],
    });

    const category = await prisma.serviceCategory.create({
      data: { name: `Security category ${suffix}` },
    });
    fixtureIds.serviceCategory = category.id;
    const subcategory = await prisma.serviceSubcategory.create({
      data: {
        categoryId: category.id,
        name: `Security subcategory ${suffix}`,
      },
    });
    fixtureIds.serviceSubcategory = subcategory.id;
    serviceName = `Security test service ${suffix}`;
    const service = await prisma.service.create({
      data: {
        subcategoryId: subcategory.id,
        name: serviceName,
        durationMinutes: 45,
        price: 25,
        loyaltyEnabled: true,
        loyaltyMaxDiscountPercent: 20,
      },
    });
    fixtureIds.service = service.id;
    serviceId = service.id;

    const autoPublishGalleryCategory = await prisma.galleryCategory.create({
      data: {
        name: `Security before-after gallery ${suffix}`,
        autoPublishConsentedPairs: true,
      },
    });
    fixtureIds.galleryCategories.push(autoPublishGalleryCategory.id);

    const salon = await prisma.salonSettings.create({
      data: { name: `API-02 availability ${suffix}` },
    });
    fixtureIds.salonSettings = salon.id;

    const futureDate = new Date();
    futureDate.setDate(futureDate.getDate() + 14);
    futureDate.setHours(12, 0, 0, 0);
    availabilityDate = [
      futureDate.getFullYear(),
      String(futureDate.getMonth() + 1).padStart(2, '0'),
      String(futureDate.getDate()).padStart(2, '0'),
    ].join('-');
    const availabilityDay = futureDate.getDay();
    await prisma.salonWorkingHours.create({
      data: {
        salonSettingsId: salon.id,
        dayOfWeek: availabilityDay,
        openTime: '09:00',
        closeTime: '17:00',
        isWorkingDay: true,
      },
    });
    await prisma.stylistWorkingHours.create({
      data: {
        stylistProfileId: stylistProfile.id,
        dayOfWeek: availabilityDay,
        startTime: '09:00',
        endTime: '17:00',
        isWorkingDay: true,
      },
    });
    await prisma.stylistService.create({
      data: { stylistProfileId: stylistProfile.id, serviceId: service.id },
    });

    const beforeUpload = await prisma.upload.create({
      data: {
        originalName: `api02-before-${suffix}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 1,
        pathOriginal: `private/e2e/api02-before-${suffix}.jpg`,
        storageClass: 'PRIVATE',
      },
    });
    const afterUpload = await prisma.upload.create({
      data: {
        originalName: `api02-after-${suffix}.jpg`,
        mimeType: 'image/jpeg',
        sizeBytes: 1,
        pathOriginal: `private/e2e/api02-after-${suffix}.jpg`,
        storageClass: 'PRIVATE',
      },
    });
    fixtureIds.uploads.push(beforeUpload.id, afterUpload.id);

    for (const index of [0, 1]) {
      const entry = await prisma.dailyLogEntry.create({
        data: {
          stylistProfileId: stylistProfile.id,
          clientId: client.id,
          serviceId: service.id,
          kind: 'SERVICE',
          date: new Date(),
          actualPrice: 25,
          publicReferenceCode: `api02-gallery-${suffix}-${index}`,
          status: 'COMPLETED',
          completedAt: new Date(Date.now() - index * 60_000),
        },
      });
      fixtureIds.dailyLogEntries.push(entry.id);
      fixtureIds.consentedDailyLogEntries.push(entry.id);

      for (const imageInfo of [
        {
          upload: beforeUpload,
          isBefore: true,
          isAfter: false,
          side: 'before',
        },
        { upload: afterUpload, isBefore: false, isAfter: true, side: 'after' },
      ]) {
        const image = await prisma.dailyLogImage.create({
          data: {
            dailyLogEntryId: entry.id,
            uploadId: imageInfo.upload.id,
            isBefore: imageInfo.isBefore,
            isAfter: imageInfo.isAfter,
            sortOrder: imageInfo.isBefore ? 0 : 1,
          },
        });
        fixtureIds.dailyLogImages.push(image.id);
        if (index === 0 && imageInfo.isBefore) firstBeforeImageId = image.id;

        const derivative = await prisma.upload.create({
          data: {
            originalName: `api02-consented-${suffix}-${index}-${imageInfo.side}.webp`,
            mimeType: 'image/webp',
            sizeBytes: 1,
            pathOriginal: `private/consented/e2e/api02-${suffix}-${index}-${imageInfo.side}.webp`,
            storageClass: 'CONSENTED_PUBLIC',
          },
        });
        fixtureIds.uploads.push(derivative.id);
        fixtureIds.consentedUploadIds.push(derivative.id);

        const consent = await prisma.dailyLogImageConsent.create({
          data: {
            dailyLogImageId: image.id,
            clientId: client.id,
            purpose: 'PUBLIC_GALLERY',
            policyVersion: 'client-media-publication-v1',
            consentedAt: new Date(),
            publishedUploadId: derivative.id,
          },
        });
        fixtureIds.mediaConsents.push(consent.id);
        await prisma.dailyLogImageConsentEvent.create({
          data: {
            consentId: consent.id,
            action: 'GRANTED',
            actorId: client.id,
            purpose: 'PUBLIC_GALLERY',
            policyVersion: 'client-media-publication-v1',
            source: 'CLIENT_APP',
          },
        });
      }
    }

    const unconsentedEntry = await prisma.dailyLogEntry.create({
      data: {
        stylistProfileId: stylistProfile.id,
        clientId: client.id,
        serviceId: service.id,
        kind: 'SERVICE',
        date: new Date(),
        actualPrice: 25,
        publicReferenceCode: `api02-gallery-unconsented-${suffix}`,
        status: 'COMPLETED',
        completedAt: new Date(Date.now() - 120_000),
      },
    });
    fixtureIds.dailyLogEntries.push(unconsentedEntry.id);
    unconsentedDailyLogEntryId = unconsentedEntry.id;
    await prisma.dailyLogImage.createMany({
      data: [
        {
          dailyLogEntryId: unconsentedEntry.id,
          uploadId: beforeUpload.id,
          isBefore: true,
          sortOrder: 0,
        },
        {
          dailyLogEntryId: unconsentedEntry.id,
          uploadId: afterUpload.id,
          isAfter: true,
          sortOrder: 1,
        },
      ],
    });

    const reviewPageCreatedAt = new Date('2026-01-02T12:00:00.000Z');
    const secondReviewPageCreatedAt = new Date('2026-01-01T12:00:00.000Z');
    const publishedReview = await prisma.review.create({
      data: {
        userId: client.id,
        serviceId: service.id,
        serviceRating: 5,
        comment: 'Approved review fixture.',
        isApproved: true,
        createdAt: reviewPageCreatedAt,
      },
    });
    fixtureIds.reviews.push(publishedReview.id);
    publishedReviewId = publishedReview.id;

    const secondPublishedReview = await prisma.review.create({
      data: {
        userId: owner.id,
        serviceId: service.id,
        serviceRating: 4,
        comment: 'Second approved review fixture.',
        isApproved: true,
        createdAt: secondReviewPageCreatedAt,
      },
    });
    fixtureIds.reviews.push(secondPublishedReview.id);
    secondPublishedReviewId = secondPublishedReview.id;

    const pendingReview = await prisma.review.create({
      data: {
        userId: client.id,
        serviceId: service.id,
        serviceRating: 2,
        comment: 'Pending review fixture.',
        isApproved: false,
      },
    });
    fixtureIds.reviews.push(pendingReview.id);
    pendingReviewId = pendingReview.id;

    const publishedPost = await prisma.blogPost.create({
      data: {
        authorId: owner.id,
        title: `Published security post ${suffix}`,
        slug: `published-security-${suffix}`,
        excerpt: 'Published test excerpt.',
        content: '<p>Published article fixture.</p>',
        isPublished: true,
        publishedAt: new Date(),
      },
    });
    fixtureIds.posts.push(publishedPost.id);
    publishedPostId = publishedPost.id;
    publishedPostSlug = publishedPost.slug;

    const draftPost = await prisma.blogPost.create({
      data: {
        authorId: owner.id,
        title: `Draft security post ${suffix}`,
        slug: `draft-security-${suffix}`,
        content: '<p>Draft article fixture.</p>',
        isPublished: false,
      },
    });
    fixtureIds.posts.push(draftPost.id);
    draftPostId = draftPost.id;
    draftPostSlug = draftPost.slug;

    const approvedComment = await prisma.blogComment.create({
      data: {
        postId: publishedPost.id,
        userId: client.id,
        content: 'Approved comment fixture.',
        isApproved: true,
      },
    });
    fixtureIds.comments.push(approvedComment.id);
    approvedCommentId = approvedComment.id;

    const pendingComment = await prisma.blogComment.create({
      data: {
        postId: publishedPost.id,
        userId: client.id,
        content: 'Pending comment fixture.',
        isApproved: false,
      },
    });
    fixtureIds.comments.push(pendingComment.id);
    pendingCommentId = pendingComment.id;

    const approvedDraftComment = await prisma.blogComment.create({
      data: {
        postId: draftPost.id,
        userId: client.id,
        content: 'Approved comment on draft fixture.',
        isApproved: true,
      },
    });
    fixtureIds.comments.push(approvedDraftComment.id);
  }, 30000);

  afterAll(async () => {
    try {
      if (!prisma) return;
      if (fixtureIds.comments.length) {
        await prisma.blogComment.deleteMany({
          where: { id: { in: fixtureIds.comments } },
        });
      }
      if (fixtureIds.posts.length) {
        await prisma.blogPost.deleteMany({
          where: { id: { in: fixtureIds.posts } },
        });
      }
      if (fixtureIds.reviews.length) {
        await prisma.review.deleteMany({
          where: { id: { in: fixtureIds.reviews } },
        });
      }
      if (fixtureIds.mediaConsents.length) {
        await prisma.dailyLogImageConsentEvent.deleteMany({
          where: { consentId: { in: fixtureIds.mediaConsents } },
        });
        await prisma.dailyLogImageConsent.deleteMany({
          where: { id: { in: fixtureIds.mediaConsents } },
        });
      }
      if (fixtureIds.incomeManualEntries.length) {
        await prisma.incomeBookManualEntry.deleteMany({
          where: { id: { in: fixtureIds.incomeManualEntries } },
        });
      }
      if (fixtureIds.clientDebts.length) {
        await prisma.incomeBookManualEntry.deleteMany({
          where: {
            dailyLogEntry: {
              is: { debtId: { in: fixtureIds.clientDebts } },
            },
          },
        });
        await prisma.dailyLogEntry.deleteMany({
          where: { debtId: { in: fixtureIds.clientDebts } },
        });
        await prisma.clientDebt.deleteMany({
          where: { id: { in: fixtureIds.clientDebts } },
        });
      }
      if (fixtureIds.dailyLogEntries.length) {
        await prisma.dailyLogEntry.deleteMany({
          where: { id: { in: fixtureIds.dailyLogEntries } },
        });
      }
      const bookingFixtureReservations =
        fixtureIds.users.length && fixtureIds.service
          ? await prisma.reservation.findMany({
              where: {
                serviceId: fixtureIds.service,
                clientId: { in: fixtureIds.users },
              },
              select: { id: true },
            })
          : [];
      const reservationIdsToDelete = [
        ...new Set([
          ...fixtureIds.reservationIds,
          ...bookingFixtureReservations.map(({ id }) => id),
        ]),
      ];
      if (reservationIdsToDelete.length) {
        await prisma.outboxEvent.deleteMany({
          where: { aggregateId: { in: reservationIdsToDelete } },
        });
        await prisma.reservation.deleteMany({
          where: { id: { in: reservationIdsToDelete } },
        });
      }
      if (fixtureIds.incomeBookId) {
        const [autoTotals, manualTotals] = await Promise.all([
          prisma.incomeBookEntry.aggregate({
            where: { bookId: fixtureIds.incomeBookId },
            _sum: { amount: true, tipAmount: true },
          }),
          prisma.incomeBookManualEntry.aggregate({
            where: { bookId: fixtureIds.incomeBookId },
            _sum: { amount: true, tipAmount: true },
          }),
        ]);
        await prisma.incomeBook.update({
          where: { id: fixtureIds.incomeBookId },
          data: {
            totalRevenue:
              Number(autoTotals._sum.amount ?? 0) +
              Number(manualTotals._sum.amount ?? 0),
            totalTips:
              Number(autoTotals._sum.tipAmount ?? 0) +
              Number(manualTotals._sum.tipAmount ?? 0),
          },
        });
      }
      if (fixtureIds.incomeBookCreatedByTest) {
        await prisma.incomeBook.deleteMany({
          where: { id: fixtureIds.incomeBookCreatedByTest },
        });
      }
      if (fixtureIds.galleryCategories.length) {
        await prisma.galleryCategory.deleteMany({
          where: { id: { in: fixtureIds.galleryCategories } },
        });
      }
      if (fixtureIds.uploads.length) {
        await prisma.upload.deleteMany({
          where: { id: { in: fixtureIds.uploads } },
        });
      }
      if (fixtureIds.users.length) {
        await prisma.upload.deleteMany({
          where: { uploadedById: { in: fixtureIds.users } },
        });
      }
      if (fixtureIds.additionalStylistProfiles.length) {
        await prisma.stylistProfile.deleteMany({
          where: { id: { in: fixtureIds.additionalStylistProfiles } },
        });
      }
      if (fixtureIds.stylistProfile) {
        await prisma.stylistProfile.deleteMany({
          where: { id: fixtureIds.stylistProfile },
        });
      }
      if (fixtureIds.salonSettings) {
        await prisma.salonSettings.deleteMany({
          where: { id: fixtureIds.salonSettings },
        });
      }
      if (fixtureIds.service) {
        await prisma.service.deleteMany({
          where: { id: fixtureIds.service },
        });
      }
      if (fixtureIds.serviceSubcategory) {
        await prisma.serviceSubcategory.deleteMany({
          where: { id: fixtureIds.serviceSubcategory },
        });
      }
      if (fixtureIds.serviceCategory) {
        await prisma.serviceCategory.deleteMany({
          where: { id: fixtureIds.serviceCategory },
        });
      }
      if (fixtureIds.users.length) {
        await prisma.userRole.deleteMany({
          where: { userId: { in: fixtureIds.users } },
        });
        await prisma.user.deleteMany({
          where: { id: { in: fixtureIds.users } },
        });
      }
    } finally {
      try {
        if (app) await app.close();
      } finally {
        if (uploadRoot) {
          await rm(uploadRoot, { recursive: true, force: true });
        }
      }
    }
  });

  it('validates and paginates the public non-random before/after gallery', async () => {
    await request(getHttpServer(app!))
      .get('/api/daily-log/before-after')
      .query({ serviceId, limit: 1.5 })
      .expect(400);

    await request(getHttpServer(app!))
      .get('/api/daily-log/before-after')
      .query({ serviceId, offset: 1001 })
      .expect(400);

    const firstPage = await request(getHttpServer(app!))
      .get('/api/daily-log/before-after')
      .query({ serviceId, limit: 1, offset: 0 })
      .expect(200);

    expect(firstPage.body.items).toHaveLength(1);
    expect(firstPage.body.items[0]).toMatchObject({
      id: fixtureIds.consentedDailyLogEntries[0],
    });
    expect(firstPage.body.items[0]).not.toHaveProperty('service');
    expect(firstPage.body.items[0]).not.toHaveProperty('completedAt');
    expect(firstPage.body.items[0]).not.toHaveProperty('clientId');
    expect(firstPage.body.items[0].before.pathOriginal).toBe(
      `/api/media/consents/${fixtureIds.mediaConsents[0]}/file`,
    );
    expect(firstPage.body.items[0].after.pathOriginal).toBe(
      `/api/media/consents/${fixtureIds.mediaConsents[1]}/file`,
    );
    expect(firstPage.body.hasMore).toBe(true);
    expect(firstPage.body.nextOffset).toBe(1);

    const secondPage = await request(getHttpServer(app!))
      .get('/api/daily-log/before-after')
      .query({ serviceId, limit: 1, offset: 1 })
      .expect(200);

    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0].id).toBe(
      fixtureIds.consentedDailyLogEntries[1],
    );
    expect(secondPage.body.hasMore).toBe(false);
    expect(secondPage.body.nextOffset).toBe(2);

    const randomPage = await request(getHttpServer(app!))
      .get('/api/daily-log/before-after')
      .query({ serviceId, random: 'true', limit: 100, offset: 1001 })
      .expect(200);
    expect(randomPage.body.items).toHaveLength(2);
    expect(
      randomPage.body.items.map((item: { id: string }) => item.id),
    ).toEqual(expect.arrayContaining(fixtureIds.consentedDailyLogEntries));
    expect(
      randomPage.body.items.map((item: { id: string }) => item.id),
    ).not.toContain(unconsentedDailyLogEntryId);
    expect(randomPage.body).toMatchObject({ hasMore: false, nextOffset: 0 });
  });

  it('revokes client photo publication from the public feed and direct file route', async () => {
    const consentId = fixtureIds.mediaConsents[0];
    const derivativeUploadId = fixtureIds.consentedUploadIds[0];
    if (!consentId || !derivativeUploadId || !firstBeforeImageId) {
      throw new Error('Synthetic consent fixture is incomplete.');
    }

    const activeFile = await request(getHttpServer(app!))
      .get(`/api/media/consents/${consentId}/file`)
      .expect(200);
    expect(activeFile.headers['cache-control']).toContain('no-store');
    expect(readConsentDerivativeMock).toHaveBeenCalledWith(derivativeUploadId);

    const revoke = await request(getHttpServer(app!))
      .delete(`/api/media/consents/${firstBeforeImageId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(revoke.body.revoked).toBe(true);

    const publicPage = await request(getHttpServer(app!))
      .get('/api/daily-log/before-after')
      .query({ serviceId, limit: 50 })
      .expect(200);
    expect(
      publicPage.body.items.map((item: { id: string }) => item.id),
    ).toEqual([fixtureIds.consentedDailyLogEntries[1]]);

    await request(getHttpServer(app!))
      .get(`/api/media/consents/${consentId}/file`)
      .expect(404);
    expect(readConsentDerivativeMock).toHaveBeenCalledTimes(1);
  });

  it('excludes inactive services, catalog parents and stylist profiles from availability', async () => {
    const testPrisma = prisma!;
    const subcategoryId = fixtureIds.serviceSubcategory;
    const categoryId = fixtureIds.serviceCategory;
    const stylistProfileId = fixtureIds.stylistProfile;
    if (!subcategoryId || !categoryId || !stylistProfileId) {
      throw new Error('Synthetic availability fixture is incomplete.');
    }

    const requestSlots = () =>
      request(getHttpServer(app!))
        .get('/api/reservations/availability/slots')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({ serviceId, date: availabilityDate });

    try {
      await testPrisma.service.update({
        where: { id: serviceId },
        data: { isActive: false },
      });
      await requestSlots().expect(404);
      await testPrisma.service.update({
        where: { id: serviceId },
        data: { isActive: true },
      });

      await testPrisma.serviceSubcategory.update({
        where: { id: subcategoryId },
        data: { isActive: false },
      });
      await requestSlots().expect(404);
      await testPrisma.serviceSubcategory.update({
        where: { id: subcategoryId },
        data: { isActive: true },
      });

      await testPrisma.serviceCategory.update({
        where: { id: categoryId },
        data: { isActive: false },
      });
      await requestSlots().expect(404);
      await testPrisma.serviceCategory.update({
        where: { id: categoryId },
        data: { isActive: true },
      });

      await testPrisma.stylistProfile.update({
        where: { id: stylistProfileId },
        data: { isActive: false },
      });
      const slots = await requestSlots().expect(200);
      expect(slots.body).toEqual([]);
    } finally {
      await Promise.all([
        testPrisma.service.update({
          where: { id: serviceId },
          data: { isActive: true },
        }),
        testPrisma.serviceSubcategory.update({
          where: { id: subcategoryId },
          data: { isActive: true },
        }),
        testPrisma.serviceCategory.update({
          where: { id: categoryId },
          data: { isActive: true },
        }),
        testPrisma.stylistProfile.update({
          where: { id: stylistProfileId },
          data: { isActive: true },
        }),
      ]);
    }
  });

  it('validates availability date ranges and returns database-backed dates and slots', async () => {
    const httpServer = getHttpServer(app!);
    const dateQuery = {
      serviceIds: serviceId,
      fromDate: availabilityDate,
      toDate: availabilityDate,
    };

    await request(httpServer)
      .get('/api/reservations/availability/dates')
      .query(dateQuery)
      .expect(401);

    await request(httpServer)
      .get('/api/reservations/availability/dates')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ ...dateQuery, fromDate: 'not-a-date' })
      .expect(400);

    await request(httpServer)
      .get('/api/reservations/availability/dates')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ fromDate: '2030-01-02', toDate: '2030-01-01', serviceId })
      .expect(400);

    await request(httpServer)
      .get('/api/reservations/availability/dates')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ fromDate: '2030-01-01', toDate: '2030-04-01', serviceId })
      .expect(400);

    const dates = await request(httpServer)
      .get('/api/reservations/availability/dates')
      .set('Authorization', `Bearer ${clientToken}`)
      .query(dateQuery)
      .expect(200);
    expect(dates.body).toHaveLength(1);
    expect(dates.body[0].date).toBe(availabilityDate);
    expect(dates.body[0].available).toBe(true);

    const slots = await request(httpServer)
      .get('/api/reservations/availability/slots')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ serviceId, date: availabilityDate })
      .expect(200);
    expect(slots.body.length).toBeGreaterThan(0);
    expect(slots.body[0]).toMatchObject({
      startTime: '09:00',
      endTime: '09:45',
      availableStylistCount: 1,
      holdState: 'none',
    });
  });

  it('reports a bounded concurrent availability HTTP smoke sample', async () => {
    const httpServer = getHttpServer(app!);
    const requestCount = 10;
    const latencies = await Promise.all(
      Array.from({ length: requestCount }, async () => {
        const startedAt = performance.now();
        const response = await request(httpServer)
          .get('/api/reservations/availability/dates')
          .set('Authorization', `Bearer ${clientToken}`)
          .query({
            serviceIds: serviceId,
            fromDate: availabilityDate,
            toDate: availabilityDate,
          })
          .expect(200);
        const elapsedMs = performance.now() - startedAt;

        expect(response.body).toHaveLength(1);
        expect(response.body[0]).toMatchObject({
          date: availabilityDate,
          available: true,
        });
        return elapsedMs;
      }),
    );
    const sortedLatencies = [...latencies].sort((a, b) => a - b);
    const percentile = (ratio: number) =>
      sortedLatencies[Math.ceil(ratio * sortedLatencies.length) - 1];
    const summary = [
      '### API-02 availability HTTP smoke sample',
      '',
      `- Synthetic disposable-PostgreSQL fixture; ${requestCount} parallel authenticated one-day requests.`,
      `- Client-observed latency on this CI runner: p50 ${percentile(0.5).toFixed(1)} ms; p95 ${percentile(0.95).toFixed(1)} ms; max ${sortedLatencies[sortedLatencies.length - 1].toFixed(1)} ms.`,
      '- Report-only smoke sample; not a representative production load test or latency gate.',
      '',
    ].join('\n');

    console.info(summary);
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      try {
        await appendFile(summaryPath, summary);
      } catch {
        console.warn(
          'Could not append API-02 smoke metrics to the job summary.',
        );
      }
    }
  });

  it('reports a bounded 60-second synthetic availability and gallery soak sample', async () => {
    const httpServer = getHttpServer(app!);
    if (!httpServer.listening) await app!.listen(0);
    const durationMs = 60_000;
    const concurrencyPerEndpoint = 4;

    const measureEndpoint = async (
      sendRequest: () => Promise<number>,
    ): Promise<{
      attempts: number;
      elapsedMs: number;
      error?: unknown;
      latencies: number[];
    }> => {
      const startedAt = performance.now();
      const deadline = startedAt + durationMs;
      let attempts = 0;
      let error: unknown;
      const latencies: number[] = [];

      const worker = async () => {
        while (!error && performance.now() < deadline) {
          attempts += 1;
          try {
            latencies.push(await sendRequest());
          } catch (caught) {
            error = caught;
          }
        }
      };

      await Promise.all(Array.from({ length: concurrencyPerEndpoint }, worker));
      return {
        attempts,
        elapsedMs: performance.now() - startedAt,
        error,
        latencies,
      };
    };

    const requestAvailability = async () => {
      const startedAt = performance.now();
      const response = await request(httpServer)
        .get('/api/reservations/availability/dates')
        .set('Authorization', `Bearer ${clientToken}`)
        .query({
          serviceIds: serviceId,
          fromDate: availabilityDate,
          toDate: availabilityDate,
        })
        .expect(200);
      expect(response.body).toHaveLength(1);
      expect(response.body[0]).toMatchObject({
        date: availabilityDate,
        available: true,
      });
      return performance.now() - startedAt;
    };

    const requestGallery = async () => {
      const startedAt = performance.now();
      const response = await request(httpServer)
        .get('/api/daily-log/before-after')
        .query({ serviceId, limit: 1, offset: 0 })
        .expect(200);
      expect(response.body.items).toHaveLength(1);
      expect(response.body.items[0].id).toBe(
        fixtureIds.consentedDailyLogEntries[1],
      );
      expect(response.body.hasMore).toBe(false);
      return performance.now() - startedAt;
    };

    const [availability, gallery] = await Promise.all([
      measureEndpoint(requestAvailability),
      measureEndpoint(requestGallery),
    ]);
    const describeSample = (
      name: string,
      sample: { attempts: number; elapsedMs: number; latencies: number[] },
    ) => {
      const sorted = [...sample.latencies].sort((a, b) => a - b);
      const percentile = (ratio: number) =>
        sorted.length ? sorted[Math.ceil(ratio * sorted.length) - 1] : 0;
      const requestsPerSecond =
        sample.latencies.length / (sample.elapsedMs / 1000);
      const failed = sample.attempts - sample.latencies.length;
      return `- ${name}: ${sample.latencies.length}/${sample.attempts} successful requests (${failed} failed) over ${(sample.elapsedMs / 1000).toFixed(1)} s; ${requestsPerSecond.toFixed(1)} successful requests/s; client-observed p50 ${percentile(0.5).toFixed(1)} ms, p95 ${percentile(0.95).toFixed(1)} ms, max ${(sorted.at(-1) ?? 0).toFixed(1)} ms.`;
    };
    const summary = [
      '### API-02 synthetic CI soak sample',
      '',
      `- Disposable PostgreSQL fixtures; ${durationMs / 1000}-second window; ${concurrencyPerEndpoint} concurrent requests per endpoint (up to ${concurrencyPerEndpoint * 2} HTTP requests across both).`,
      describeSample('Authenticated one-day availability dates', availability),
      describeSample('Public non-random gallery page', gallery),
      '- Report-only synthetic CI measurement with no latency/throughput gate; not representative production load testing. Random gallery mode was not exercised.',
      '',
    ].join('\n');

    console.info(summary);
    const summaryPath = process.env.GITHUB_STEP_SUMMARY;
    if (summaryPath) {
      try {
        await appendFile(summaryPath, summary);
      } catch {
        console.warn(
          'Could not append API-02 soak metrics to the job summary.',
        );
      }
    }

    expect(availability.error).toBeUndefined();
    expect(gallery.error).toBeUndefined();
  }, 90_000);

  it('returns bounded approved review pages and reserves pending reads for moderators', async () => {
    await request(getHttpServer(app!))
      .get(`/api/reviews?serviceId=${serviceId}&limit=1.5`)
      .expect(400);
    await request(getHttpServer(app!))
      .get(`/api/reviews?serviceId=${serviceId}&limit=51`)
      .expect(400);
    await request(getHttpServer(app!))
      .get(`/api/reviews?serviceId=${serviceId}&offset=1001`)
      .expect(400);
    await request(getHttpServer(app!))
      .get(`/api/reviews?serviceId=${serviceId}&approved=false`)
      .expect(400);

    const firstPage = await request(getHttpServer(app!))
      .get(`/api/reviews?serviceId=${serviceId}&approved=true&limit=1&offset=0`)
      .expect(200);
    expect(firstPage.body).toMatchObject({
      total: 2,
      limit: 1,
      offset: 0,
      hasMore: true,
      nextOffset: 1,
    });
    expect(firstPage.body.items).toHaveLength(1);
    expect(firstPage.body.items[0]).toMatchObject({
      id: publishedReviewId,
      serviceRating: 5,
      comment: 'Approved review fixture.',
      isApproved: true,
      user: { firstName: 'Test', lastName: 'Client' },
      service: { name: serviceName },
      stylist: null,
    });
    expect(firstPage.body.items[0]).not.toHaveProperty('user.email');
    expect(firstPage.body.items[0]).not.toHaveProperty('user.passwordHash');
    expect(firstPage.body.items[0]).not.toHaveProperty('reservationId');

    const secondPage = await request(getHttpServer(app!))
      .get(`/api/reviews?serviceId=${serviceId}&limit=1&offset=1`)
      .expect(200);
    expect(secondPage.body).toMatchObject({
      total: 2,
      limit: 1,
      offset: 1,
      hasMore: false,
      nextOffset: 2,
    });
    expect(secondPage.body.items).toHaveLength(1);
    expect(secondPage.body.items[0].id).toBe(secondPublishedReviewId);

    const defaultPage = await request(getHttpServer(app!))
      .get(`/api/reviews?serviceId=${serviceId}`)
      .expect(200);
    expect(defaultPage.body).toMatchObject({
      total: 2,
      limit: 20,
      offset: 0,
      hasMore: false,
      nextOffset: 2,
    });
    expect(defaultPage.body.items).toHaveLength(2);

    await request(getHttpServer(app!))
      .get(`/api/reviews/${publishedReviewId}`)
      .expect(401);
    const detail = await request(getHttpServer(app!))
      .get(`/api/reviews/${publishedReviewId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      id: publishedReviewId,
      serviceRating: 5,
      isApproved: true,
      user: { firstName: 'Test', lastName: 'Client' },
    });
    expect(detail.body.user).not.toHaveProperty('email');
    await request(getHttpServer(app!))
      .get(`/api/reviews/${pendingReviewId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(404);

    await request(getHttpServer(app!))
      .get(`/api/reviews/admin?serviceId=${serviceId}&approved=false`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    const pendingForOwner = await request(getHttpServer(app!))
      .get(`/api/reviews/admin?serviceId=${serviceId}&approved=false`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(pendingForOwner.body).toHaveLength(1);
    expect(pendingForOwner.body[0]).toMatchObject({
      id: pendingReviewId,
      serviceRating: 2,
      isApproved: false,
    });
  });

  it('bounds and strictly validates public service and stylist catalog pages', async () => {
    const categoryPage = await request(getHttpServer(app!))
      .get('/api/services/categories?activeOnly=true&page=0&pageSize=1')
      .expect(200);
    expect(categoryPage.body).toMatchObject({
      total: 1,
      page: 0,
      pageSize: 1,
      hasMore: false,
      nextPage: null,
    });
    expect(categoryPage.body.items[0]).toMatchObject({
      id: fixtureIds.serviceCategory,
    });

    const subcategoryPage = await request(getHttpServer(app!))
      .get(
        `/api/services/subcategories?categoryId=${fixtureIds.serviceCategory}&activeOnly=true&page=0&pageSize=1`,
      )
      .expect(200);
    expect(subcategoryPage.body).toMatchObject({
      total: 1,
      page: 0,
      pageSize: 1,
      hasMore: false,
      nextPage: null,
    });
    expect(subcategoryPage.body.items[0]).toMatchObject({
      id: fixtureIds.serviceSubcategory,
      categoryId: fixtureIds.serviceCategory,
    });

    const servicePage = await request(getHttpServer(app!))
      .get(
        `/api/services?subcategoryId=${fixtureIds.serviceSubcategory}&activeOnly=true&page=0&pageSize=1`,
      )
      .expect(200);
    expect(servicePage.body).toMatchObject({
      total: 1,
      page: 0,
      pageSize: 1,
      hasMore: false,
      nextPage: null,
    });
    expect(servicePage.body.items).toHaveLength(1);
    expect(servicePage.body.items[0].id).toBe(serviceId);

    const stylistPage = await request(getHttpServer(app!))
      .get('/api/stylists?activeOnly=true')
      .expect(200);
    expect(stylistPage.body).toMatchObject({
      page: 0,
      pageSize: 20,
    });
    expect(stylistPage.body.total).toBeGreaterThanOrEqual(1);
    expect(stylistPage.body.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ id: fixtureIds.stylistProfile }),
      ]),
    );

    const stylistServicesPage = await request(getHttpServer(app!))
      .get(
        `/api/stylists/${fixtureIds.stylistProfile}/services?page=0&pageSize=1`,
      )
      .expect(200);
    expect(stylistServicesPage.body).toMatchObject({
      total: 1,
      page: 0,
      pageSize: 1,
      hasMore: false,
      nextPage: null,
    });
    expect(stylistServicesPage.body.items[0].serviceId).toBe(serviceId);

    await request(getHttpServer(app!))
      .get(
        `/api/stylists/${fixtureIds.stylistProfile}/services?page=21&pageSize=50`,
      )
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services/categories?page=invalid')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services/categories?pageSize=51')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services/categories?activeOnly=yes')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services/subcategories?categoryId=&activeOnly=true')
      .expect(400);
    await request(getHttpServer(app!))
      .get(`/api/services/subcategories?categoryId=${'x'.repeat(129)}`)
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services/subcategories?page=21&pageSize=50')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services/subcategories?unexpected=true')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services?page=invalid')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services?page=0&pageSize=51')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services?page=21&pageSize=50')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services?activeOnly=yes')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/services?sort=name')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/stylists?page=1.5')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/stylists?page=0&pageSize=51')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/stylists?activeOnly=maybe')
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/stylists?limit=50')
      .expect(400);
  });

  it('strictly bounds admin, client and stylist analytics date inputs', async () => {
    await request(getHttpServer(app!))
      .get('/api/analytics/dashboard?monthsBack=61')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    await request(getHttpServer(app!))
      .get(
        '/api/analytics/dashboard?monthsBack=12&fromDate=2026-01-01&toDate=2026-12-31',
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/analytics/dashboard?monthsBack=abc')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/analytics/dashboard?fromDate=2026-01-01')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    await request(getHttpServer(app!))
      .get('/api/analytics/dashboard?monthsBack=12&unexpected=true')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);

    await request(getHttpServer(app!))
      .get(`/api/users/${clientUserId}/analytics?fromDate=2026-01-01`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    await request(getHttpServer(app!))
      .get(
        `/api/users/${clientUserId}/analytics?fromDate=2020-01-01&toDate=2025-01-02`,
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
    await request(getHttpServer(app!))
      .get(
        `/api/stylists/${fixtureIds.stylistProfile}/analytics?fromDate=2026-02-31&toDate=2026-03-01`,
      )
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(400);
  });

  it('keeps the public blog list published-only and returns the selected detail', async () => {
    await request(getHttpServer(app!))
      .get('/api/blog?published=false')
      .expect(400);
    await request(getHttpServer(app!)).get('/api/blog?limit=51').expect(400);
    await request(getHttpServer(app!)).get('/api/blog?offset=1001').expect(400);
    const publicList = await request(getHttpServer(app!))
      .get('/api/blog?limit=20&offset=0')
      .expect(200);
    expect(publicList.body).toMatchObject({
      limit: 20,
      offset: 0,
      hasMore: false,
      nextOffset: 1,
    });
    expect(publicList.body.total).toBeGreaterThanOrEqual(1);
    const publicSlugs = publicList.body.items.map(
      (post: { slug: string }) => post.slug,
    );
    expect(publicSlugs).toContain(publishedPostSlug);
    expect(publicSlugs).not.toContain(draftPostSlug);
    const listRow = publicList.body.items.find(
      (post: { slug: string }) => post.slug === publishedPostSlug,
    );
    expect(listRow).not.toHaveProperty('content');
    expect(listRow).not.toHaveProperty('author.email');

    const detail = await request(getHttpServer(app!))
      .get(`/api/blog/slug/${publishedPostSlug}`)
      .expect(200);
    expect(detail.body).toMatchObject({
      id: publishedPostId,
      slug: publishedPostSlug,
      isPublished: true,
      author: { firstName: 'Test', lastName: 'Owner' },
    });
    expect(detail.body.content).toBe('<p>Published article fixture.</p>');
    expect(detail.body.author).not.toHaveProperty('email');
    await request(getHttpServer(app!))
      .get(`/api/blog/slug/${draftPostSlug}`)
      .expect(404);
  });

  it('returns only approved comments for published posts and guards admin/draft reads', async () => {
    await request(getHttpServer(app!))
      .get(`/api/blog/${publishedPostId}/comments?approved=false`)
      .expect(400);
    await request(getHttpServer(app!))
      .get(`/api/blog/${publishedPostId}/comments?limit=51`)
      .expect(400);
    await request(getHttpServer(app!))
      .get(`/api/blog/${publishedPostId}/comments?offset=1001`)
      .expect(400);
    const publicComments = await request(getHttpServer(app!))
      .get(`/api/blog/${publishedPostId}/comments?limit=20&offset=0`)
      .expect(200);
    expect(publicComments.body).toMatchObject({
      total: 1,
      limit: 20,
      offset: 0,
      hasMore: false,
      nextOffset: 1,
    });
    expect(
      publicComments.body.items.map((comment: { id: string }) => comment.id),
    ).toEqual([approvedCommentId]);
    expect(publicComments.body.items[0].user).toEqual({
      firstName: 'Test',
      lastName: 'Client',
    });
    expect(publicComments.body.items[0].user).not.toHaveProperty('email');

    const commentsOnDraft = await request(getHttpServer(app!))
      .get(`/api/blog/${draftPostId}/comments`)
      .expect(200);
    expect(commentsOnDraft.body).toMatchObject({
      items: [],
      total: 0,
      hasMore: false,
      nextOffset: 0,
    });

    await request(getHttpServer(app!)).get('/api/blog/admin').expect(401);
    await request(getHttpServer(app!))
      .get('/api/blog/admin')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    const adminPosts = await request(getHttpServer(app!))
      .get('/api/blog/admin')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(adminPosts.body.map((post: { id: string }) => post.id)).toEqual(
      expect.arrayContaining([publishedPostId, draftPostId]),
    );
    const fixtureAdminPost = adminPosts.body.find(
      (post: { id: string }) => post.id === draftPostId,
    );
    expect(fixtureAdminPost).toMatchObject({
      author: { firstName: 'Test', lastName: 'Owner' },
    });
    expect(fixtureAdminPost).not.toHaveProperty('author.email');

    await request(getHttpServer(app!))
      .get(`/api/blog/${draftPostId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    await request(getHttpServer(app!))
      .get(`/api/blog/${draftPostId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);

    await request(getHttpServer(app!))
      .get(`/api/blog/${publishedPostId}/comments/admin`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    const adminComments = await request(getHttpServer(app!))
      .get(`/api/blog/${publishedPostId}/comments/admin`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(
      adminComments.body.map((comment: { id: string }) => comment.id),
    ).toEqual(expect.arrayContaining([approvedCommentId, pendingCommentId]));
  });

  it('applies the SEC-02 role matrix to the client picker and admin route', async () => {
    await request(getHttpServer(app!)).get('/api/users/clients').expect(401);
    await request(getHttpServer(app!))
      .get('/api/users/clients/admin')
      .expect(401);

    await request(getHttpServer(app!))
      .get('/api/users/clients')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    await request(getHttpServer(app!))
      .get('/api/users/clients/admin')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);

    await request(getHttpServer(app!))
      .get('/api/users/clients')
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(200);
    await request(getHttpServer(app!))
      .get('/api/users/clients/admin')
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(403);

    await request(getHttpServer(app!))
      .get('/api/users/clients/admin')
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    await request(getHttpServer(app!))
      .get('/api/users/clients/admin')
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .expect(200);
  });

  it('allows self/admin user detail, denies other-client/stylist access, and omits credentials', async () => {
    const self = await request(getHttpServer(app!))
      .get(`/api/users/${clientUserId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(self.body).toMatchObject({
      id: clientUserId,
      email: clientEmail,
      phone: '+38761000000',
    });

    for (const privateField of [
      'passwordHash',
      'emailVerificationToken',
      'emailVerificationExpiresAt',
      'googleId',
      'facebookId',
      'lastLoginAt',
      'passwordChangedAt',
    ]) {
      expect(self.body).not.toHaveProperty(privateField);
    }

    const otherClientId = pickerClientIds[0];
    await request(getHttpServer(app!))
      .get(`/api/users/${otherClientId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(403);
    await request(getHttpServer(app!))
      .get(`/api/users/${clientUserId}`)
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(403);

    const ownerDetail = await request(getHttpServer(app!))
      .get(`/api/users/${clientUserId}`)
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(ownerDetail.body.id).toBe(clientUserId);
    expect(ownerDetail.body).not.toHaveProperty('passwordHash');
    expect(ownerDetail.body).not.toHaveProperty('emailVerificationToken');

    const systemAdminDetail = await request(getHttpServer(app!))
      .get(`/api/users/${clientUserId}`)
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .expect(200);
    expect(systemAdminDetail.body.id).toBe(clientUserId);
    expect(systemAdminDetail.body).not.toHaveProperty('passwordHash');
  });

  it('returns a minimal picker projection and clamps validated pagination', async () => {
    const response = await request(getHttpServer(app!))
      .get('/api/users/clients')
      .query({ q: pickerQueryPrefix })
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(200);

    expect(response.body).toMatchObject({ page: 0, pageSize: 20 });
    expect(response.body).not.toHaveProperty('total');
    expect(response.body.items).toHaveLength(2);
    expect(response.body.items.map((user: { id: string }) => user.id)).toEqual(
      expect.arrayContaining(pickerClientIds),
    );
    expect(
      response.body.items.map((user: { id: string }) => user.id),
    ).not.toContain(mixedRoleClientId);

    const pickerFields = ['id', 'username', 'firstName', 'lastName', 'gender'];
    for (const user of response.body.items as Array<Record<string, unknown>>) {
      expect(Object.keys(user).sort()).toEqual([...pickerFields].sort());
      for (const privateField of [
        'email',
        'phone',
        'passwordHash',
        'emailVerificationToken',
        'emailVerificationExpiresAt',
        'googleId',
        'facebookId',
        'mustChangePassword',
      ]) {
        expect(user).not.toHaveProperty(privateField);
      }
    }

    const emailSearch = await request(getHttpServer(app!))
      .get('/api/users/clients')
      .query({ q: clientEmail })
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(200);
    expect(emailSearch.body.items).toEqual([]);

    const clampedPage = await request(getHttpServer(app!))
      .get('/api/users/clients')
      .query({ q: pickerQueryPrefix, page: 999, pageSize: 1 })
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(200);
    expect(clampedPage.body).toMatchObject({ page: 1, pageSize: 1 });
    expect(clampedPage.body.items).toHaveLength(1);

    await request(getHttpServer(app!))
      .get('/api/users/clients')
      .query({ pageSize: 101 })
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(400);
  });

  it('allows only admin/owner expanded fields and reserves email search for them', async () => {
    const ownerList = await request(getHttpServer(app!))
      .get('/api/users/clients/admin')
      .query({ q: clientEmail, page: 0, pageSize: 10 })
      .set('Authorization', `Bearer ${ownerToken}`)
      .expect(200);
    expect(ownerList.body).toMatchObject({ total: 1, page: 0, pageSize: 10 });
    expect(ownerList.body.items).toHaveLength(1);
    const clientRow = ownerList.body.items[0] as Record<string, unknown>;
    expect(clientRow).toMatchObject({
      email: clientEmail,
      phone: '+38761000000',
      userRoles: [{ role: { name: 'CLIENT' } }],
    });
    expect(Object.keys(clientRow).sort()).toEqual(
      [
        'id',
        'username',
        'email',
        'firstName',
        'lastName',
        'phone',
        'gender',
        'avatar',
        'isActive',
        'isEmailVerified',
        'createdAt',
        'userRoles',
      ].sort(),
    );
    for (const privateField of [
      'passwordHash',
      'emailVerificationToken',
      'emailVerificationExpiresAt',
      'googleId',
      'facebookId',
      'mustChangePassword',
      'passwordChangedAt',
      'lastLoginAt',
    ]) {
      expect(clientRow).not.toHaveProperty(privateField);
    }

    const systemAdminList = await request(getHttpServer(app!))
      .get('/api/users/clients/admin')
      .query({ q: clientEmail })
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .expect(200);
    expect(systemAdminList.body.total).toBe(1);
    expect(systemAdminList.body.items[0].email).toBe(clientEmail);
  });

  it('serializes concurrent debt repayments, replays the recorded payment, and rolls back failed KIF writes', async () => {
    const db = prisma!;
    const httpServer = getHttpServer(app!);
    const today = new Date();
    const repaymentDate = [
      today.getFullYear(),
      String(today.getMonth() + 1).padStart(2, '0'),
      String(today.getDate()).padStart(2, '0'),
    ].join('-');
    const year = today.getFullYear();
    const month = today.getMonth() + 1;
    let book = await db.incomeBook.findUnique({
      where: { year_month: { year, month } },
    });
    if (!book) {
      book = await db.incomeBook.create({ data: { year, month } });
      fixtureIds.incomeBookCreatedByTest = book.id;
    }
    if (book.closedAt) {
      throw new Error(
        'Synthetic debt repayment fixture needs an open KIF book.',
      );
    }
    fixtureIds.incomeBookId = book.id;

    const createDebt = async () => {
      const debt = await db.clientDebt.create({
        data: {
          clientId: clientUserId,
          stylistProfileId: fixtureIds.stylistProfile!,
          serviceId,
          amount: 40,
          createdById: fixtureIds.ownerUserId!,
        },
      });
      fixtureIds.clientDebts.push(debt.id);
      return debt;
    };
    const repay = (debtId: string, note?: string) =>
      request(httpServer)
        .post(`/api/client-debts/${debtId}/repay`)
        .set('Authorization', `Bearer ${ownerToken}`)
        .send({ date: repaymentDate, ...(note ? { note } : {}) });

    const debt = await createDebt();
    const incomeSync = app!.get(IncomeSyncService);
    const assertBookOpenForDate =
      incomeSync.assertBookOpenForDate.bind(incomeSync);
    let bookChecks = 0;
    let releaseBookCheck!: () => void;
    const bookCheckBarrier = new Promise<void>((resolve) => {
      releaseBookCheck = resolve;
    });
    const safetyRelease = setTimeout(releaseBookCheck, 5000);
    const bookCheckSpy = jest
      .spyOn(incomeSync, 'assertBookOpenForDate')
      .mockImplementation(async (date) => {
        const openBook = await assertBookOpenForDate(date);
        bookChecks += 1;
        if (bookChecks === 2) releaseBookCheck();
        await bookCheckBarrier;
        return openBook;
      });
    let concurrentResponses: Awaited<ReturnType<typeof repay>>[];
    try {
      concurrentResponses = await Promise.all([repay(debt.id), repay(debt.id)]);
    } finally {
      clearTimeout(safetyRelease);
      bookCheckSpy.mockRestore();
    }
    expect(bookChecks).toBe(2);
    expect(
      concurrentResponses.map((response) => response.status).sort(),
    ).toEqual([201, 409]);

    const activePayments = await db.dailyLogEntry.findMany({
      where: {
        debtId: debt.id,
        kind: 'DEBT_PAYMENT',
        status: 'COMPLETED',
        deletedAt: null,
      },
      select: { id: true },
    });
    expect(activePayments).toHaveLength(1);
    const settledDebt = await db.clientDebt.findUnique({
      where: { id: debt.id },
      select: { status: true },
    });
    expect(settledDebt?.status).toBe('SETTLED');
    const paymentId = activePayments[0]!.id;
    fixtureIds.dailyLogEntries.push(paymentId);

    let duplicatePaymentId: string | null = null;
    try {
      const duplicatePayment = await db.dailyLogEntry.create({
        data: {
          stylistProfileId: fixtureIds.stylistProfile!,
          serviceId,
          clientId: clientUserId,
          kind: 'DEBT_PAYMENT',
          debtId: debt.id,
          date: today,
          actualPrice: 40,
          tipAmount: 0,
          publicReferenceCode: `biz04-duplicate-${randomUUID()}`,
          isManual: true,
          status: 'COMPLETED',
          completedAt: new Date(),
        },
      });
      duplicatePaymentId = duplicatePayment.id;
    } catch (error) {
      expect(error).toMatchObject({ code: 'P2002' });
    }
    if (duplicatePaymentId) {
      fixtureIds.dailyLogEntries.push(duplicatePaymentId);
      throw new Error(
        'Partial unique index allowed a duplicate active payment.',
      );
    }

    const manualEntries = await db.incomeBookManualEntry.findMany({
      where: { dailyLogEntryId: paymentId },
      select: { id: true },
    });
    expect(manualEntries).toHaveLength(1);
    fixtureIds.incomeManualEntries.push(manualEntries[0]!.id);

    const replay = await repay(debt.id).expect(201);
    expect(replay.body.debtPaymentDailyLogId).toBe(paymentId);
    expect(
      await db.dailyLogEntry.count({
        where: {
          debtId: debt.id,
          kind: 'DEBT_PAYMENT',
          deletedAt: null,
        },
      }),
    ).toBe(1);

    const failingDebt = await createDebt();
    const suffix = randomUUID().replaceAll('-', '');
    const failureMarker = `synthetic-repayment-failure-${suffix}`;
    const functionName = `e2e_fail_debt_payment_${suffix}`;
    const triggerName = `e2e_fail_debt_payment_${suffix}`;
    try {
      await db.$executeRawUnsafe(`
        CREATE FUNCTION "${functionName}"() RETURNS trigger
        LANGUAGE plpgsql AS $function$
        BEGIN
          IF NEW."notes" = '${failureMarker}' THEN
            RAISE EXCEPTION 'synthetic debt repayment failure';
          END IF;
          RETURN NEW;
        END;
        $function$
      `);
      await db.$executeRawUnsafe(`
        CREATE TRIGGER "${triggerName}"
        BEFORE INSERT ON "income_book_manual_entries"
        FOR EACH ROW EXECUTE FUNCTION "${functionName}"()
      `);

      const failed = await repay(failingDebt.id, failureMarker);
      expect(failed.status).toBe(500);
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${triggerName}" ON "income_book_manual_entries"`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
    }

    const rolledBackDebt = await db.clientDebt.findUnique({
      where: { id: failingDebt.id },
      select: { status: true },
    });
    expect(rolledBackDebt?.status).toBe('OPEN');
    expect(
      await db.dailyLogEntry.count({
        where: { debtId: failingDebt.id, kind: 'DEBT_PAYMENT' },
      }),
    ).toBe(0);
  });

  it('uploads an owner avatar, persists public opt-in, and serves only the correct variants', async () => {
    const httpServer = getHttpServer(app!);
    const uploadAvatar = async (background: {
      r: number;
      g: number;
      b: number;
    }) => {
      const image = await sharp({
        create: { width: 16, height: 16, channels: 3, background },
      })
        .png()
        .toBuffer();
      return request(httpServer)
        .post('/api/users/profile/avatar')
        .set('Authorization', `Bearer ${clientToken}`)
        .attach('file', image, {
          filename: 'avatar.png',
          contentType: 'image/png',
        })
        .expect(201);
    };
    const getClientReviewAvatar = async () => {
      const response = await request(httpServer)
        .get('/api/reviews')
        .query({ serviceId, limit: 20, offset: 0 })
        .expect(200);
      const review = (
        response.body.items as Array<{
          id: string;
          user?: { avatar?: string | null };
        }>
      ).find((item) => item.id === publishedReviewId);
      return review?.user?.avatar ?? null;
    };

    await request(httpServer).post('/api/users/profile/avatar').expect(401);

    const firstUpload = await uploadAvatar({ r: 30, g: 90, b: 150 });
    const firstAvatarPath = String(firstUpload.body.avatar);
    expect(firstAvatarPath).toMatch(/^private\/avatars\/.+-thumb\.webp$/);
    expect(firstUpload.body).toMatchObject({
      id: clientUserId,
      avatar: firstAvatarPath,
      isAvatarPublic: false,
    });

    const firstUploadRecord = await prisma!.upload.findFirst({
      where: { pathThumb: firstAvatarPath },
      select: { id: true, mimeType: true, storageClass: true },
    });
    expect(firstUploadRecord).toMatchObject({
      mimeType: 'image/png',
      storageClass: 'PRIVATE',
    });
    if (firstUploadRecord) fixtureIds.uploads.push(firstUploadRecord.id);

    const profileBeforeOptIn = await request(httpServer)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(profileBeforeOptIn.body).toMatchObject({
      avatar: firstAvatarPath,
      isAvatarPublic: false,
    });
    expect(await getClientReviewAvatar()).toBeNull();

    await request(httpServer)
      .get('/api/uploads/content')
      .query({ path: firstAvatarPath })
      .expect(401);
    const firstPrivateImage = await request(httpServer)
      .get('/api/uploads/content')
      .query({ path: firstAvatarPath })
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(firstPrivateImage.headers['content-type']).toMatch(
      /^image\/webp(?:;|$)/,
    );
    expect(firstPrivateImage.headers['content-disposition']).toContain(
      'inline',
    );
    expect(Buffer.isBuffer(firstPrivateImage.body)).toBe(true);
    expect(firstPrivateImage.body.length).toBeGreaterThan(0);

    await request(httpServer)
      .get(`/api/uploads/content?path=${encodeURIComponent(firstAvatarPath)}`)
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(404);
    await request(httpServer)
      .get(`/api/users/${clientUserId}/avatar`)
      .expect(404);

    const visibility = await request(httpServer)
      .patch('/api/users/profile/avatar-visibility')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ isAvatarPublic: true })
      .expect(200);
    expect(visibility.body).toMatchObject({
      avatar: firstAvatarPath,
      isAvatarPublic: true,
    });
    const persistedVisibility = await prisma!.user.findUnique({
      where: { id: clientUserId },
      select: { avatar: true, isAvatarPublic: true },
    });
    expect(persistedVisibility).toEqual({
      avatar: firstAvatarPath,
      isAvatarPublic: true,
    });
    expect(await getClientReviewAvatar()).toBe(
      `/api/users/${clientUserId}/avatar`,
    );

    const firstPublicImage = await request(httpServer)
      .get(`/api/users/${clientUserId}/avatar`)
      .expect(200);
    expect(firstPublicImage.headers['content-type']).toMatch(
      /^image\/webp(?:;|$)/,
    );
    expect(firstPublicImage.headers['cache-control']).toContain('no-store');
    expect(firstPublicImage.headers['content-disposition']).toContain('inline');
    expect(Buffer.isBuffer(firstPublicImage.body)).toBe(true);
    expect(firstPublicImage.body.length).toBeGreaterThan(0);

    await request(httpServer)
      .patch(`/api/users/${clientUserId}`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ gender: 'FEMALE' })
      .expect(200);
    const profileAfterSave = await request(httpServer)
      .get('/api/users/profile')
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
    expect(profileAfterSave.body).toMatchObject({
      avatar: firstAvatarPath,
      isAvatarPublic: true,
      gender: 'FEMALE',
    });

    const replacementUpload = await uploadAvatar({ r: 180, g: 60, b: 80 });
    const replacementAvatarPath = String(replacementUpload.body.avatar);
    expect(replacementAvatarPath).not.toBe(firstAvatarPath);
    expect(replacementUpload.body.isAvatarPublic).toBe(true);
    const replacementRecord = await prisma!.upload.findFirst({
      where: { pathThumb: replacementAvatarPath },
      select: { id: true },
    });
    expect(replacementRecord).not.toBeNull();
    if (replacementRecord) fixtureIds.uploads.push(replacementRecord.id);

    const replacementPublicImage = await request(httpServer)
      .get(`/api/users/${clientUserId}/avatar`)
      .expect(200);
    expect(replacementPublicImage.headers['content-type']).toMatch(
      /^image\/webp(?:;|$)/,
    );
    expect(replacementPublicImage.body.equals(firstPublicImage.body)).toBe(
      false,
    );
    expect(await getClientReviewAvatar()).toBe(
      `/api/users/${clientUserId}/avatar`,
    );
    await request(httpServer)
      .get('/api/uploads/content')
      .query({ path: replacementAvatarPath })
      .set('Authorization', `Bearer ${stylistToken}`)
      .expect(404);

    await request(httpServer)
      .patch('/api/users/profile/avatar-visibility')
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ isAvatarPublic: false })
      .expect(200);
    await request(httpServer)
      .get(`/api/users/${clientUserId}/avatar`)
      .expect(404);
    expect(await getClientReviewAvatar()).toBeNull();
    await request(httpServer)
      .get('/api/uploads/content')
      .query({ path: replacementAvatarPath })
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(200);
  });

  it('replays a client booking idempotently and persists one reservation graph and outbox event', async () => {
    const db = prisma!;
    const date = addWeeks(availabilityDate, 1);
    const idempotencyKey = randomUUID();
    const first = await submitClientBooking({
      reservationDate: date,
      idempotencyKey,
    });
    expectClientBookingCreated(first, 'First idempotent create');
    expect(first.response.body.id).toBeTruthy();

    const replay = await submitClientBooking({
      reservationDate: date,
      idempotencyKey,
    });
    expectClientBookingCreated(replay, 'Sequential idempotent replay');
    expect(replay.response.body.id).toBe(first.response.body.id);

    const changedPayload = await submitClientBooking({
      reservationDate: date,
      startTime: '09:55',
      endTime: '10:40',
      idempotencyKey,
    });
    expect(changedPayload.response.status).toBe(409);

    const concurrentDate = addWeeks(availabilityDate, 8);
    const concurrentKey = randomUUID();
    const [concurrentReplayA, concurrentReplayB] = await Promise.all([
      submitClientBooking({
        reservationDate: concurrentDate,
        idempotencyKey: concurrentKey,
      }),
      submitClientBooking({
        reservationDate: concurrentDate,
        idempotencyKey: concurrentKey,
      }),
    ]);
    expectClientBookingCreated(
      concurrentReplayA,
      'Concurrent idempotent replay A',
    );
    expectClientBookingCreated(
      concurrentReplayB,
      'Concurrent idempotent replay B',
    );
    expect(concurrentReplayB.response.body.id).toBe(
      concurrentReplayA.response.body.id,
    );
    expect(
      await db.reservation.count({
        where: { clientId: clientUserId, idempotencyKey: concurrentKey },
      }),
    ).toBe(1);
    expect(
      await db.outboxEvent.count({
        where: {
          aggregateId: concurrentReplayA.response.body.id as string,
          eventType: 'reservation.created',
        },
      }),
    ).toBe(1);

    const reservationId = first.response.body.id as string;
    const persisted = await db.reservation.findUnique({
      where: { id: reservationId },
      select: {
        idempotencyKey: true,
        idempotencyRequestHash: true,
        items: { select: { id: true, serviceId: true } },
        stylistResponses: { select: { id: true } },
      },
    });
    expect(persisted?.idempotencyKey).toBe(idempotencyKey);
    expect(persisted?.idempotencyRequestHash).toMatch(/^[a-f0-9]{64}$/);
    expect(persisted?.items).toHaveLength(1);
    expect(persisted?.items[0]?.serviceId).toBe(serviceId);
    expect(persisted?.stylistResponses).toHaveLength(1);
    expect(
      await db.reservation.count({
        where: { clientId: clientUserId, idempotencyKey },
      }),
    ).toBe(1);

    const outboxEvents = await db.outboxEvent.findMany({
      where: { aggregateId: reservationId },
      select: { eventType: true, status: true },
    });
    expect(outboxEvents).toEqual([
      { eventType: 'reservation.created', status: 'DELIVERED' },
    ]);
  }, 30_000);

  it('serializes concurrent client creates so one stylist has only one booking for a one-capacity slot', async () => {
    const db = prisma!;
    const date = addWeeks(availabilityDate, 2);
    const results = await Promise.all(
      concurrentClientTokens.map(({ token }) =>
        submitClientBooking({
          reservationDate: date,
          token,
          idempotencyKey: randomUUID(),
        }),
      ),
    );
    const statuses = results.map(({ response }) => response.status);
    expect(statuses.filter((status) => status === 201)).toHaveLength(1);
    expect(statuses.filter((status) => status === 400)).toHaveLength(
      concurrentClientTokens.length - 1,
    );

    const activeReservations = await db.reservation.findMany({
      where: {
        serviceId,
        reservationDate: new Date(`${date}T00:00:00.000Z`),
        startTime: '09:00',
        status: {
          in: [
            'PENDING',
            'STYLIST_REVIEW',
            'CONFIRMED',
            'ATTENDANCE_CONFIRMED',
            'IN_PROGRESS',
          ],
        },
        clientId: { in: concurrentClientTokens.map(({ userId }) => userId) },
      },
      select: { clientId: true, confirmedStylistId: true, status: true },
    });
    expect(activeReservations).toHaveLength(1);
    expect(activeReservations[0]?.status).toBe('PENDING');
    expect(activeReservations[0]?.confirmedStylistId).toBeNull();
  }, 30_000);

  it('allows simultaneous direct bookings with distinct stylists and rejects the same stylist overlap', async () => {
    const db = prisma!;
    const date = addWeeks(availabilityDate, 3);
    const suffix = randomUUID().replaceAll('-', '');
    const secondStylistUser = await db.user.create({
      data: {
        username: `biz02-second-stylist-${suffix}`,
        email: `biz02-second-stylist-${suffix}@example.test`,
        firstName: 'BIZ02',
        lastName: 'Second Stylist',
      },
    });
    fixtureIds.users.push(secondStylistUser.id);
    const stylistRole = await db.role.findUnique({
      where: { name: 'STYLIST' },
      select: { id: true },
    });
    expect(stylistRole).not.toBeNull();
    await db.userRole.create({
      data: { userId: secondStylistUser.id, roleId: stylistRole!.id },
    });
    const secondStylistProfile = await db.stylistProfile.create({
      data: { userId: secondStylistUser.id, status: 'ACTIVE' },
    });
    fixtureIds.additionalStylistProfiles.push(secondStylistProfile.id);
    const dayOfWeek = new Date(`${date}T12:00:00`).getDay();
    await db.stylistWorkingHours.create({
      data: {
        stylistProfileId: secondStylistProfile.id,
        dayOfWeek,
        startTime: '09:00',
        endTime: '17:00',
        isWorkingDay: true,
      },
    });
    await db.stylistService.create({
      data: { stylistProfileId: secondStylistProfile.id, serviceId },
    });

    const createDirect = (clientId: string, stylistProfileId: string) =>
      request(getHttpServer(app!))
        .post('/api/reservations/admin')
        .set('Authorization', `Bearer ${systemAdminToken}`)
        .send({
          clientId,
          bookingMode: 'STAFF_ADMIN_DIRECT',
          stylistProfileId,
          serviceIds: [serviceId],
          reservationDate: date,
          startTime: '09:00',
          endTime: '09:45',
        });

    const first = await createDirect(
      concurrentClientTokens[0]!.userId,
      fixtureIds.stylistProfile!,
    );
    expect(first.status).toBe(201);
    if (typeof first.body?.id === 'string') {
      fixtureIds.reservationIds.push(first.body.id);
    }

    const second = await createDirect(
      concurrentClientTokens[1]!.userId,
      secondStylistProfile.id,
    );
    expect(second.status).toBe(201);
    if (typeof second.body?.id === 'string') {
      fixtureIds.reservationIds.push(second.body.id);
    }

    const overlapping = await createDirect(
      concurrentClientTokens[2]!.userId,
      fixtureIds.stylistProfile!,
    );
    expect(overlapping.status).toBe(400);

    const confirmed = await db.reservation.findMany({
      where: {
        serviceId,
        reservationDate: new Date(`${date}T00:00:00.000Z`),
        startTime: '09:00',
        status: 'CONFIRMED',
        clientId: {
          in: concurrentClientTokens.slice(0, 3).map(({ userId }) => userId),
        },
      },
      select: { confirmedStylistId: true },
    });
    expect(confirmed).toHaveLength(2);
    expect(
      new Set(confirmed.map(({ confirmedStylistId }) => confirmedStylistId))
        .size,
    ).toBe(2);
  }, 30_000);

  it('rejects a direct assignment when inbox holds already consume all stylist capacity', async () => {
    const db = prisma!;
    const date = addWeeks(availabilityDate, 7);
    const firstHold = await submitClientBooking({
      reservationDate: date,
      token: concurrentClientTokens[4]!.token,
    });
    const secondHold = await submitClientBooking({
      reservationDate: date,
      token: concurrentClientTokens[5]!.token,
    });
    expect(firstHold.response.status).toBe(201);
    expect(secondHold.response.status).toBe(201);

    const direct = await request(getHttpServer(app!))
      .post('/api/reservations/admin')
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send({
        clientId: concurrentClientTokens[6]!.userId,
        bookingMode: 'STAFF_ADMIN_DIRECT',
        stylistProfileId: fixtureIds.stylistProfile,
        serviceIds: [serviceId],
        reservationDate: date,
        startTime: '09:00',
        endTime: '09:45',
      });
    expect(direct.status).toBe(400);

    const activeReservations = await db.reservation.findMany({
      where: {
        serviceId,
        reservationDate: new Date(`${date}T00:00:00.000Z`),
        startTime: '09:00',
        status: { in: ['PENDING', 'STYLIST_REVIEW', 'CONFIRMED'] },
        clientId: {
          in: concurrentClientTokens.slice(4, 7).map(({ userId }) => userId),
        },
      },
      select: { status: true },
    });
    expect(activeReservations).toHaveLength(2);
    expect(activeReservations.every(({ status }) => status === 'PENDING')).toBe(
      true,
    );
  }, 30_000);

  it('releases slot capacity after client cancellation and accepts a conflict-checked reschedule', async () => {
    const db = prisma!;
    const httpServer = getHttpServer(app!);
    const assertSlotSummary = (
      response: {
        body: Array<{
          startTime?: string;
          availableStylistCount?: number;
          holdState?: string;
        }>;
      },
      stage: string,
      expected: { availableStylistCount: number; holdState: string },
    ) => {
      const slot = response.body.find((item) => item.startTime === '09:00');
      const actual = {
        availableStylistCount: slot?.availableStylistCount ?? null,
        holdState: slot?.holdState ?? null,
      };
      if (
        actual.availableStylistCount !== expected.availableStylistCount ||
        actual.holdState !== expected.holdState
      ) {
        throw new Error(
          `[BIZ-02 safe diagnostic] ${stage}; expected ${JSON.stringify(expected)}; received ${JSON.stringify(actual)}`,
        );
      }
    };
    const cancelDate = addWeeks(availabilityDate, 4);
    const slotsBefore = await request(httpServer)
      .get('/api/reservations/availability/slots')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ serviceId, date: cancelDate })
      .expect(200);
    assertSlotSummary(slotsBefore, 'before create', {
      availableStylistCount: 1,
      holdState: 'none',
    });

    const created = await submitClientBooking({ reservationDate: cancelDate });
    expect(created.response.status).toBe(201);
    const reservationId = created.response.body.id as string;
    const heldSlots = await request(httpServer)
      .get('/api/reservations/availability/slots')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ serviceId, date: cancelDate })
      .expect(200);
    assertSlotSummary(heldSlots, 'pending reservation', {
      availableStylistCount: 0,
      holdState: 'pending_hold',
    });

    const cancelled = await request(httpServer)
      .post(`/api/reservations/${reservationId}/cancel`)
      .set('Authorization', `Bearer ${clientToken}`)
      .send({ cancelReason: 'BIZ-02 synthetic cancellation' })
      .expect(201);
    expect(cancelled.body.status).toBe('CANCELLED_BY_CLIENT');
    const releasedSlots = await request(httpServer)
      .get('/api/reservations/availability/slots')
      .set('Authorization', `Bearer ${clientToken}`)
      .query({ serviceId, date: cancelDate })
      .expect(200);
    assertSlotSummary(releasedSlots, 'after cancellation', {
      availableStylistCount: 1,
      holdState: 'none',
    });

    const rescheduleDate = addWeeks(availabilityDate, 5);
    const rescheduleBooking = await submitClientBooking({
      reservationDate: rescheduleDate,
    });
    expect(rescheduleBooking.response.status).toBe(201);
    const rescheduledId = rescheduleBooking.response.body.id as string;
    await db.reservation.update({
      where: { id: rescheduledId },
      data: {
        status: 'CONFIRMED',
        confirmedStylistId: fixtureIds.stylistProfile!,
        rescheduleStatus: 'PENDING',
        rescheduleProposedStartTime: '10:50',
        rescheduleProposedEndTime: '11:35',
      },
    });

    const accepted = await request(httpServer)
      .post(`/api/reservations/${rescheduledId}/reschedule/accept`)
      .set('Authorization', `Bearer ${clientToken}`)
      .expect(201);
    const acceptedSummary = {
      reservationIdMatches: accepted.body?.id === rescheduledId,
      startTime: accepted.body?.startTime ?? null,
      endTime: accepted.body?.endTime ?? null,
      rescheduleStatus: accepted.body?.rescheduleStatus ?? null,
      rescheduleProposedStartTime:
        accepted.body?.rescheduleProposedStartTime ?? null,
      rescheduleProposedEndTime:
        accepted.body?.rescheduleProposedEndTime ?? null,
    };
    const expectedAcceptedSummary = {
      reservationIdMatches: true,
      startTime: '10:50',
      endTime: '11:35',
      rescheduleStatus: 'ACCEPTED',
      rescheduleProposedStartTime: null,
      rescheduleProposedEndTime: null,
    };
    if (
      Object.entries(expectedAcceptedSummary).some(
        ([key, expected]) =>
          acceptedSummary[key as keyof typeof acceptedSummary] !== expected,
      )
    ) {
      throw new Error(
        `[BIZ-02 safe diagnostic] accepted reschedule; expected ${JSON.stringify(expectedAcceptedSummary)}; received ${JSON.stringify(acceptedSummary)}`,
      );
    }

    const overlappingDirect = await request(httpServer)
      .post('/api/reservations/admin')
      .set('Authorization', `Bearer ${systemAdminToken}`)
      .send({
        clientId: concurrentClientTokens[3]!.userId,
        bookingMode: 'STAFF_ADMIN_DIRECT',
        stylistProfileId: fixtureIds.stylistProfile,
        serviceIds: [serviceId],
        reservationDate: rescheduleDate,
        startTime: '10:50',
        endTime: '11:35',
      });
    expect(overlappingDirect.status).toBe(400);
  }, 30_000);

  it('rolls back reservation, loyalty debit and marker when the transactional outbox insert fails', async () => {
    const db = prisma!;
    const loyaltyAccount = await db.loyaltyAccount.upsert({
      where: { userId: clientUserId },
      update: { points: 500, tier: 'Test', isActive: true },
      create: {
        userId: clientUserId,
        points: 500,
        tier: 'Test',
        isActive: true,
      },
    });
    const date = addWeeks(availabilityDate, 6);
    const idempotencyKey = randomUUID();
    const suffix = randomUUID().replaceAll('-', '');
    const functionName = `e2e_fail_biz02_outbox_${suffix}`;
    const triggerName = `e2e_fail_biz02_outbox_${suffix}`;
    const outboxCountBeforeFailure = await db.outboxEvent.count();

    try {
      await db.$executeRawUnsafe(`
        CREATE FUNCTION "${functionName}"() RETURNS trigger
        LANGUAGE plpgsql AS $function$
        BEGIN
          IF NEW."event_type" = 'reservation.created' THEN
            RAISE EXCEPTION 'synthetic BIZ-02 outbox failure';
          END IF;
          RETURN NEW;
        END;
        $function$
      `);
      await db.$executeRawUnsafe(`
        CREATE TRIGGER "${triggerName}"
        BEFORE INSERT ON "outbox_events"
        FOR EACH ROW EXECUTE FUNCTION "${functionName}"()
      `);

      const failed = await submitClientBooking({
        reservationDate: date,
        idempotencyKey,
        desiredLoyaltyPercent: 10,
      });
      expect(failed.response.status).toBe(500);
    } finally {
      await db.$executeRawUnsafe(
        `DROP TRIGGER IF EXISTS "${triggerName}" ON "outbox_events"`,
      );
      await db.$executeRawUnsafe(`DROP FUNCTION IF EXISTS "${functionName}"()`);
    }

    expect(
      await db.reservation.count({
        where: { clientId: clientUserId, idempotencyKey },
      }),
    ).toBe(0);
    expect(await db.outboxEvent.count()).toBe(outboxCountBeforeFailure);
    expect(
      await db.loyaltyAccount.findUnique({
        where: { id: loyaltyAccount.id },
        select: { points: true },
      }),
    ).toEqual({ points: 500 });
    expect(
      await db.loyaltyTransaction.count({
        where: { accountId: loyaltyAccount.id, type: 'REDEEM' },
      }),
    ).toBe(0);

    const succeeded = await submitClientBooking({
      reservationDate: date,
      idempotencyKey,
      desiredLoyaltyPercent: 10,
    });
    expect(succeeded.response.status).toBe(201);
    const reservationId = succeeded.response.body.id as string;
    const persisted = await db.reservation.findUnique({
      where: { id: reservationId },
      select: {
        loyaltyDiscountPercent: true,
        loyaltyDiscountAmount: true,
        loyaltyPointsUsed: true,
      },
    });
    expect(persisted).toEqual({
      loyaltyDiscountPercent: 10,
      loyaltyDiscountAmount: 2.5,
      loyaltyPointsUsed: 25,
    });
    expect(
      await db.loyaltyAccount.findUnique({
        where: { id: loyaltyAccount.id },
        select: { points: true },
      }),
    ).toEqual({ points: 475 });
    expect(
      await db.loyaltyTransaction.count({
        where: {
          accountId: loyaltyAccount.id,
          type: 'REDEEM',
          source: `Reservation ${reservationId} (10%)`,
        },
      }),
    ).toBe(1);
    expect(
      await db.outboxEvent.count({
        where: {
          aggregateId: reservationId,
          eventType: 'reservation.created',
        },
      }),
    ).toBe(1);
  }, 30_000);
});
