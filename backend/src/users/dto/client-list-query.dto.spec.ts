import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { ClientListQueryDto } from './client-list-query.dto';

describe('ClientListQueryDto', () => {
  it('transforms valid query numbers and accepts bounded search', async () => {
    const query = plainToInstance(ClientListQueryDto, {
      page: '2',
      pageSize: '10',
      q: 'client name',
    });

    expect(query.page).toBe(2);
    expect(query.pageSize).toBe(10);
    expect(await validate(query)).toHaveLength(0);
  });

  it('rejects invalid pagination and overlong search strings', async () => {
    const query = plainToInstance(ClientListQueryDto, {
      page: '-1',
      pageSize: '101',
      q: 'x'.repeat(101),
    });

    const errors = await validate(query);
    const properties = errors.map((error) => error.property);
    expect(properties).toContain('page');
    expect(properties).toContain('pageSize');
    expect(properties).toContain('q');
  });
});
