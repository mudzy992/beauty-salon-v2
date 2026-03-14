import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseTemplateDto } from './dto/create-expense-template.dto';
import { UpdateExpenseTemplateDto } from './dto/update-expense-template.dto';

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
        ...(dto.requiresAttachmentPerItem !== undefined && { requiresAttachmentPerItem: dto.requiresAttachmentPerItem }),
      },
      include: { fields: { orderBy: { sortOrder: 'asc' } } },
    });
  }

  async addField(templateId: string, fieldName: string, fieldType: string, isRequired?: boolean, sortOrder?: number, defaultValue?: string) {
    await this.findOne(templateId);
    return this.prisma.expenseTemplateField.create({
      data: {
        templateId,
        fieldName,
        fieldType,
        isRequired: isRequired ?? false,
        sortOrder: sortOrder ?? 0,
        defaultValue: defaultValue ?? null,
      },
    });
  }

  async removeField(fieldId: string) {
    const f = await this.prisma.expenseTemplateField.findUnique({ where: { id: fieldId } });
    if (!f) throw new NotFoundException('Polje nije pronađeno.');
    await this.prisma.expenseTemplateField.delete({ where: { id: fieldId } });
    return { deleted: true };
  }
}
