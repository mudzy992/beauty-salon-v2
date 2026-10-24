import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common'
import {
  IncomeBookRepository,
  type PrismaTx,
} from './repositories/income-book.repository'
import {
  assertValidPeriod,
  getCurrentPeriod,
  getPreviousPeriod,
  isFutureMonth,
  isPastMonth,
} from '../common/utils/book-period'

const MAX_REASON_LENGTH = 2000

@Injectable()
export class IncomeBooksService {
  constructor(private readonly repository: IncomeBookRepository) {}

  /** CRON: 1. u mjesecu – otvori novu knjigu prihoda, zatvori prethodnu. */
  async openNewMonthAndClosePrevious() {
    const current = getCurrentPeriod()
    const previous = getPreviousPeriod(current)

    const previousBook = await this.repository.findByPeriod(
      previous.year,
      previous.month,
    )
    if (previousBook && !previousBook.closedAt) {
      await this.repository.setLockState(previousBook.id, {
        closedAt: new Date(),
        action: 'LOCK',
        reason: 'Automatsko zaključavanje na kraju mjeseca.',
      })
    }

    let currentBook = await this.repository.findByPeriod(
      current.year,
      current.month,
    )
    if (!currentBook) {
      currentBook = await this.repository.createForPeriod(
        current.year,
        current.month,
      )
    }
    return { opened: currentBook.id, closed: previousBook?.id ?? null }
  }

  /** Vraća/kreira mjesečnu knjigu na istom transaction clientu kad je proslijeđen. */
  async getOrCreateForMonth(year: number, month: number, tx?: PrismaTx) {
    assertValidPeriod(year, month)
    if (isFutureMonth(year, month)) {
      throw new BadRequestException(
        'Ne možete kreirati knjigu za budući mjesec.',
      )
    }
    return this.repository.upsertForPeriod(year, month, tx)
  }

  findAll() {
    return this.repository.findAllOrdered()
  }

  async findOne(id: string) {
    const book = await this.repository.findDetail(id)
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.')
    return book
  }

  /** Vraća knjigu ili baca ako ne postoji. Interno za ostale finance servise. */
  async getBookOrThrow(id: string) {
    const book = await this.repository.findById(id)
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.')
    return book
  }

  /** Knjiga mora biti otvorena i ne u budućnosti da bi se stavke mijenjale. */
  async getEditableBookOrThrow(id: string, action: string) {
    const book = await this.getBookOrThrow(id)
    if (book.closedAt) {
      throw new BadRequestException(
        `Knjiga je zaključana – ${action} nije moguće.`,
      )
    }
    if (isFutureMonth(book.year, book.month)) {
      throw new BadRequestException(
        `Knjiga je u budućnosti – ${action} nije moguće.`,
      )
    }
    return book
  }

  async unlockBook(id: string, reason: string, userId: string) {
    const trimmedReason = reason?.trim()
    if (!trimmedReason) {
      throw new BadRequestException('Morate unijeti razlog otključavanja.')
    }
    if (trimmedReason.length > MAX_REASON_LENGTH) {
      throw new BadRequestException('Razlog otključavanja je predugačak.')
    }
    const book = await this.getBookOrThrow(id)
    if (!book.closedAt) {
      throw new BadRequestException('Knjiga je već otključana.')
    }
    if (!isPastMonth(book.year, book.month)) {
      throw new BadRequestException(
        'Otključavanje je dozvoljeno samo za knjige iz prošlosti.',
      )
    }
    return this.repository.setLockState(id, {
      closedAt: null,
      action: 'UNLOCK',
      reason: trimmedReason,
      createdById: userId,
    })
  }

  async lockBook(id: string, userId: string) {
    const book = await this.getBookOrThrow(id)
    if (book.closedAt) {
      throw new BadRequestException('Knjiga je već zaključana.')
    }
    return this.repository.setLockState(id, {
      closedAt: new Date(),
      action: 'LOCK',
      createdById: userId,
    })
  }
}
