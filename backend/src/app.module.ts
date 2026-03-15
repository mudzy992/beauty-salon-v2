import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ConfigModule } from './config/config.module';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UploadsModule } from './uploads/uploads.module';
import { UsersModule } from './users/users.module';
import { SalonModule } from './salon/salon.module';
import { ServicesModule } from './services/services.module';
import { StylistsModule } from './stylists/stylists.module';
import { SettingsModule } from './settings/settings.module';
import { ReservationsModule } from './reservations/reservations.module';
import { NotificationsModule } from './notifications/notifications.module';
import { DailyLogModule } from './daily-log/daily-log.module';
import { FinanceModule } from './finance/finance.module';
import { BlogModule } from './blog/blog.module';
import { GalleryModule } from './gallery/gallery.module';
import { ReviewsModule } from './reviews/reviews.module';
import { EventsModule } from './events/events.module';
import { AnalyticsModule } from './analytics/analytics.module';
import { LoyaltyModule } from './loyalty/loyalty.module';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ConfigModule,
    PrismaModule,
    AuthModule,
    UploadsModule,
    UsersModule,
    SalonModule,
    ServicesModule,
    StylistsModule,
    SettingsModule,
    ReservationsModule,
    NotificationsModule,
    DailyLogModule,
    FinanceModule,
    BlogModule,
    GalleryModule,
    ReviewsModule,
    EventsModule,
    AnalyticsModule,
    LoyaltyModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
  ],
})
export class AppModule {}
