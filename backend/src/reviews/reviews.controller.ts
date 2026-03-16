import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import { Roles } from '../common/decorators/roles.decorator';
import { RolesGuard } from '../common/guards/roles.guard';
import { UseGuards } from '@nestjs/common';

@Controller('api/reviews')
export class ReviewsController {
  constructor(private readonly reviews: ReviewsService) {}

  @Post()
  create(
    @Body() dto: CreateReviewDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.reviews.create(dto, user.sub);
  }

  @Get('featured/random')
  @Public()
  findOneRandomApproved() {
    return this.reviews.findOneRandomApproved();
  }

  @Get()
  @Public()
  findAll(
    @Query('serviceId') serviceId: string,
    @Query('stylistProfileId') stylistProfileId: string,
    @Query('approved') approved: string,
  ) {
    return this.reviews.findAll({
      serviceId,
      stylistProfileId,
      approvedOnly: approved === 'true',
    });
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.reviews.findOne(id);
  }

  @Patch(':id/approve')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  approve(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.reviews.approve(id, user);
  }

  @Delete(':id')
  remove(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.reviews.remove(id, user);
  }
}
