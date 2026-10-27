import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PublicReviewsQueryDto } from './public-reviews-query.dto';

describe('PublicReviewsQueryDto', () => {
  it('transforms valid filters and pagination values', async () => {
    const query = plainToInstance(PublicReviewsQueryDto, {
      serviceId: 'service-1',
      stylistProfileId: 'stylist-1',
      approved: 'true',
      limit: '25',
      offset: '50',
    });

    expect(query.limit).toBe(25);
    expect(query.offset).toBe(50);
    expect(await validate(query)).toHaveLength(0);
  });

  it('defaults to the first bounded page', async () => {
    const query = plainToInstance(PublicReviewsQueryDto, {});

    expect(query.limit).toBe(20);
    expect(query.offset).toBe(0);
    expect(await validate(query)).toHaveLength(0);
  });

  it('accepts the configured page-size and offset boundaries', async () => {
    const query = plainToInstance(PublicReviewsQueryDto, {
      limit: '50',
      offset: '1000',
    });

    expect(query.limit).toBe(50);
    expect(query.offset).toBe(1000);
    expect(await validate(query)).toHaveLength(0);
  });

  it('rejects fractional, non-numeric, negative and over-cap values', async () => {
    const invalidQueries = [
      { limit: '1.5' },
      { limit: 'not-a-number' },
      { limit: '51' },
      { approved: 'false' },
      { offset: '-1' },
      { offset: '1001' },
    ];

    for (const values of invalidQueries) {
      const query = plainToInstance(PublicReviewsQueryDto, values);
      expect(await validate(query)).not.toHaveLength(0);
    }
  });

  it('rejects overly long public review filters', async () => {
    const query = plainToInstance(PublicReviewsQueryDto, {
      serviceId: 's'.repeat(129),
    });

    expect(await validate(query)).not.toHaveLength(0);
  });
});
