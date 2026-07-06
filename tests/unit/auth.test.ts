import { describe, it, expect } from 'vitest'
import { signToken, verifyToken, type SessionPayload } from '@/lib/auth'

const payload: SessionPayload = {
  userId: 'user-1',
  email: 'test@wipli.app',
  userRole: 'admin',
  activeCompanyId: 'company-1',
}

describe('lib/auth', () => {
  it('firma y verifica un token (round-trip)', async () => {
    const token = await signToken(payload)
    const verified = await verifyToken(token)

    expect(verified).not.toBeNull()
    expect(verified?.userId).toBe(payload.userId)
    expect(verified?.email).toBe(payload.email)
    expect(verified?.userRole).toBe(payload.userRole)
    expect(verified?.activeCompanyId).toBe(payload.activeCompanyId)
  })

  it('rechaza un token adulterado', async () => {
    const token = await signToken(payload)
    const [header, body] = token.split('.')
    const tampered = `${header}.${body}.firma-invalida`

    expect(await verifyToken(tampered)).toBeNull()
  })

  it('rechaza un string que no es JWT', async () => {
    expect(await verifyToken('no-es-un-token')).toBeNull()
  })
})
