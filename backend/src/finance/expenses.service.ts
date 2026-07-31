import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AddExpenseAttachmentDto } from './dto/add-expense-attachment.dto';
import { assertFieldValuesMatchTemplate } from './utils/expense-field-values';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, user: CurrentUserPayload) {
    const book = await this.prisma.expenseBook.findUnique({
      where: { id: dto.bookId },
    });
    if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    if (book.isClosed) {
      throw new BadRequestException(
        'Ne možete dodavati rashode u zatvorenu knjigu.',
      );
    }
    const category = await this.getCategoryWithTemplate(dto.categoryId);
    assertFieldValuesMatchTemplate(category.template.fields, dto.fieldValues, {
      requireRequiredFields: category.isFixed,
    });

    const expense = await this.prisma.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          bookId: dto.bookId,
          categoryId: dto.categoryId,
          title: dto.title,
          totalAmount: dto.totalAmount,
          invoiceUploadId: dto.invoiceUploadId,
          notes: dto.notes,
          createdById: user.sub,
        },
      });
      if (dto.fieldValues?.length) {
        await tx.expenseFieldValue.createMany({
          data: dto.fieldValues.map((fv) => ({
            expenseId: created.id,
            fieldId: fv.fieldId,
            value: fv.value,
          })),
        });
      }
      if (dto.attachmentUploadIds?.length) {
        await tx.expenseAttachment.createMany({
          data: dto.attachmentUploadIds.map((uploadId) => ({
            expenseId: created.id,
            uploadId,
          })),
        });
      }
      return created;
    });
    return this.findOne(expense.id);
  }

  findAll(bookId?: string) {
    return this.prisma.expense.findMany({
      where: bookId ? { bookId } : {},
      include: {
        category: true,
        book: true,
        fieldValues: { include: { field: true } },
        attachments: { include: { upload: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const expense = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        book: true,
        category: { include: { template: { include: { fields: true } } } },
        fieldValues: { include: { field: true } },
        attachments: { include: { upload: true } },
      },
    });
    if (!expense) throw new NotFoundException('Rashod nije pronađen.');
    return expense;
  }

  async update(id: string, dto: UpdateExpenseDto, user: CurrentUserPayload) {
    const expense = await this.assertEditable(id, 'mijenjati rashod');
    if (dto.fieldValues !== undefined) {
      const category = await this.getCategoryWithTemplate(expense.categoryId);
      assertFieldValuesMatchTemplate(category.template.fields, dto.fieldValues, {
        requireRequiredFields: category.isFixed,
      });
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.expense.update({
        where: { id },
        data: {
          ...(dto.title != null && { title: dto.title }),
          ...(dto.totalAmount != null && { totalAmount: dto.totalAmount }),
          ...(dto.invoiceUploadId !== undefined && {
            invoiceUploadId: dto.invoiceUploadId,
          }),
          ...(dto.notes !== undefined && { notes: dto.notes }),
        },
      });
      if (dto.fieldValues === undefined) return;
      await tx.expenseFieldValue.deleteMany({ where: { expenseId: id } });
      if (!dto.fieldValues.length) return;
      await tx.expenseFieldValue.createMany({
        data: dto.fieldValues.map((fv) => ({
          expenseId: id,
          fieldId: fv.fieldId,
          value: fv.value,
        })),
      });
    });
    return this.findOne(id);
  }

  async addAttachment(id: string, dto: AddExpenseAttachmentDto) {
    await this.assertEditable(id, 'mijenjati rashod');
    await this.prisma.expenseAttachment.create({
      data: {
        expenseId: id,
        uploadId: dto.uploadId,
        description: dto.description,
      },
    });
    return this.findOne(id);
  }

  async removeAttachment(id: string, attachmentId: string) {
    await this.assertEditable(id, 'mijenjati rashod');
    const existing = await this.prisma.expenseAttachment.findFirst({
      where: { id: attachmentId, expenseId: id },
      select: { id: true },
    });
    if (!existing) throw new NotFoundException('Prilog nije pronađen.');
    await this.prisma.expenseAttachment.delete({ where: { id: attachmentId } });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.assertEditable(id, 'brisati rashod');
    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }

  private async assertEditable(id: string, action: string) {
    const expense = await this.findOne(id);
    if (expense.book.isClosed) {
      throw new BadRequestException(
        `Knjiga je zatvorena – ne možete ${action}.`,
      );
    }
    return expense;
  }

  private async getCategoryWithTemplate(categoryId: string) {
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: categoryId },
      include: { template: { include: { fields: true } } },
    });
    if (!category) throw new NotFoundException('Kategorija nije pronađena.');
    if (!category.isActive) {
      throw new BadRequestException('Kategorija rashoda nije aktivna.');
    }
    return category;
  }
}
