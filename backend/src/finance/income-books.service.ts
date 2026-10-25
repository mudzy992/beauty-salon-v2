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
  isFutureMonth,
  isPastMonth,
} from '../common/utils/book-period'

const MAX_REASON_LENGTH = 2000

@Injectable()
export class IncomeBooksService {
  constructor(private readonly repository: IncomeBookRepository) {}

  /**
   * CRON mjesečnog usklađivanja: osigurava otvorenu knjigu za tekući mjesec i
   * zatvara ranije otvorene periode. Poziv je idempotentan i siguran za
   * catch-up nakon propuštenog izvršavanja; ručno otključane knjige se čuvaju.
   */
  async openNewMonthAndClosePrevious() {
    const current = getCurrentPeriod()
    const openBooks = await this.repository.findOpenBooksBeforePeriod(
      current.year,
      current.month,
    )
    const closed: string[] = []

    for (const book of openBooks) {
      // Zadnji UNLOCK je eksplicitna ručna odluka i ne smije biti poništena
      // ponovnim dnevnim catch-up pozivom.
      if (book.lockEvents[0]?.action === 'UNLOCK') continue

      const locked = await this.repository.setLockState(
        book.id,
        {
          closedAt: new Date(),
          action: 'LOCK',
          reason: 'Automatsko zaključavanje prethodnog finansijskog perioda.',
        },
        { ignoreIfAlreadyTarget: true },
      )
      if (locked?.closedAt) closed.push(book.id)
    }

    // Unique period key is the durable idempotency marker if multiple app
    // instances perform the catch-up at the same time.
    const currentBook = await this.repository.upsertForPeriod(
      current.year,
      current.month,
    )

    return { opened: currentBook.id, closed }
  }

  /** Vraća/kreira mjesečnu knjigu na istom transaction clientu kad je proslijeđen. */
  async getOrCreateForMonth(year: number, month: number, tx?: PrismaTx) {
    assertValidPeriod(year, month)
    if (isFutureMonth(year, month)) {
      throw new BadRequestException(
        'Ne možete kreirati knjigu za budući mjesec.',
      )
    }
    const book = await this.repository.upsertForPeriod(year, month, tx)
    if (!tx) return book
    const lockedBook = await this.repository.findByIdForUpdate(book.id, tx)
    if (!lockedBook) {
      throw new NotFoundException('Knjiga prihoda nije pronađena.')
    }
    return lockedBook
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
  async getEditableBookOrThrow(id: string, action: string, tx?: PrismaTx) {
    const book = tx
      ? await this.repository.findByIdForUpdate(id, tx)
      : await this.getBookOrThrow(id)
    if (!book) throw new NotFoundException('Knjiga prihoda nije pronađena.')
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
    const unlocked = await this.repository.setLockState(id, {
      closedAt: null,
      action: 'UNLOCK',
      reason: trimmedReason,
      createdById: userId,
    })
    if (!unlocked) {
      throw new BadRequestException('Knjiga je već otključana.')
    }
    return unlocked
  }

  async lockBook(id: string, userId: string) {
    const locked = await this.repository.setLockState(id, {
      closedAt: new Date(),
      action: 'LOCK',
      createdById: userId,
    })
    if (!locked) {
      throw new BadRequestException('Knjiga je već zaključana.')
    }
    return locked
  }
}
