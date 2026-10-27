import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateExpenseDto } from './dto/create-expense.dto';
import { UpdateExpenseDto } from './dto/update-expense.dto';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { AddExpenseAttachmentDto } from './dto/add-expense-attachment.dto';
import { assertExpensePayload } from './utils/expense-payload';

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, user: CurrentUserPayload) {
    const category = await this.getCategoryWithTemplate(dto.categoryId);
    assertExpensePayload(category, dto.fieldValues, dto.notes, dto.totalAmount);

    const expense = await this.prisma.$transaction(async (tx) => {
      await this.lockEditableBook(tx, dto.bookId, 'dodavati rashode');
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
    const expense = await this.findOne(id);
    if (
      dto.fieldValues !== undefined ||
      dto.notes !== undefined ||
      dto.totalAmount != null
    ) {
      const category = await this.getCategoryWithTemplate(expense.categoryId);
      assertExpensePayload(
        category,
        dto.fieldValues !== undefined ? dto.fieldValues : undefined,
        dto.notes !== undefined ? dto.notes : expense.notes,
        dto.totalAmount ?? Number(expense.totalAmount),
        { skipFieldValues: dto.fieldValues === undefined && category.isFixed },
      );
    }

    await this.prisma.$transaction(async (tx) => {
      await this.lockEditableExpense(tx, id, 'mijenjati rashod');
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
      if (dto.attachmentUploadIds?.length) {
        await tx.expenseAttachment.createMany({
          data: dto.attachmentUploadIds.map((uploadId) => ({
            expenseId: id,
            uploadId,
          })),
        });
      }
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
    await this.prisma.$transaction(async (tx) => {
      await this.lockEditableExpense(tx, id, 'mijenjati rashod');
      await tx.expenseAttachment.create({
        data: {
          expenseId: id,
          uploadId: dto.uploadId,
          description: dto.description,
        },
      });
    });
    return this.findOne(id);
  }

  async removeAttachment(id: string, attachmentId: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.lockEditableExpense(tx, id, 'mijenjati rashod');
      const existing = await tx.expenseAttachment.findFirst({
        where: { id: attachmentId, expenseId: id },
        select: { id: true },
      });
      if (!existing) throw new NotFoundException('Prilog nije pronađen.');
      await tx.expenseAttachment.delete({ where: { id: attachmentId } });
    });
    return this.findOne(id);
  }

  async remove(id: string) {
    await this.prisma.$transaction(async (tx) => {
      await this.lockEditableExpense(tx, id, 'brisati rashod');
      await tx.expense.delete({ where: { id } });
    });
    return { deleted: true };
  }

  private async lockEditableExpense(
    tx: Prisma.TransactionClient,
    id: string,
    action: string,
  ) {
    const expense = await tx.expense.findUnique({
      where: { id },
      select: { bookId: true },
    });
    if (!expense) throw new NotFoundException('Rashod nije pronađen.');
    await this.lockEditableBook(tx, expense.bookId, action);
    return expense;
  }

  /**
   * Writes and book closure serialize on the same book row. If the write wins,
   * it commits before the close; if closure wins, this check observes the lock.
   */
  private async lockEditableBook(
    tx: Prisma.TransactionClient,
    bookId: string,
    action: string,
  ) {
    await tx.$queryRaw(
      Prisma.sql`SELECT id FROM "expense_books" WHERE id = ${bookId} FOR UPDATE`,
    );
    const book = await tx.expenseBook.findUnique({
      where: { id: bookId },
      select: { id: true, isClosed: true },
    });
    if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    if (book.isClosed) {
      throw new BadRequestException(
        `Knjiga je zatvorena – ne možete ${action}.`,
      );
    }
    return book;
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
