import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client, ADMIN, MEMBER, uniqueName } from './helpers'

describe('API /api/projects (CRUD)', () => {
  const admin = new Client()
  const name = uniqueName('proyecto-test')
  let projectId = ''

  beforeAll(async () => {
    await admin.login(ADMIN)
  })

  afterAll(async () => {
    if (projectId) await admin.request(`/api/projects/${projectId}`, { method: 'DELETE' })
  })

  it('CREATE: acepta el payload del cliente aunque traiga campos extra (regresión 500)', async () => {
    // Payload real del frontend: members, createdBy y updatedAt no son columnas
    const res = await admin.request('/api/projects', {
      method: 'POST',
      body: {
        id: `test-${Date.now()}`,
        name,
        color: '#DFFF5F',
        description: 'creado por prueba funcional',
        status: 'active',
        createdAt: new Date().toISOString(),
        createdBy: 'Deisy',
        members: ['Julian'],
        updatedAt: '',
      },
    })
    expect(res.status).toBe(201)
    const project = await res.json()
    projectId = project.id
    expect(project.name).toBe(name)
    expect(project.companyId).toBeTruthy()
  })

  it('CREATE: rechaza proyecto sin nombre', async () => {
    const res = await admin.request('/api/projects', { method: 'POST', body: { color: '#fff' } })
    expect(res.status).toBe(400)
  })

  it('CREATE: rechaza nombre duplicado en la misma empresa', async () => {
    const res = await admin.request('/api/projects', { method: 'POST', body: { name } })
    expect(res.status).toBe(409)
  })

  it('CREATE: un member no puede crear proyectos', async () => {
    const member = new Client()
    await member.login(MEMBER)
    const res = await member.request('/api/projects', {
      method: 'POST',
      body: { name: uniqueName('no-debe-existir') },
    })
    expect(res.status).toBe(403)
  })

  it('READ: el listado incluye el proyecto creado', async () => {
    const res = await admin.request('/api/projects')
    expect(res.status).toBe(200)
    const projects = await res.json()
    expect(projects.some((p: { id: string }) => p.id === projectId)).toBe(true)
  })

  it('UPDATE: actualiza e ignora campos extra del cliente', async () => {
    const res = await admin.request(`/api/projects/${projectId}`, {
      method: 'PATCH',
      body: { description: 'editado', members: ['Deisy'], createdBy: 'x', updatedAt: '' },
    })
    expect(res.status).toBe(200)
    const project = await res.json()
    expect(project.description).toBe('editado')
  })

  it('UPDATE: 404 para proyecto inexistente', async () => {
    const res = await admin.request('/api/projects/no-existe', {
      method: 'PATCH',
      body: { name: 'x' },
    })
    expect(res.status).toBe(404)
  })

  it('DELETE: elimina el proyecto y luego devuelve 404', async () => {
    const res = await admin.request(`/api/projects/${projectId}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    const again = await admin.request(`/api/projects/${projectId}`, { method: 'DELETE' })
    expect(again.status).toBe(404)
    projectId = ''
  })
})
