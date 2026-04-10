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

@Injectable()
export class ExpensesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateExpenseDto, user: CurrentUserPayload) {
    const book = await this.prisma.expenseBook.findUnique({
      where: { id: dto.bookId },
    });
    if (!book) throw new NotFoundException('Knjiga rashoda nije pronađena.');
    if (book.isClosed)
      throw new BadRequestException(
        'Ne možete dodavati rashode u zatvorenu knjigu.',
      );
    const category = await this.prisma.expenseCategory.findUnique({
      where: { id: dto.categoryId },
      include: { template: { include: { fields: true } } },
    });
    if (!category) throw new NotFoundException('Kategorija nije pronađena.');
    if (category.templateId !== category.template.id) {
      /* already loaded */
    }

    const expense = await this.prisma.expense.create({
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
      await this.prisma.expenseFieldValue.createMany({
        data: dto.fieldValues.map((fv) => ({
          expenseId: expense.id,
          fieldId: fv.fieldId,
          value: fv.value,
        })),
      });
    }
    if (dto.attachmentUploadIds?.length) {
      await this.prisma.expenseAttachment.createMany({
        data: dto.attachmentUploadIds.map((uploadId) => ({
          expenseId: expense.id,
          uploadId,
        })),
      });
    }
    return this.findOne(expense.id);
  }

  async findAll(bookId?: string) {
    const where = bookId ? { bookId } : {};
    return this.prisma.expense.findMany({
      where,
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
    const e = await this.prisma.expense.findUnique({
      where: { id },
      include: {
        book: true,
        category: { include: { template: { include: { fields: true } } } },
        fieldValues: { include: { field: true } },
        attachments: { include: { upload: true } },
      },
    });
    if (!e) throw new NotFoundException('Rashod nije pronađen.');
    return e;
  }

  async update(id: string, dto: UpdateExpenseDto, user: CurrentUserPayload) {
    const expense = await this.findOne(id);
    if (expense.book.isClosed)
      throw new BadRequestException(
        'Ne možete mijenjati rashod u zatvorenoj knjizi.',
      );
    await this.prisma.expense.update({
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
    if (dto.fieldValues?.length) {
      await this.prisma.expenseFieldValue.deleteMany({
        where: { expenseId: id },
      });
      await this.prisma.expenseFieldValue.createMany({
        data: dto.fieldValues.map((fv) => ({
          expenseId: id,
          fieldId: fv.fieldId,
          value: fv.value,
        })),
      });
    }
    return this.findOne(id);
  }

  async addAttachment(
    id: string,
    dto: AddExpenseAttachmentDto,
    user: CurrentUserPayload,
  ) {
    const expense = await this.findOne(id);
    if (expense.book.isClosed)
      throw new BadRequestException(
        'Ne možete mijenjati rashod u zatvorenoj knjizi.',
      );
    await this.prisma.expenseAttachment.create({
      data: {
        expenseId: id,
        uploadId: dto.uploadId,
        description: dto.description,
      },
    });
    return this.findOne(id);
  }

  async removeAttachment(
    id: string,
    attachmentId: string,
    user: CurrentUserPayload,
  ) {
    const expense = await this.findOne(id);
    if (expense.book.isClosed)
      throw new BadRequestException(
        'Ne možete mijenjati rashod u zatvorenoj knjizi.',
      );
    const existing = await this.prisma.expenseAttachment.findFirst({
      where: { id: attachmentId, expenseId: id },
    });
    if (!existing) throw new NotFoundException('Prilog nije pronađen.');
    await this.prisma.expenseAttachment.delete({ where: { id: attachmentId } });
    return this.findOne(id);
  }

  async remove(id: string) {
    const expense = await this.findOne(id);
    if (expense.book.isClosed)
      throw new BadRequestException(
        'Ne možete brisati rashod iz zatvorene knjige.',
      );
    await this.prisma.expense.delete({ where: { id } });
    return { deleted: true };
  }
}
