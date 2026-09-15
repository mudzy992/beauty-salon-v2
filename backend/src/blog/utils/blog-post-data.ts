import { emptyToNull } from '../../common/utils/empty-to-null';
import { slugify } from './slug.utils';
import type { CreateBlogPostDto } from '../dto/create-blog-post.dto';
import type { UpdateBlogPostDto } from '../dto/update-blog-post.dto';

export const optionalSeoFields = (dto: {
  excerpt?: string | null;
  ogImage?: string | null;
  seoTitle?: string | null;
  seoDescription?: string | null;
  heroImage?: string | null;
}) => ({
  excerpt: emptyToNull(dto.excerpt),
  ogImage: emptyToNull(dto.ogImage),
  seoTitle: emptyToNull(dto.seoTitle),
  seoDescription: emptyToNull(dto.seoDescription),
  heroImage: emptyToNull(dto.heroImage),
});

export const slugSource = (
  dto: Pick<CreateBlogPostDto | UpdateBlogPostDto, 'slug' | 'title'>,
  fallbackTitle: string,
) => emptyToNull(dto.slug) ?? slugify(dto.title ?? fallbackTitle);
