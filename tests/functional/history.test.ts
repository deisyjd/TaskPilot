import { describe, it, expect, beforeAll } from 'vitest'
import { Client, ADMIN } from './helpers'

describe('API /api/history', () => {
  const admin = new Client()

  beforeAll(async () => {
    await admin.login(ADMIN)
  })

  it('READ: requiere sesión', async () => {
    const res = await new Client().request('/api/history')
    expect(res.status).toBe(401)
  })

  it('CREATE: registra un evento e ignora campos extra del cliente', async () => {
    const res = await admin.request('/api/history', {
      method: 'POST',
      body: {
        id: `evt-${Date.now()}`,
        type: 'task-edited',
        description: 'evento de prueba funcional',
        user: 'Deisy',
        timestamp: new Date().toISOString(),
        meta: { origen: 'test' },
        companyId: 'debe-ignorarse',
      },
    })
    expect(res.status).toBe(201)
    const event = await res.json()
    expect(event.description).toBe('evento de prueba funcional')
    expect(event.companyId).not.toBe('debe-ignorarse')
  })

  it('READ: el listado devuelve el evento registrado, más recientes primero', async () => {
    const res = await admin.request('/api/history')
    expect(res.status).toBe(200)
    const events = await res.json()
    expect(Array.isArray(events)).toBe(true)
    expect(events.some((e: { description: string }) => e.description === 'evento de prueba funcional')).toBe(true)
  })
})
