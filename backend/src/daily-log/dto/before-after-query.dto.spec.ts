import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { BeforeAfterQueryDto } from './before-after-query.dto';

describe('BeforeAfterQueryDto', () => {
  it('transforms valid pagination values', async () => {
    const query = plainToInstance(BeforeAfterQueryDto, {
      limit: '18',
      offset: '36',
      serviceId: 'service-1',
      random: 'false',
    });

    expect(query.limit).toBe(18);
    expect(query.offset).toBe(36);
    expect(await validate(query)).toHaveLength(0);
  });

  it('rejects fractional, non-numeric, negative and over-cap pagination values', async () => {
    const invalidQueries = [
      { limit: '1.5' },
      { offset: 'nope' },
      { offset: '-1' },
      { offset: '1001' },
    ];

    for (const values of invalidQueries) {
      const query = plainToInstance(BeforeAfterQueryDto, values);
      expect(await validate(query)).not.toHaveLength(0);
    }
  });

  it('does not apply the paginated offset cap to random mode', async () => {
    const query = plainToInstance(BeforeAfterQueryDto, {
      random: '1',
      offset: '5001',
    });

    expect(await validate(query)).toHaveLength(0);
  });
});
