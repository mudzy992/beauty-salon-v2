import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { AddDailyLogImageDto } from './add-daily-log-image.dto';
import { CreateDailyLogEntryDto } from './create-daily-log-entry.dto';
import { DailyLogDispositionDto } from './daily-log-disposition.dto';

const strictValidation = {
  whitelist: true,
  forbidNonWhitelisted: true,
} as const;

describe('daily-log request DTO validation under the global strict whitelist', () => {
  it('accepts manual-create clients that explicitly send isManual', async () => {
    const dto = plainToInstance(CreateDailyLogEntryDto, {
      stylistProfileId: '00000000-0000-4000-8000-000000000001',
      serviceId: '00000000-0000-4000-8000-000000000002',
      date: '2026-11-06',
      actualPrice: 25,
      isManual: true,
    });

    expect(await validate(dto, strictValidation)).toHaveLength(0);
  });

  it('accepts disposition clients that explicitly send applyPenalty', async () => {
    const dto = plainToInstance(DailyLogDispositionDto, {
      action: 'no_show',
      reason: 'Klijent se nije pojavio.',
      applyPenalty: false,
    });

    expect(await validate(dto, strictValidation)).toHaveLength(0);
  });

  it('validates optional image ordering when supplied', async () => {
    const valid = plainToInstance(AddDailyLogImageDto, {
      uploadId: '00000000-0000-4000-8000-000000000003',
      sortOrder: 2,
    });
    expect(await validate(valid, strictValidation)).toHaveLength(0);

    for (const sortOrder of [-1, 1.5]) {
      const invalid = plainToInstance(AddDailyLogImageDto, {
        uploadId: '00000000-0000-4000-8000-000000000003',
        sortOrder,
      });
      expect(await validate(invalid, strictValidation)).not.toHaveLength(0);
    }
  });
});
