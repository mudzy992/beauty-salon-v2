import { Test, TestingModule } from '@nestjs/testing'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'
import { Reflector } from '@nestjs/core'
import { RolesGuard } from '../common/guards/roles.guard'
import { ForbiddenException } from '@nestjs/common'
import type { ExecutionContext } from '@nestjs/common'

const mockSettingsService = {
  findAllAdmin: jest.fn(),
  findAllPublic: jest.fn(),
  findByKey: jest.fn(),
  set: jest.fn(),
  remove: jest.fn(),
}

describe('SettingsController', () => {
  let controller: SettingsController

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SettingsController],
      providers: [{ provide: SettingsService, useValue: mockSettingsService }],
    }).compile()
    controller = module.get<SettingsController>(SettingsController)
  })

  it('requires owner or system admin for theme-setting writes', () => {
    const guard = new RolesGuard(new Reflector())
    const contextFor = (roles: string[]) => ({
      getHandler: () => SettingsController.prototype.set,
      getClass: () => SettingsController,
      switchToHttp: () => ({ getRequest: () => ({ user: { roles } }) }),
    }) as unknown as ExecutionContext
    expect(guard.canActivate(contextFor(['OWNER']))).toBe(true)
    expect(guard.canActivate(contextFor(['SYSTEM_ADMIN']))).toBe(true)
    expect(() => guard.canActivate(contextFor(['CLIENT']))).toThrow(ForbiddenException)
    expect(() => guard.canActivate(contextFor([]))).toThrow(ForbiddenException)
  })

  it('findAll poziva findAllAdmin', async () => {
    mockSettingsService.findAllAdmin.mockResolvedValueOnce([])
    await controller.findAll()
    expect(mockSettingsService.findAllAdmin).toHaveBeenCalled()
  })

  it('findAllPublic poziva findAllPublic', async () => {
    mockSettingsService.findAllPublic.mockResolvedValueOnce([])
    await controller.findAllPublic()
    expect(mockSettingsService.findAllPublic).toHaveBeenCalled()
  })
})

