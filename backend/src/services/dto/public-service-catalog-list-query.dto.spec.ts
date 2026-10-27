import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { PublicServiceCategoryListQueryDto } from './public-service-category-list-query.dto';
import { PublicServiceSubcategoryListQueryDto } from './public-service-subcategory-list-query.dto';

describe('public service category query DTOs', () => {
  it('defaults to the first page and accepts typed category filters', async () => {
    const category = plainToInstance(PublicServiceCategoryListQueryDto, {});
    const subcategory = plainToInstance(PublicServiceSubcategoryListQueryDto, {
      page: '2',
      pageSize: '10',
      categoryId: 'category-1',
      activeOnly: 'true',
    });

    expect(category).toMatchObject({
      page: 0,
      pageSize: 20,
      activeOnly: 'true',
    });
    expect(await validate(category)).toHaveLength(0);
    expect(subcategory).toMatchObject({
      page: 2,
      pageSize: 10,
      categoryId: 'category-1',
      activeOnly: 'true',
    });
    expect(await validate(subcategory)).toHaveLength(0);
  });

  it('rejects malformed pagination, booleans, empty and oversized category IDs', async () => {
    const invalidCategory = plainToInstance(PublicServiceCategoryListQueryDto, {
      page: '0.5',
      pageSize: '51',
      activeOnly: 'yes',
    });
    const emptyCategoryId = plainToInstance(
      PublicServiceSubcategoryListQueryDto,
      { categoryId: '' },
    );
    const oversizedCategoryId = plainToInstance(
      PublicServiceSubcategoryListQueryDto,
      { categoryId: 'x'.repeat(129) },
    );

    expect((await validate(invalidCategory)).length).toBeGreaterThan(0);
    expect((await validate(emptyCategoryId)).length).toBeGreaterThan(0);
    expect((await validate(oversizedCategoryId)).length).toBeGreaterThan(0);
  });
});
