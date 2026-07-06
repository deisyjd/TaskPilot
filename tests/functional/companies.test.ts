import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client, ADMIN, uniqueName } from './helpers'

describe('API /api/companies y switch-company', () => {
  const admin = new Client()
  let originalCompanyId = ''
  let newCompanyId = ''

  beforeAll(async () => {
    const data = await admin.login(ADMIN)
    originalCompanyId = data.activeCompanyId
  })

  afterAll(async () => {
    // Restaura la empresa original como activa para no afectar otras suites
    if (originalCompanyId) {
      await admin.request('/api/auth/switch-company', {
        method: 'POST',
        body: { companyId: originalCompanyId },
      })
    }
  })

  it('CREATE: crea una empresa y la deja como activa', async () => {
    const res = await admin.request('/api/companies', {
      method: 'POST',
      body: { name: uniqueName('Empresa QA'), color: '#0ea5e9' },
    })
    expect(res.status).toBe(201)
    const data = await res.json()
    newCompanyId = data.company.id
    expect(data.activeCompanyId).toBe(newCompanyId)
    expect(data.userRole).toBe('admin')
  })

  it('CREATE: rechaza empresa sin nombre', async () => {
    const res = await admin.request('/api/companies', { method: 'POST', body: { name: '  ' } })
    expect(res.status).toBe(400)
  })

  it('aislamiento multi-tenant: la empresa nueva no ve datos de la original', async () => {
    const projects = await admin.request('/api/projects')
    expect(projects.status).toBe(200)
    expect(await projects.json()).toEqual([])

    const tasks = await admin.request('/api/tasks')
    expect(tasks.status).toBe(200)
    expect(await tasks.json()).toEqual([])
  })

  it('switch-company: vuelve a la empresa original', async () => {
    const res = await admin.request('/api/auth/switch-company', {
      method: 'POST',
      body: { companyId: originalCompanyId },
    })
    expect(res.status).toBe(200)
    expect((await res.json()).activeCompanyId).toBe(originalCompanyId)
  })

  it('switch-company: rechaza una empresa a la que no perteneces', async () => {
    const res = await admin.request('/api/auth/switch-company', {
      method: 'POST',
      body: { companyId: 'empresa-ajena' },
    })
    expect(res.status).toBe(403)
  })

  it('DELETE: solo se puede eliminar la empresa activa', async () => {
    // La activa ahora es la original, así que borrar la nueva debe fallar
    const res = await admin.request(`/api/companies/${newCompanyId}`, { method: 'DELETE' })
    expect(res.status).toBe(403)
  })

  it('DELETE: elimina la empresa activa y devuelve la siguiente', async () => {
    await admin.request('/api/auth/switch-company', {
      method: 'POST',
      body: { companyId: newCompanyId },
    })
    const res = await admin.request(`/api/companies/${newCompanyId}`, { method: 'DELETE' })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(data.activeCompanyId).toBeTruthy()
    expect(data.activeCompanyId).not.toBe(newCompanyId)
    newCompanyId = ''
  })
})
