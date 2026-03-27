import { Test, TestingModule } from '@nestjs/testing'
import { SettingsController } from './settings.controller'
import { SettingsService } from './settings.service'

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

