import {
  Body,
  Controller,
  Delete,
  Get,
  Put,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { AssignRoleDto } from './dto/assign-role.dto';
import { RemoveStylistRoleDto } from './dto/remove-stylist-role.dto';
import { ClientListQueryDto } from './dto/client-list-query.dto';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import type { CurrentUserPayload } from '../common/decorators/current-user.decorator';

@Controller('api/users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('system-admins')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findSystemAdmins(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findSystemAdmins(user.roles);
  }

  @Get('stylists')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findStylists(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findStylists(user.roles);
  }

  @Get('clients/admin')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findClientsForAdmin(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ClientListQueryDto,
  ) {
    return this.usersService.findClientsForAdmin(user.roles, query, query.q);
  }

  @Get('clients')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER', 'STYLIST')
  findClients(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: ClientListQueryDto,
  ) {
    return this.usersService.findClientPicker(user.roles, query, query.q);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query('page') page?: string,
    @Query('pageSize') pageSize?: string,
  ) {
    return this.usersService.findAll(user.roles, {
      page: page != null ? parseInt(page, 10) : undefined,
      pageSize: pageSize != null ? parseInt(pageSize, 10) : undefined,
    });
  }

  @Get('for-daily-log')
  @UseGuards(RolesGuard)
  @Roles('STYLIST', 'SYSTEM_ADMIN', 'OWNER')
  findForDailyLog(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findForDailyLog(user.roles);
  }

  @Get('profile')
  getProfile(@CurrentUser() user: CurrentUserPayload) {
    return this.usersService.getProfile(user.sub);
  }

  @Put('profile')
  updateProfile(
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.updateProfile(user.sub, dto);
  }

  @Get('username-availability')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getUsernameAvailability(
    @Query('username') username: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.getUsernameAvailability(username, user.roles);
  }

  @Get('profile/username-availability')
  getProfileUsernameAvailability(
    @Query('username') username: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.getProfileUsernameAvailability(user.sub, username);
  }

  @Get(':id/username-availability')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getUserUsernameAvailabilityForAdminEdit(
    @Param('id') id: string,
    @Query('username') username: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.getUsernameAvailabilityForUserEdit(
      id,
      username,
      user.roles,
    );
  }

  @Get(':id')
  findOne(@Param('id') id: string, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.findOne(id, user);
  }

  @Get(':id/analytics')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getClientAnalytics(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ) {
    return this.usersService.getClientAnalytics(
      id,
      user.roles,
      fromDate,
      toDate,
    );
  }

  @Get(':id/stylist-removal-preview')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  getStylistRemovalPreview(
    @Param('id') id: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.getStylistRemovalPreview(id, user.roles);
  }

  @Post(':id/remove-stylist-role')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeStylistRole(
    @Param('id') id: string,
    @Body() dto: RemoveStylistRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.removeStylistRole(id, dto, user.roles);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  create(@Body() dto: CreateUserDto, @CurrentUser() user: CurrentUserPayload) {
    return this.usersService.create(dto, user.roles);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.update(id, dto, user);
  }

  @Post(':id/roles')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  assignRole(
    @Param('id') id: string,
    @Body() dto: AssignRoleDto,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.assignRole(id, dto, user.roles);
  }

  @Delete(':id/roles/:roleName')
  @UseGuards(RolesGuard)
  @Roles('SYSTEM_ADMIN', 'OWNER')
  removeRole(
    @Param('id') id: string,
    @Param('roleName') roleName: string,
    @CurrentUser() user: CurrentUserPayload,
  ) {
    return this.usersService.removeRole(id, roleName, user.roles);
  }
}
