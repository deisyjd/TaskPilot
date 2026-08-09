import crypto from 'crypto'

const ALGORITHM = 'aes-256-gcm'

function getKey(): Buffer {
  const hex = process.env.ENCRYPTION_KEY
  if (!hex) {
    throw new Error('ENCRYPTION_KEY no está configurada — no se puede cifrar/descifrar de forma segura')
  }
  const key = Buffer.from(hex, 'hex')
  if (key.length !== 32) {
    throw new Error('ENCRYPTION_KEY debe ser una cadena hex de 32 bytes (64 caracteres)')
  }
  return key
}

// Formato de salida: iv:authTag:ciphertext, todo en hex — autocontenido,
// no requiere guardar nada más aparte del texto cifrado.
export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv = crypto.randomBytes(12)
  const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${ciphertext.toString('hex')}`
}

export function decrypt(payload: string): string {
  const key = getKey()
  const [ivHex, authTagHex, ciphertextHex] = payload.split(':')
  if (!ivHex || !authTagHex || !ciphertextHex) {
    throw new Error('Formato cifrado inválido')
  }
  const decipher = crypto.createDecipheriv(ALGORITHM, key, Buffer.from(ivHex, 'hex'))
  decipher.setAuthTag(Buffer.from(authTagHex, 'hex'))
  const plaintext = Buffer.concat([decipher.update(Buffer.from(ciphertextHex, 'hex')), decipher.final()])
  return plaintext.toString('utf8')
}
