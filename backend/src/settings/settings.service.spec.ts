import { Test, TestingModule } from '@nestjs/testing'
import { BadRequestException } from '@nestjs/common'
import { SettingsService } from './settings.service'
import { EventsGateway } from '../events/events.gateway'
import { SOCKET_EVENTS } from '../events/socket-events'
import { SettingsEncryptionService } from './settings-encryption.service'
import { ConfigService } from '@nestjs/config'
import { SettingsRepository } from './settings.repository'

const mockRepo = {
  findAll: jest.fn(),
  findManyByKeys: jest.fn(),
  findByKey: jest.fn(),
  upsertByKey: jest.fn(),
  deleteByKey: jest.fn(),
}

const mockEvents = {
  emitToAll: jest.fn(),
  emitToAdmins: jest.fn(),
}

describe('SettingsService', () => {
  let service: SettingsService

  const createConfig = (keyBase64: string | null) => ({
    get: jest.fn().mockImplementation((k: string) => {
      if (k === 'APP_SETTINGS_ENCRYPTION_KEY') return keyBase64
      return undefined
    }),
  })

  beforeEach(async () => {
    jest.clearAllMocks()
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        SettingsService,
        SettingsEncryptionService,
        { provide: SettingsRepository, useValue: mockRepo },
        { provide: EventsGateway, useValue: mockEvents },
        { provide: ConfigService, useValue: createConfig(null) },
      ],
    }).compile()
    service = module.get<SettingsService>(SettingsService)
  })

  describe('findAllPublic', () => {
    it('vraca samo PUBLIC kljuceve sa default vrijednostima kada fale u bazi', async () => {
      mockRepo.findManyByKeys.mockResolvedValueOnce([
        { key: 'app_title', value: 'My Salon' },
      ])

      const result = await service.findAllPublic()
      const map = new Map(result.map((r) => [r.key, r.value]))
      expect(map.get('app_title')).toBe('My Salon')
      expect(map.has('system_email_password')).toBe(false)
      expect(map.get('app_logo')).toBeDefined()
      expect(map.get('public_hero_cta_text_web')).toBe('Rezervišite termin')
      expect(map.get('public_feature_blog')).toBe('true')
      expect(map.has('public_hero_cta_link')).toBe(false)
    })
  })

  describe('set', () => {
    it('baca za nepoznat key', async () => {
      await expect(
        service.set('unknown_key', { value: '1' }, 'u1'),
      ).rejects.toThrow(BadRequestException)
    })

    it('normalizuje boolean vrijednosti', async () => {
      mockRepo.upsertByKey.mockResolvedValueOnce({ key: 'system_maintenance_mode', value: 'true' })
      await service.set('system_maintenance_mode', { value: 'TRUE' }, 'u1')
      expect(mockRepo.upsertByKey).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ value: 'true' }),
          update: expect.objectContaining({ value: 'true' }),
        }),
      )
      expect(mockEvents.emitToAll).toHaveBeenCalledWith(
        SOCKET_EVENTS.SETTINGS_UPDATED,
        { key: 'system_maintenance_mode', value: 'true' },
      )
      expect(mockEvents.emitToAdmins).not.toHaveBeenCalled()
    })

    it('sends PRIVATE setting update only to admins without broadcasting the value', async () => {
      mockRepo.upsertByKey.mockResolvedValueOnce({
        key: 'system_email_host',
        value: 'smtp.internal.example',
      })

      await service.set(
        'system_email_host',
        { value: 'smtp.internal.example' },
        'u1',
      )

      expect(mockEvents.emitToAll).not.toHaveBeenCalled()
      expect(mockEvents.emitToAdmins).toHaveBeenCalledWith(
        SOCKET_EVENTS.SETTINGS_UPDATED,
        { key: 'system_email_host' },
      )
    })

    it('enkriptuje secret vrijednost kada je key prisutan', async () => {
      const base64Key = Buffer.alloc(32, 7).toString('base64')
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SettingsService,
          SettingsEncryptionService,
          { provide: SettingsRepository, useValue: mockRepo },
          { provide: EventsGateway, useValue: mockEvents },
          { provide: ConfigService, useValue: createConfig(base64Key) },
        ],
      }).compile()
      const localService = module.get<SettingsService>(SettingsService)

      mockRepo.upsertByKey.mockResolvedValueOnce({ key: 'system_email_password', value: 'x' })
      await localService.set('system_email_password', { value: 'secret123' }, 'u1')

      const call = mockRepo.upsertByKey.mock.calls[0][0]
      expect(call.create.value).toMatch(/^enc:v1:/)
      expect(call.update.value).toMatch(/^enc:v1:/)
      expect(mockEvents.emitToAll).not.toHaveBeenCalled()
      expect(mockEvents.emitToAdmins).toHaveBeenCalledWith(
        SOCKET_EVENTS.SETTINGS_UPDATED,
        { key: 'system_email_password' },
      )
    })
  })

  describe('getValue', () => {
    it('dekriptuje secret vrijednost kada je enkriptovana', async () => {
      const base64Key = Buffer.alloc(32, 9).toString('base64')
      const module: TestingModule = await Test.createTestingModule({
        providers: [
          SettingsService,
          SettingsEncryptionService,
          { provide: SettingsRepository, useValue: mockRepo },
          { provide: EventsGateway, useValue: mockEvents },
          { provide: ConfigService, useValue: createConfig(base64Key) },
        ],
      }).compile()
      const localService = module.get<SettingsService>(SettingsService)
      const enc = module.get<SettingsEncryptionService>(SettingsEncryptionService).encrypt('secret123')

      mockRepo.findByKey.mockResolvedValueOnce({ key: 'system_email_password', value: enc })
      const value = await localService.getValue('system_email_password')
      expect(value).toBe('secret123')
    })
  })
})

