import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { ExpenseTemplatesService } from './expense-templates.service';
import { CreateExpenseTemplateDto } from './dto/create-expense-template.dto';
import { UpdateExpenseTemplateDto } from './dto/update-expense-template.dto';
import { CreateExpenseTemplateFieldDto } from './dto/create-expense-template-field.dto';
import { UpdateExpenseTemplateFieldDto } from './dto/update-expense-template-field.dto';

@Controller('api/expense-templates')
@UseGuards(RolesGuard)
@Roles('SYSTEM_ADMIN', 'OWNER')
export class ExpenseTemplatesController {
  constructor(private readonly templates: ExpenseTemplatesService) {}

  @Post()
  create(@Body() dto: CreateExpenseTemplateDto) {
    return this.templates.create(dto);
  }

  @Get()
  findAll() {
    return this.templates.findAll();
  }

  @Post('bootstrap-legacy-columns')
  bootstrapLegacyColumns() {
    return this.templates.bootstrapLegacyVariableColumns();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.templates.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() dto: UpdateExpenseTemplateDto) {
    return this.templates.update(id, dto);
  }

  @Post(':id/fields')
  addField(
    @Param('id') id: string,
    @Body() dto: CreateExpenseTemplateFieldDto,
  ) {
    return this.templates.addField(id, dto);
  }

  @Patch('fields/:fieldId')
  updateField(
    @Param('fieldId') fieldId: string,
    @Body() dto: UpdateExpenseTemplateFieldDto,
  ) {
    return this.templates.updateField(fieldId, dto);
  }

  @Delete('fields/:fieldId')
  removeField(@Param('fieldId') fieldId: string) {
    return this.templates.removeField(fieldId);
  }
}
