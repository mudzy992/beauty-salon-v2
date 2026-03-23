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

@Controller('api/services')
export class ServicesController {
  constructor(private readonly servicesService: ServicesService) {}

  @Get('home-stats')
  @Public()
  getPublicHomeStats() {
    return this.servicesService.getPublicHomeStats();
  }

  @Get('categories')
  @Public()
  findAllCategories(@Query('activeOnly') activeOnly?: string) {
    return this.servicesService.findAllCategories(activeOnly === 'true');
  }

  @Get('categories/:id')
  @Public()
  findOneCategory(@Param('id') id: string) {
    return this.servicesService.findOneCategory(id);
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
  findAllSubcategories(
    @Query('categoryId') categoryId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.servicesService.findAllSubcategories(
      categoryId,
      activeOnly === 'true',
    );
  }

  @Get('subcategories/:id')
  @Public()
  findOneSubcategory(@Param('id') id: string) {
    return this.servicesService.findOneSubcategory(id);
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
  findAllServices(
    @Query('subcategoryId') subcategoryId?: string,
    @Query('activeOnly') activeOnly?: string,
  ) {
    return this.servicesService.findAllServices(
      subcategoryId,
      activeOnly === 'true',
    );
  }

  @Get(':id')
  @Public()
  findOneService(@Param('id') id: string) {
    return this.servicesService.findOneService(id);
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
