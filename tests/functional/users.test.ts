import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client, ADMIN, MEMBER, uniqueName } from './helpers'

describe('API /api/users (CRUD)', () => {
  const admin = new Client()
  const email = `${uniqueName('qa')}@test.local`
  let userId = ''

  beforeAll(async () => {
    await admin.login(ADMIN)
  })

  afterAll(async () => {
    if (userId) await admin.request(`/api/users/${userId}`, { method: 'DELETE' })
  })

  it('CREATE: un admin crea un usuario nuevo', async () => {
    const res = await admin.request('/api/users', {
      method: 'POST',
      body: {
        name: 'Usuario QA',
        email,
        password: 'clave-segura-qa',
        role: 'Tester',
        userRole: 'member',
        initials: 'QA',
        color: 'bg-blue-500',
      },
    })
    expect(res.status).toBe(201)
    const user = await res.json()
    userId = user.id
    expect(user.email).toBe(email)
    expect(user.userRole).toBe('member')
    expect(user.password).toBeUndefined()
  })

  it('CREATE: rechaza duplicado en la misma empresa', async () => {
    const res = await admin.request('/api/users', {
      method: 'POST',
      body: { name: 'Usuario QA', email, password: 'x', userRole: 'member' },
    })
    expect(res.status).toBe(409)
  })

  it('CREATE: un member no puede crear usuarios', async () => {
    const member = new Client()
    await member.login(MEMBER)
    const res = await member.request('/api/users', {
      method: 'POST',
      body: { name: 'X', email: 'x@test.local', password: 'x' },
    })
    expect(res.status).toBe(403)
  })

  it('READ: el listado incluye al usuario creado', async () => {
    const res = await admin.request('/api/users')
    expect(res.status).toBe(200)
    const users = await res.json()
    expect(users.some((u: { id: string }) => u.id === userId)).toBe(true)
  })

  it('UPDATE: edita al usuario e ignora campos extra del cliente', async () => {
    const res = await admin.request(`/api/users/${userId}`, {
      method: 'PATCH',
      body: { role: 'QA Senior', workload: 5, compliance: 0.9, updatedAt: '' },
    })
    expect(res.status).toBe(200)
    expect((await res.json()).role).toBe('QA Senior')
  })

  it('UPDATE: el nuevo usuario puede iniciar sesión, y tras cambiar la contraseña la anterior deja de servir', async () => {
    const fresh = new Client()
    await fresh.login({ email, password: 'clave-segura-qa' })

    const res = await admin.request(`/api/users/${userId}`, {
      method: 'PATCH',
      body: { password: 'clave-nueva-qa' },
    })
    expect(res.status).toBe(200)

    const oldPass = await new Client().request('/api/auth/login', {
      method: 'POST',
      body: { email, password: 'clave-segura-qa' },
    })
    expect(oldPass.status).toBe(401)

    await new Client().login({ email, password: 'clave-nueva-qa' })
  })

  it('DELETE: elimina la membresía y luego devuelve 404', async () => {
    const res = await admin.request(`/api/users/${userId}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    const again = await admin.request(`/api/users/${userId}`, { method: 'DELETE' })
    expect(again.status).toBe(404)
    userId = ''
  })
})
