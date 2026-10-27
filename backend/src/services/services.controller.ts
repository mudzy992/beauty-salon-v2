import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { ServicesService } from './services.service';
import { CreateCategoryDto } from './dto/create-category.dto';
import { UpdateCategoryDto } from './dto/update-category.dto';
import { CreateSubcategoryDto } from './dto/create-subcategory.dto';
import { UpdateSubcategoryDto } from './dto/update-subcategory.dto';
import { CreateServiceDto } from './dto/create-service.dto';
import { UpdateServiceDto } from './dto/update-service.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { Public } from '../common/decorators/public.decorator';
import { PublicServiceListQueryDto } from './dto/public-service-list-query.dto';
import { PublicServiceCategoryListQueryDto } from './dto/public-service-category-list-query.dto';
import { PublicServiceSubcategoryListQueryDto } from './dto/public-service-subcategory-list-query.dto';
import { PagePaginationQueryDto } from '../common/dto/page-pagination-query.dto';
import { HttpRateLimit } from '../common/rate-limiting/http-rate-limit.decorator';
import {
  HTTP_RATE_LIMIT_PUBLIC_IP,
  HTTP_RATE_LIMIT_WINDOW_SECONDS,
} from '../common/rate-limiting/http-rate-limit.constants';

@Controller('api/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('admin/categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findAllAdminCategories(@Query() query: PagePaginationQueryDto) {
    return this.servicesService.findAllCategories(false, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('admin/categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findOneAdminCategory(@Param('id') id: string) {
    return this.servicesService.findOneCategory(id);
  }

  @Get('admin/subcategories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findAllAdminSubcategories(
    @Query() query: PublicServiceSubcategoryListQueryDto,
  ) {
    return this.servicesService.findAllSubcategories(query.categoryId, false, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('admin/subcategories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findOneAdminSubcategory(@Param('id') id: string) {
    return this.servicesService.findOneSubcategory(id);
  }

  @Get('admin/services')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findAllAdminServices(@Query() query: PublicServiceListQueryDto) {
    return this.servicesService.findAllServices(query.subcategoryId, false, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('admin/services/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findOneAdminService(@Param('id') id: string) {
    return this.servicesService.findOneService(id);
  }

  @Get('home-stats')
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:service-home-stats',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  getPublicHomeStats() {
    return this.servicesService.getPublicHomeStats();
  }

  @Get('popular')
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:popular-service',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  getMostPopularService() {
    return this.servicesService.getMostPopularService();
  }

  @Get('categories')
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:service-categories',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findAllCategories(@Query() query: PublicServiceCategoryListQueryDto) {
    return this.servicesService.findPublicCategories({
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('categories/:id')
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:service-category-detail',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findOneCategory(@Param('id') id: string) {
    return this.servicesService.findPublicOneCategory(id);
  }

  @Post('categories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  createCategory(@Body() dto: CreateCategoryDto) {
    return this.servicesService.createCategory(dto);
  }

  @Patch('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  updateCategory(@Param('id') id: string, @Body() dto: UpdateCategoryDto) {
    return this.servicesService.updateCategory(id, dto);
  }

  @Delete('categories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeCategory(@Param('id') id: string) {
    return this.servicesService.removeCategory(id);
  }

  @Get('subcategories')
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:service-subcategories',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findAllSubcategories(@Query() query: PublicServiceSubcategoryListQueryDto) {
    return this.servicesService.findPublicSubcategories(query.categoryId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get('subcategories/:id')
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:service-subcategory-detail',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findOneSubcategory(@Param('id') id: string) {
    return this.servicesService.findPublicOneSubcategory(id);
  }

  @Post('subcategories')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  createSubcategory(@Body() dto: CreateSubcategoryDto) {
    return this.servicesService.createSubcategory(dto);
  }

  @Patch('subcategories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  updateSubcategory(
    @Param('id') id: string,
    @Body() dto: UpdateSubcategoryDto,
  ) {
    return this.servicesService.updateSubcategory(id, dto);
  }

  @Delete('subcategories/:id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeSubcategory(@Param('id') id: string) {
    return this.servicesService.removeSubcategory(id);
  }

  @Get()
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:services',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findAllServices(@Query() query: PublicServiceListQueryDto) {
    return this.servicesService.findPublicServices(query.subcategoryId, {
      page: query.page,
      pageSize: query.pageSize,
    });
  }

  @Get(':id')
  @Public()
  @HttpRateLimit({
    bucket: 'catalog:service-detail',
    limit: HTTP_RATE_LIMIT_PUBLIC_IP,
    windowSeconds: HTTP_RATE_LIMIT_WINDOW_SECONDS,
    identity: 'ip',
  })
  findOneService(@Param('id') id: string) {
    return this.servicesService.findPublicOneService(id);
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  createService(@Body() dto: CreateServiceDto) {
    return this.servicesService.createService(dto);
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  updateService(@Param('id') id: string, @Body() dto: UpdateServiceDto) {
    return this.servicesService.updateService(id, dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeService(@Param('id') id: string) {
    return this.servicesService.removeService(id);
  }
}
