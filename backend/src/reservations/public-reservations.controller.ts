import { Controller, Get, Param } from '@nestjs/common';
import { Public } from '../common/decorators/public.decorator';
import { ReservationsService } from './reservations.service';

@Controller('api/public/reservations')
export class PublicReservationsController {
  constructor(private readonly reservations: ReservationsService) {}

  @Get('by-token/:token')
  @Public()
  findByViewToken(@Param('token') token: string) {
    return this.reservations.findPublicByViewToken(token);
  }
}
