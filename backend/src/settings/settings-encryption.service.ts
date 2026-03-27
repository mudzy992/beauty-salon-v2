import { Injectable } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import crypto from 'crypto'

const ENCRYPTION_PREFIX = 'enc:v1'
const KEY_BYTES = 32
const IV_BYTES = 12

@Injectable()
export class SettingsEncryptionService {
  constructor(private readonly config: ConfigService) {}

  private getKey(): Buffer | null {
    const raw = this.config.get<string>('APP_SETTINGS_ENCRYPTION_KEY')?.trim()
    if (!raw) return null
    try {
      const buf = Buffer.from(raw, 'base64')
      if (buf.length !== KEY_BYTES) return null
      return buf
    } catch {
      return null
    }
  }

  isEncrypted(value: string): boolean {
    return typeof value === 'string' && value.startsWith(`${ENCRYPTION_PREFIX}:`)
  }

  encrypt(plainText: string): string {
    const key = this.getKey()
    if (!key) return plainText
    const iv = crypto.randomBytes(IV_BYTES)
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv)
    const enc = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()])
    const tag = cipher.getAuthTag()
    return [
      ENCRYPTION_PREFIX,
      iv.toString('base64'),
      tag.toString('base64'),
      enc.toString('base64'),
    ].join(':')
  }

  decrypt(value: string): string {
    if (!this.isEncrypted(value)) return value
    const key = this.getKey()
    if (!key) return value
    const parts = value.split(':')
    // Format: enc:v1:<ivBase64>:<tagBase64>:<cipherBase64>
    if (parts.length !== 5) return value
    if (parts[0] !== 'enc' || parts[1] !== 'v1') return value
    const iv = Buffer.from(parts[2], 'base64')
    const tag = Buffer.from(parts[3], 'base64')
    const data = Buffer.from(parts[4], 'base64')
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv)
    decipher.setAuthTag(tag)
    const dec = Buffer.concat([decipher.update(data), decipher.final()])
    return dec.toString('utf8')
  }
}

