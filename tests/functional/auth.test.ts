import { describe, it, expect } from 'vitest'
import { Client, ADMIN } from './helpers'

describe('API /api/auth', () => {
  it('rechaza login sin campos', async () => {
    const res = await new Client().request('/api/auth/login', { method: 'POST', body: {} })
    expect(res.status).toBe(400)
  })

  it('rechaza contraseña incorrecta', async () => {
    const res = await new Client().request('/api/auth/login', {
      method: 'POST',
      body: { email: ADMIN.email, password: 'incorrecta' },
    })
    expect(res.status).toBe(401)
  })

  it('rechaza email inexistente', async () => {
    const res = await new Client().request('/api/auth/login', {
      method: 'POST',
      body: { email: 'nadie@wipli.app', password: 'lo-que-sea' },
    })
    expect(res.status).toBe(401)
  })

  it('login correcto devuelve usuario, empresas y cookie de sesión', async () => {
    const client = new Client()
    const data = await client.login(ADMIN)

    expect(data.user.email).toBe(ADMIN.email)
    expect(data.activeCompanyId).toBeTruthy()
    expect(Array.isArray(data.companies)).toBe(true)
    expect(data.companies.length).toBeGreaterThan(0)

    const me = await client.request('/api/auth/me')
    expect(me.status).toBe(200)
    const meData = await me.json()
    expect(meData.email).toBe(ADMIN.email)
  })

  it('/api/auth/me sin sesión devuelve 401', async () => {
    const res = await new Client().request('/api/auth/me')
    expect(res.status).toBe(401)
  })

  it('logout invalida la sesión', async () => {
    const client = new Client()
    await client.login(ADMIN)
    const out = await client.request('/api/auth/logout', { method: 'POST' })
    expect(out.status).toBe(200)

    const me = await client.request('/api/auth/me')
    expect(me.status).toBe(401)
  })
})
