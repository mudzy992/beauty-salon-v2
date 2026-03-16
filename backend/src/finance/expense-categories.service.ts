import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseCategoryDto } from './dto/create-expense-category.dto';
import { UpdateExpenseCategoryDto } from './dto/update-expense-category.dto';

@Injectable()
export class ExpenseCategoriesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseCategoryDto) {
    await this.prisma.expenseCategoryTemplate.findUniqueOrThrow({
      where: { id: dto.templateId },
    });
    return this.prisma.expenseCategory.create({
      data: {
        name: dto.name,
        description: dto.description,
        templateId: dto.templateId,
        isActive: dto.isActive ?? true,
        isFixed: dto.isFixed ?? false,
      },
      include: {
        template: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
  }

  async findAll(activeOnly = false) {
    return this.prisma.expenseCategory.findMany({
      where: activeOnly ? { isActive: true } : undefined,
      include: {
        template: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
      },
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const c = await this.prisma.expenseCategory.findUnique({
      where: { id },
      include: {
        template: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
    if (!c) throw new NotFoundException('Kategorija nije pronađena.');
    return c;
  }

  async update(id: string, dto: UpdateExpenseCategoryDto) {
    await this.findOne(id);
    return this.prisma.expenseCategory.update({
      where: { id },
      data: {
        ...(dto.name != null && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
        ...(dto.isFixed !== undefined && { isFixed: dto.isFixed }),
        ...(dto.templateId !== undefined && { templateId: dto.templateId }),
      },
      include: {
        template: { include: { fields: { orderBy: { sortOrder: 'asc' } } } },
      },
    });
  }
}
