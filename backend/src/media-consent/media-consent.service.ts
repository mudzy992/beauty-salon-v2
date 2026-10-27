import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import {
  DailyLogMediaConsentAction,
  DailyLogMediaConsentPurpose,
  UploadStorageClass,
} from '@prisma/client';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { PrismaService } from '../prisma/prisma.service';
import { toDateOnlyString } from '../common/utils/date-only';
import { UploadsService } from '../uploads/uploads.service';
import { CLIENT_MEDIA_PUBLICATION_POLICY_VERSION } from './media-consent.constants';
export { CLIENT_MEDIA_PUBLICATION_POLICY_VERSION } from './media-consent.constants';

export const CLIENT_MEDIA_PUBLICATION_CONSENT_TEXT =
  'Želim i izričito pristajem da salon koristi fotografije prije i poslije mog tretmana povezane s mojim zapisom usluge, isključivo radi prikaza rezultata u javnoj galeriji na web-stranici salona i u javnom dijelu aplikacije salona. Ova saglasnost ne uključuje objavu na društvenim mrežama, oglase, promotivne kampanje niti dijeljenje s trećim stranama. Saglasnost je dobrovoljna i njeno odbijanje ne utiče na pružanje usluge. Razumijem da fotografija može biti prepoznatljiva i bez objave mog imena. Saglasnost mogu povući u aplikaciji ili kontaktiranjem salona; nakon povlačenja fotografije će biti uklonjene iz javnog prikaza, a budući pristup kroz sistem blokiran. Privatna kopija može se čuvati nejavno dok salon ne utvrdi rok čuvanja. Razumijem da salon ne može povući kopije koje su drugi već preuzeli, snimili ili pohranili izvan sistema.';

const CONSENT_PURPOSE = DailyLogMediaConsentPurpose.PUBLIC_GALLERY;

type ConsentUser = Pick<CurrentUserPayload, 'sub' | 'roles'>;

@Injectable()
export class MediaConsentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly uploads: UploadsService,
  ) {}

  async listForClient(user: ConsentUser) {
    this.assertClient(user);
    const images = await this.prisma.dailyLogImage.findMany({
      where: {
        OR: [{ isBefore: true }, { isAfter: true }],
        dailyLogEntry: {
          clientId: user.sub,
          kind: 'SERVICE',
          status: 'COMPLETED',
          deletedAt: null,
        },
        upload: { storageClass: UploadStorageClass.PRIVATE },
      },
      include: {
        upload: {
          select: {
            id: true,
            pathOriginal: true,
            mimeType: true,
          },
        },
        consent: {
          include: {
            publishedUpload: {
              select: {
                storageClass: true,
                galleryImages: {
                  select: {
                    category: { select: { id: true, name: true } },
                  },
                },
              },
            },
          },
        },
        dailyLogEntry: {
          select: {
            id: true,
            date: true,
            completedAt: true,
            service: { select: { name: true } },
          },
        },
      },
      orderBy: [{ dailyLogEntry: { date: 'desc' } }, { sortOrder: 'asc' }],
    });

    const eligible = images.filter((image) =>
      ['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(
        image.upload.mimeType.toLowerCase(),
      ),
    );
    const isActiveConsent = (image: (typeof eligible)[number]) =>
      image.consent?.clientId === user.sub &&
      image.consent.revokedAt === null &&
      image.consent.policyVersion === CLIENT_MEDIA_PUBLICATION_POLICY_VERSION &&
      image.consent.purpose === CONSENT_PURPOSE &&
      Boolean(image.consent.publishedUploadId) &&
      image.consent.publishedUpload?.storageClass ===
        UploadStorageClass.CONSENTED_PUBLIC;
    const active = eligible.filter(isActiveConsent);
    const activeImageIds = new Set(active.map((image) => image.id));
    const pairSides = new Map<
      string,
      { beforeImageIds: Set<string>; afterImageIds: Set<string> }
    >();
    for (const image of active) {
      const sides = pairSides.get(image.dailyLogEntry.id) ?? {
        beforeImageIds: new Set<string>(),
        afterImageIds: new Set<string>(),
      };
      if (image.isBefore) sides.beforeImageIds.add(image.id);
      if (image.isAfter) sides.afterImageIds.add(image.id);
      pairSides.set(image.dailyLogEntry.id, sides);
    }
    const autoCategory = await this.prisma.galleryCategory.findFirst({
      where: { autoPublishConsentedPairs: true },
      select: { id: true, name: true },
    });
    const mapImage = (image: (typeof eligible)[number]) => {
      const activeConsent = activeImageIds.has(image.id);
      const pairSidesForEntry = pairSides.get(image.dailyLogEntry.id);
      const completeAutoPair = Boolean(
        autoCategory &&
          pairSidesForEntry &&
          Array.from(pairSidesForEntry.beforeImageIds).some((beforeId) =>
            Array.from(pairSidesForEntry.afterImageIds).some(
              (afterId) => afterId !== beforeId,
            ),
          ),
      );
      const publishedCategories = activeConsent
        ? (image.consent?.publishedUpload?.galleryImages.map((item) =>
            item.category,
          ) ?? [])
        : [];
      if (
        completeAutoPair &&
        !publishedCategories.some((category) => category.id === autoCategory?.id)
      ) {
        publishedCategories.push({ id: autoCategory!.id, name: autoCategory!.name });
      }
      return {
        imageId: image.id,
        entryId: image.dailyLogEntry.id,
        serviceName: image.dailyLogEntry.service.name,
        serviceDate: toDateOnlyString(image.dailyLogEntry.date),
        completedAt: image.dailyLogEntry.completedAt?.toISOString() ?? null,
        isBefore: image.isBefore,
        isAfter: image.isAfter,
        description: image.description,
        previewUrl: `/api/uploads/content?path=${encodeURIComponent(image.upload.pathOriginal)}`,
        consentedAt: image.consent?.consentedAt.toISOString() ?? null,
        revokedAt: image.consent?.revokedAt?.toISOString() ?? null,
        isPublished: publishedCategories.length > 0,
        publishedCategories: publishedCategories.map(({ id, name }) => ({ id, name })),
      };
    };
    const pending = eligible.filter((image) => !isActiveConsent(image));
    return {
      policyVersion: CLIENT_MEDIA_PUBLICATION_POLICY_VERSION,
      purpose: CONSENT_PURPOSE,
      consentText: CLIENT_MEDIA_PUBLICATION_CONSENT_TEXT,
      pending: pending.map(mapImage),
      active: active.map(mapImage),
    };
  }

  async grantForClient(
    imageId: string,
    policyVersion: string,
    user: ConsentUser,
  ) {
    this.assertClient(user);
    if (policyVersion !== CLIENT_MEDIA_PUBLICATION_POLICY_VERSION) {
      throw new ConflictException('Verzija teksta saglasnosti nije važeća.');
    }

    const image = await this.prisma.dailyLogImage.findUnique({
      where: { id: imageId },
      include: {
        upload: true,
        consent: true,
        dailyLogEntry: {
          select: {
            clientId: true,
            kind: true,
            status: true,
            deletedAt: true,
          },
        },
      },
    });
    if (
      !image ||
      image.dailyLogEntry.clientId !== user.sub ||
      image.dailyLogEntry.kind !== 'SERVICE' ||
      image.dailyLogEntry.status !== 'COMPLETED' ||
      image.dailyLogEntry.deletedAt !== null ||
      (!image.isBefore && !image.isAfter) ||
      image.upload.storageClass !== UploadStorageClass.PRIVATE
    ) {
      throw new NotFoundException('Fotografija nije pronađena.');
    }
    if (
      image.consent &&
      image.consent.clientId !== null &&
      image.consent.clientId !== user.sub
    ) {
      throw new ConflictException(
        'Ova fotografija je vezana za raniju saglasnost i nije dostupna za ponovno odobravanje.',
      );
    }
    if (
      image.consent?.clientId === user.sub &&
      image.consent.revokedAt === null &&
      image.consent.policyVersion === policyVersion &&
      image.consent.publishedUploadId
    ) {
      return {
        active: true,
        consentedAt: image.consent.consentedAt.toISOString(),
      };
    }

    const reusedCopyId =
      image.consent?.clientId === user.sub
        ? image.consent.publishedUploadId
        : null;
    const copy = reusedCopyId
      ? null
      : await this.uploads.createConsentDerivative(image.uploadId);
    const publishedUploadId = reusedCopyId ?? copy?.id;
    if (!publishedUploadId) {
      throw new ConflictException('Fotografija nije mogla biti pripremljena.');
    }

    const now = new Date();
    try {
      const consent = await this.prisma.$transaction(async (tx) => {
        const current = await tx.dailyLogImageConsent.findUnique({
          where: { dailyLogImageId: image.id },
        });
        if (current?.clientId && current.clientId !== user.sub) {
          throw new ConflictException(
            'Ova fotografija je vezana za raniju saglasnost.',
          );
        }
        const record = current
          ? await tx.dailyLogImageConsent.update({
              where: { id: current.id },
              data: {
                clientId: user.sub,
                purpose: CONSENT_PURPOSE,
                policyVersion,
                consentedAt: now,
                revokedAt: null,
                publishedUploadId,
              },
            })
          : await tx.dailyLogImageConsent.create({
              data: {
                dailyLogImageId: image.id,
                clientId: user.sub,
                purpose: CONSENT_PURPOSE,
                policyVersion,
                consentedAt: now,
                publishedUploadId,
              },
            });
        await tx.dailyLogImageConsentEvent.create({
          data: {
            consentId: record.id,
            action: DailyLogMediaConsentAction.GRANTED,
            actorId: user.sub,
            purpose: CONSENT_PURPOSE,
            policyVersion,
            source: 'CLIENT_APP',
          },
        });
        return record;
      });
      return {
        active: true,
        consentedAt: consent.consentedAt.toISOString(),
      };
    } catch (error) {
      if (copy?.id) {
        await this.uploads
          .deleteUnreferencedUpload(copy.id)
          .catch(() => undefined);
      }
      throw error;
    }
  }

  async revokeForClient(imageId: string, user: ConsentUser) {
    this.assertClient(user);
    const consent = await this.prisma.dailyLogImageConsent.findUnique({
      where: { dailyLogImageId: imageId },
      include: {
        dailyLogImage: {
          include: { dailyLogEntry: { select: { clientId: true } } },
        },
      },
    });
    if (
      !consent ||
      !consent.dailyLogImage ||
      consent.clientId !== user.sub ||
      consent.dailyLogImage.dailyLogEntry.clientId !== user.sub
    ) {
      throw new NotFoundException('Saglasnost nije pronađena.');
    }
    if (consent.revokedAt) {
      return { revoked: true, revokedAt: consent.revokedAt.toISOString() };
    }

    const now = new Date();
    await this.prisma.$transaction(async (tx) => {
      await tx.dailyLogImageConsent.update({
        where: { id: consent.id },
        data: { revokedAt: now },
      });
      await tx.dailyLogImageConsentEvent.create({
        data: {
          consentId: consent.id,
          action: DailyLogMediaConsentAction.REVOKED,
          actorId: user.sub,
          purpose: consent.purpose,
          policyVersion: consent.policyVersion,
          source: 'CLIENT_APP',
        },
      });
    });
    return { revoked: true, revokedAt: now.toISOString() };
  }

  async findActivePublicUploadId(consentId: string): Promise<string> {
    const consent = await this.prisma.dailyLogImageConsent.findUnique({
      where: { id: consentId },
      include: {
        publishedUpload: { select: { id: true, storageClass: true } },
        dailyLogImage: {
          include: {
            dailyLogEntry: {
              select: {
                clientId: true,
                kind: true,
                status: true,
                deletedAt: true,
              },
            },
          },
        },
      },
    });
    if (
      !consent ||
      consent.revokedAt !== null ||
      consent.policyVersion !== CLIENT_MEDIA_PUBLICATION_POLICY_VERSION ||
      consent.purpose !== CONSENT_PURPOSE ||
      !consent.clientId ||
      !consent.dailyLogImage ||
      (!consent.dailyLogImage.isBefore && !consent.dailyLogImage.isAfter) ||
      consent.clientId !== consent.dailyLogImage.dailyLogEntry.clientId ||
      consent.dailyLogImage.dailyLogEntry.kind !== 'SERVICE' ||
      consent.dailyLogImage.dailyLogEntry.status !== 'COMPLETED' ||
      consent.dailyLogImage.dailyLogEntry.deletedAt !== null ||
      !consent.publishedUpload ||
      consent.publishedUpload.storageClass !==
        UploadStorageClass.CONSENTED_PUBLIC
    ) {
      throw new NotFoundException('Fotografija nije pronađena.');
    }
    return consent.publishedUpload.id;
  }

  private assertClient(user: ConsentUser): void {
    if (!user.roles.includes('CLIENT')) {
      throw new ForbiddenException('Ova funkcija je dostupna samo klijentima.');
    }
  }
}
