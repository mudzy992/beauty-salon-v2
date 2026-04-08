import { Body, Controller, Get, Param, Patch, Post, Query, UseGuards } from '@nestjs/common'
import { Roles } from '../common/decorators/roles.decorator'
import { RolesGuard } from '../common/guards/roles.guard'
import { ExpenseCategoriesService } from './expense-categories.service'
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto'
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto'

@Controller('api/expense-categories')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class ExpenseCategoriesController {
  constructor(private readonly categories: ExpenseCategoriesService) {}

  @Post()
  create(@Body() dto: CreateExpenseCategoryDto) {
    return this.categories.create(dto)
  }

  @Get()
  findAll(@Query('activeOnly') activeOnly: string) {
    return this.categories.findAll(activeOnly === 'true')
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.categories.findOne(id)
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseCategoryDto) {
    return this.categories.update(id, dto)
  }
}
