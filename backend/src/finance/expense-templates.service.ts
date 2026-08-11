import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseTemplateDto } from './dto/create-expense-template.dto';
import { UpdateExpenseTemplateDto } from './dto/update-expense-template.dto';
import { CreateExpenseTemplateFieldDto } from './dto/create-expense-template-field.dto';
import { UpdateExpenseTemplateFieldDto } from './dto/update-expense-template-field.dto';

@Injectable()
export class ExpenseTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseTemplateDto) {
    const template = await this.prisma.expenseCategoryTemplate.create({
      data: {
        name: dto.name,
        description: dto.description,
        requiresAttachmentPerItem: dto.requiresAttachmentPerItem ?? false,
      },
    });
    if (dto.fields?.length) {
      await this.prisma.expenseTemplateField.createMany({
        data: dto.fields.map((f, i) => ({
          templateId: template.id,
          fieldName: f.fieldName,
          fieldType: f.fieldType,
          isRequired: f.isRequired ?? false,
          sortOrder: f.sortOrder ?? i,
          defaultValue: f.defaultValue ?? null,
          lineRole: f.lineRole ?? 'NONE',
        })),
      });
    }
    return this.findOne(template.id);
  }

  async findAll() {
    return this.prisma.expenseCategoryTemplate.findMany({
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const t = await this.prisma.expenseCategoryTemplate.findUnique({
      where: { id },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
    if (!t) throw new NotFoundException('Šablon nije pronađen.');
    return t;
  }

  async update(id: string, dto: UpdateExpenseTemplateDto) {
    await this.findOne(id);
    return this.prisma.expenseCategoryTemplate.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.requiresAttachmentPerItem !== undefined && {
          requiresAttachmentPerItem: dto.requiresAttachmentPerItem,
        }),
      },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async addField(templateId: string, dto: CreateExpenseTemplateFieldDto) {
    const template = await this.findOne(templateId);
    return this.prisma.expenseTemplateField.create({
      data: {
        templateId,
        fieldName: dto.fieldName,
        fieldType: dto.fieldType,
        isRequired: dto.isRequired ?? false,
        sortOrder: dto.sortOrder ?? template.fields.length,
        defaultValue: dto.defaultValue ?? null,
        lineRole: dto.lineRole ?? 'NONE',
      },
    });
  }

  async updateField(fieldId: string, dto: UpdateExpenseTemplateFieldDto) {
    const field = await this.prisma.expenseTemplateField.findUnique({
      where: { id: fieldId },
    });
    if (!field) throw new NotFoundException('Polje nije pronađeno.');
    return this.prisma.expenseTemplateField.update({
      where: { id: fieldId },
      data: {
        ...(dto.fieldName != null && { fieldName: dto.fieldName }),
        ...(dto.fieldType != null && { fieldType: dto.fieldType }),
        ...(dto.isRequired !== undefined && { isRequired: dto.isRequired }),
        ...(dto.sortOrder !== undefined && { sortOrder: dto.sortOrder }),
        ...(dto.defaultValue !== undefined && { defaultValue: dto.defaultValue }),
        ...(dto.lineRole !== undefined && { lineRole: dto.lineRole }),
      },
    });
  }

  async removeField(fieldId: string) {
    const field = await this.prisma.expenseTemplateField.findUnique({
      where: { id: fieldId },
      include: { _count: { select: { values: true } } },
    });
    if (!field) throw new NotFoundException('Polje nije pronađeno.');
    if (field._count.values > 0) {
      throw new BadRequestException(
        'Polje se koristi na postojećim rashodima i ne može se obrisati.',
      );
    }
    await this.prisma.expenseTemplateField.delete({ where: { id: fieldId } });
    return { deleted: true };
  }

  /** Adds LABEL/QTY/UNIT_PRICE columns to variable categories that have zero fields. */
  async bootstrapLegacyVariableColumns() {
    const categories = await this.prisma.expenseCategory.findMany({
      where: { isFixed: false },
      include: { template: { include: { fields: true } } },
    });
    const created: string[] = [];
    for (const category of categories) {
      if (category.template.fields.length > 0) continue;
      const defaults = [
        { fieldName: 'Naziv', fieldType: 'TEXT', lineRole: 'LABEL', isRequired: true },
        { fieldName: 'Količina', fieldType: 'NUMBER', lineRole: 'QTY', isRequired: true },
        {
          fieldName: 'Cijena',
          fieldType: 'CURRENCY',
          lineRole: 'UNIT_PRICE',
          isRequired: true,
        },
      ];
      await this.prisma.expenseTemplateField.createMany({
        data: defaults.map((f, i) => ({
          templateId: category.templateId,
          fieldName: f.fieldName,
          fieldType: f.fieldType,
          isRequired: f.isRequired,
          sortOrder: i,
          lineRole: f.lineRole,
        })),
      });
      created.push(category.name);
    }
    return { bootstrapped: created };
  }
}
