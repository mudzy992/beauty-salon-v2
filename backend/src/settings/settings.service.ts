import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { SetSettingDto } from './dto/set-setting.dto';
import { EventsGateway } from '../events/events.gateway';
import { SOCKET_EVENTS } from '../events/socket-events';
import { SETTINGS_REGISTRY } from './settings-registry';
import type { SettingRegistryItem, SettingScope } from './settings-registry.types';
import { SettingsEncryptionService } from './settings-encryption.service';
import { SettingsRepository } from './settings.repository';

@Injectable()
export class SettingsService {
  constructor(
    private readonly repo: SettingsRepository,
    private readonly events: EventsGateway,
    private readonly encryption: SettingsEncryptionService,
  ) {}

  private getRegistryItem(key: string): SettingRegistryItem | null {
    return SETTINGS_REGISTRY.find((item) => item.key === key) ?? null;
  }

  private getRegistryItemOrThrow(key: string): SettingRegistryItem {
    const item = this.getRegistryItem(key);
    if (!item) throw new BadRequestException('Nepoznata postavka.');
    return item;
  }

  private normalizeString(value: string): string {
    return typeof value === 'string' ? value : String(value);
  }

  private normalizeHexColor(value: string): string {
    const v = String(value ?? '').trim();
    if (v === '') return '';
    const ok = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(v);
    if (!ok) throw new BadRequestException('Boja mora biti hex format (npr. #632238).');
    return v.toUpperCase();
  }

  private normalizeBoolean(value: string): string {
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return 'true';
    if (normalized === 'false') return 'false';
    throw new BadRequestException('Vrijednost mora biti true ili false.');
  }

  private normalizeNumber(value: string, min?: number, max?: number): string {
    const parsed = Number(value);
    if (!Number.isFinite(parsed)) throw new BadRequestException('Vrijednost mora biti broj.');
    const clampedMin = typeof min === 'number' ? min : -Number.MAX_SAFE_INTEGER;
    const clampedMax = typeof max === 'number' ? max : Number.MAX_SAFE_INTEGER;
    const clamped = Math.min(clampedMax, Math.max(clampedMin, parsed));
    return String(clamped);
  }

  private normalizeJson(value: string, key: string): string {
    let parsed: unknown;
    try {
      parsed = JSON.parse(value);
    } catch {
      throw new BadRequestException('Vrijednost mora biti validan JSON.')
    }

    if (key === 'loyalty_tiers') {
      if (!Array.isArray(parsed))
        throw new BadRequestException('Loyalty tiers mora biti JSON lista.')
      const ok = parsed.every((item) => {
        if (!item || typeof item !== 'object') return false
        const t = item as Record<string, unknown>
        const hasId = typeof t.id === 'string' && t.id.trim().length > 0
        const hasName = typeof t.name === 'string' && t.name.trim().length > 0
        const hasMinPoints = typeof t.minPoints === 'number' && Number.isFinite(t.minPoints)
        const maxOk =
          t.maxDiscountPercent === undefined ||
          (typeof t.maxDiscountPercent === 'number' && Number.isFinite(t.maxDiscountPercent))
        return hasId && hasName && hasMinPoints && maxOk
      })
      if (!ok)
        throw new BadRequestException(
          'Loyalty tiers mora biti lista objekata sa id, name, minPoints (i opcionalno maxDiscountPercent).',
        )
    }

    if (key === 'loyalty_excluded_services') {
      if (!Array.isArray(parsed) || !parsed.every((x) => typeof x === 'string'))
        throw new BadRequestException('Excluded services mora biti JSON lista string ID-ova.')
    }

    if (key === 'system_email_campaign_templates') {
      if (!Array.isArray(parsed))
        throw new BadRequestException('Kampanje moraju biti JSON lista.')
    }

    if (key.startsWith('system_email_template_')) {
      if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
        throw new BadRequestException('Email template mora biti JSON objekat.')
    }

    return JSON.stringify(parsed);
  }

  async findAllAdmin() {
    const rows = await this.repo.findAll();
    return rows.map((row) => {
      const registry = this.getRegistryItem(row.key);
      const isSecret = registry?.isSecret ?? false;
      const isConfigured = isSecret ? row.value.trim().length > 0 : row.value.trim().length > 0;
      return {
        key: row.key,
        value: isSecret ? null : row.value,
        description: row.description ?? null,
        scope: (registry?.scope ?? 'PRIVATE') as SettingScope,
        type: registry?.type ?? 'string',
        isSecret,
        isConfigured,
        updatedAt: row.updatedAt,
        updatedBy: row.updatedBy ?? null,
      };
    });
  }

  async findAllPublic() {
    const publicKeys = SETTINGS_REGISTRY.filter((i) => i.scope === 'PUBLIC').map((i) => i.key);
    const rows = await this.repo.findManyByKeys(publicKeys);
    const map = new Map(rows.map((r) => [r.key, r.value]));
    return publicKeys
      .map((key) => {
        const registry = this.getRegistryItem(key);
        const raw = map.get(key);
        const value = raw ?? registry?.defaultValue ?? '';
        return { key, value };
      })
      .filter((item) => item.value !== undefined);
  }

  getRegistry() {
    return SETTINGS_REGISTRY;
  }

  async findByKey(key: string) {
    const setting = await this.repo.findByKey(key);
    if (!setting) throw new NotFoundException('Postavka nije pronađena.');
    const registry = this.getRegistryItem(key);
    const isSecret = registry?.isSecret ?? false;
    const isConfigured = isSecret ? setting.value.trim().length > 0 : setting.value.trim().length > 0;
    return {
      key: setting.key,
      value: isSecret ? null : setting.value,
      description: setting.description ?? null,
      scope: (registry?.scope ?? 'PRIVATE') as SettingScope,
      type: registry?.type ?? 'string',
      isSecret,
      isConfigured,
      updatedAt: setting.updatedAt,
      updatedBy: setting.updatedBy ?? null,
    };
  }

  async getValue(key: string): Promise<string | null> {
    const registry = this.getRegistryItem(key);
    const setting = await this.repo.findByKey(key);
    const raw = setting?.value ?? null;
    if (!registry?.isSecret) return raw;
    if (!raw) return raw;
    return this.encryption.decrypt(raw);
  }

  async getString(key: string): Promise<string> {
    const registry = this.getRegistryItemOrThrow(key);
    const value = await this.getValue(key);
    return (value ?? registry.defaultValue ?? '').toString();
  }

  async getBoolean(key: string): Promise<boolean> {
    const registry = this.getRegistryItemOrThrow(key);
    const raw = await this.getValue(key);
    const value = raw ?? registry.defaultValue ?? 'false';
    const normalized = value.trim().toLowerCase();
    if (normalized === 'true') return true;
    if (normalized === 'false') return false;
    return (registry.defaultValue ?? 'false').toLowerCase() === 'true';
  }

  async getNumber(key: string): Promise<number> {
    const registry = this.getRegistryItemOrThrow(key);
    const raw = await this.getValue(key);
    const value = raw ?? registry.defaultValue ?? '0';
    const parsed = Number(value);
    const fallbackParsed = Number(registry.defaultValue ?? '0');
    const base = Number.isFinite(parsed) ? parsed : Number.isFinite(fallbackParsed) ? fallbackParsed : 0;
    const min = typeof registry.min === 'number' ? registry.min : -Number.MAX_SAFE_INTEGER;
    const max = typeof registry.max === 'number' ? registry.max : Number.MAX_SAFE_INTEGER;
    return Math.min(max, Math.max(min, base));
  }

  async getJson<T>(key: string): Promise<T> {
    const registry = this.getRegistryItemOrThrow(key);
    const raw = await this.getValue(key);
    const value = raw ?? registry.defaultValue ?? '{}';
    try {
      return JSON.parse(value) as T;
    } catch {
      const fallback = registry.defaultValue ?? '{}';
      return JSON.parse(fallback) as T;
    }
  }

  async set(key: string, dto: SetSettingDto, updatedBy?: string) {
    const registry = this.getRegistryItemOrThrow(key);
    const rawValue = this.normalizeString(dto.value ?? '');
    const hexKeys = new Set([
      'app_logo_svg_color',
      'app_logo_text_color',
      'app_logo_accent',
      'theme_primary',
      'theme_accent',
    ]);
    const keySpecific = hexKeys.has(key) ? this.normalizeHexColor(rawValue) : rawValue;
    const normalizedValue =
      registry.type === 'boolean'
        ? this.normalizeBoolean(keySpecific)
        : registry.type === 'number'
          ? this.normalizeNumber(keySpecific, registry.min, registry.max)
          : registry.type === 'json'
            ? this.normalizeJson(keySpecific, key)
            : this.normalizeString(keySpecific);
    const valueToStore =
      registry.isSecret && normalizedValue.trim().length > 0
        ? this.encryption.encrypt(normalizedValue)
        : normalizedValue;
    const result = await this.repo.upsertByKey({
      where: { key },
      create: {
        key,
        value: valueToStore,
        description: dto.description,
        updatedBy: updatedBy ?? null,
      },
      update: {
        value: valueToStore,
        ...(dto.description !== undefined && { description: dto.description }),
        updatedBy: updatedBy ?? undefined,
      },
    });
    this.events.emitToAll(SOCKET_EVENTS.SETTINGS_UPDATED, {
      key,
      value: registry.isSecret ? null : normalizedValue,
    });
    return result;
  }

  async remove(key: string) {
    const setting = await this.repo.findByKey(key);
    if (!setting) throw new NotFoundException('Postavka nije pronađena.');
    await this.repo.deleteByKey(key);
    return { deleted: true };
  }
}
