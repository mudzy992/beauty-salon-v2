import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ClientDebtListQueryDto } from './client-debt-list-query.dto';

describe('ClientDebtListQueryDto', () => {
  it('transforms and accepts bounded pagination and search params', async () => {
    const query = plainToInstance(ClientDebtListQueryDto, {
      page: '2',
      pageSize: '20',
      status: 'OPEN',
      q: 'Aida',
    });

    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(20);
    expect(await validate(query)).toHaveLength(0);
  });

  it('rejects out-of-range pagination and overlong filters', async () => {
    const query = plainToInstance(ClientDebtListQueryDto, {
      page: '1001',
      pageSize: '51',
      q: 'x'.repeat(101),
    });

    const properties = (await validate(query)).map((error) => error.property);
    expect(properties).toContain('page');
    expect(properties).toContain('pageSize');
    expect(properties).toContain('q');
  });
});
