import { Test, TestingModule } from '@nestjs/testing'
import {
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common'
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

    it('serializira app logo upload reference kroz repository lock opciju', async () => {
      mockRepo.upsertByKey.mockResolvedValueOnce({
        key: 'app_logo',
        value: '/uploads/public/brand/logo.svg',
      })

      await service.set(
        'app_logo',
        { value: '/uploads/public/brand/logo.svg' },
        'u1',
      )

      expect(mockRepo.upsertByKey).toHaveBeenCalledWith(
        expect.objectContaining({ where: { key: 'app_logo' } }),
        ['/uploads/public/brand/logo.svg'],
      )
    })

    it('accepts bounded structured email-template blocks', async () => {
      const key = 'system_email_template_general'
      const value = JSON.stringify({
        subject: 'Notice',
        blocks: [
          { id: 'title-1', type: 'title', content: 'Hello' },
          { id: 'button-1', type: 'button', content: 'Open', secondary: '{{appUrl}}' },
        ],
      })
      mockRepo.upsertByKey.mockResolvedValueOnce({ key, value })

      await service.set(key, { value }, 'u1')

      expect(mockRepo.upsertByKey).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ value }),
          update: expect.objectContaining({ value }),
        }),
      )
    })

    it('rejects unknown and oversized structured email-template blocks', async () => {
      const key = 'system_email_template_general'
      const invalidValues = [
        JSON.stringify({ blocks: [{ id: 'x', type: 'rawHtml', content: '<script>' }] }),
        JSON.stringify({ blocks: [{ id: 'x', type: 'text', content: 'x'.repeat(5001) }] }),
        JSON.stringify({
          blocks: [
            { id: 'duplicate', type: 'text', content: 'First' },
            { id: 'duplicate', type: 'text', content: 'Second' },
          ],
        }),
        JSON.stringify({ blocks: Array.from({ length: 31 }, (_, index) => ({ id: `b-${index}`, type: 'spacer', content: '' })) }),
      ]

      for (const value of invalidValues) {
        await expect(service.set(key, { value }, 'u1')).rejects.toThrow(BadRequestException)
      }
      expect(mockRepo.upsertByKey).not.toHaveBeenCalled()
    })

    it('rejects unsafe or oversized campaign block definitions while retaining the campaign list shape', async () => {
      const invalidValue = JSON.stringify([
        {
          id: 'campaign-1',
          name: 'Campaign',
          html: '',
          blocks: [{ id: 'raw-1', type: 'rawHtml', content: '<script>alert(1)</script>' }],
        },
      ])

      await expect(
        service.set('system_email_campaign_templates', { value: invalidValue }, 'u1'),
      ).rejects.toThrow(BadRequestException)
      expect(mockRepo.upsertByKey).not.toHaveBeenCalled()
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

    it('ne upisuje secret vrijednost kao plaintext kada encryption key nedostaje', async () => {
      await expect(
        service.set('system_email_password', { value: 'secret123' }, 'u1'),
      ).rejects.toThrow(InternalServerErrorException)

      expect(mockRepo.upsertByKey).not.toHaveBeenCalled()
      expect(mockEvents.emitToAdmins).not.toHaveBeenCalled()
      expect(mockEvents.emitToAll).not.toHaveBeenCalled()
    })

    it('ne upisuje secret vrijednost kada je encryption key neispravan', async () => {
      const base64Key = Buffer.alloc(32, 7).toString('base64')
      const invalidKeys = [
        `${base64Key.slice(0, -1)}!`,
        Buffer.alloc(31, 7).toString('base64'),
      ]

      for (const invalidKey of invalidKeys) {
        const module: TestingModule = await Test.createTestingModule({
          providers: [
            SettingsService,
            SettingsEncryptionService,
            { provide: SettingsRepository, useValue: mockRepo },
            { provide: EventsGateway, useValue: mockEvents },
            { provide: ConfigService, useValue: createConfig(invalidKey) },
          ],
        }).compile()
        const localService = module.get<SettingsService>(SettingsService)

        await expect(
          localService.set('system_email_password', { value: 'secret123' }, 'u1'),
        ).rejects.toThrow(InternalServerErrorException)
      }

      expect(mockRepo.upsertByKey).not.toHaveBeenCalled()
      expect(mockEvents.emitToAdmins).not.toHaveBeenCalled()
      expect(mockEvents.emitToAll).not.toHaveBeenCalled()
    })

    it('dozvoljava brisanje prazne secret postavke bez encryption key-a', async () => {
      mockRepo.upsertByKey.mockResolvedValueOnce({
        key: 'system_email_password',
        value: '',
      })

      await service.set('system_email_password', { value: '' }, 'u1')

      expect(mockRepo.upsertByKey).toHaveBeenCalledWith(
        expect.objectContaining({
          create: expect.objectContaining({ value: '' }),
          update: expect.objectContaining({ value: '' }),
        }),
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

