import { generateSecret, generateURI, verify } from 'otplib'
import bcrypt from 'bcryptjs'
import crypto from 'crypto'
import { decrypt } from '@/lib/crypto'

export function generateTotpSecret(): string {
  return generateSecret()
}

export function buildOtpauthUri(email: string, secret: string): string {
  return generateURI({ issuer: 'Wipli', label: email, secret })
}

export async function verifyTotpCode(encryptedSecret: string, code: string): Promise<boolean> {
  const secret = decrypt(encryptedSecret)
  const token = code.replace(/\s+/g, '')
  if (!/^\d{6}$/.test(token)) return false
  const result = await verify({ secret, token })
  return result.valid
}

// Códigos de un solo uso, formato XXXXX-XXXXX (fácil de leer/transcribir a mano).
export function generateBackupCodes(count = 10): string[] {
  return Array.from({ length: count }, () => {
    const raw = crypto.randomBytes(5).toString('hex').toUpperCase()
    return `${raw.slice(0, 5)}-${raw.slice(5, 10)}`
  })
}

export function hashBackupCodes(codes: string[]): Promise<string[]> {
  return Promise.all(codes.map((c) => bcrypt.hash(c, 10)))
}

export function verifyBackupCode(plain: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plain.trim().toUpperCase(), hash)
}
