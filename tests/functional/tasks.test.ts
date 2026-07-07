import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { Client, ADMIN, uniqueName } from './helpers'

describe('API /api/tasks (CRUD)', () => {
  const admin = new Client()
  let projectId = ''
  let taskId = ''

  beforeAll(async () => {
    await admin.login(ADMIN)
    const res = await admin.request('/api/projects', {
      method: 'POST',
      body: { name: uniqueName('proyecto-tareas') },
    })
    expect(res.status).toBe(201)
    projectId = (await res.json()).id
  })

  afterAll(async () => {
    // Borra el proyecto fixture; las tareas caen en cascada
    if (projectId) await admin.request(`/api/projects/${projectId}`, { method: 'DELETE' })
  })

  it('CREATE: acepta el payload del cliente aunque traiga campos extra (regresión 500)', async () => {
    // coverImageUrl/attachments/links no son columnas de la tabla tasks
    const res = await admin.request('/api/tasks', {
      method: 'POST',
      body: {
        id: `t-${Date.now()}`,
        projectId,
        title: 'tarea de prueba',
        description: 'creada por prueba funcional',
        status: 'pending',
        assigneeIds: ['julian'],
        dueDate: '2026-12-31',
        priority: 'medium',
        type: 'other',
        tags: ['qa', 'funcional'],
        checklist: [{ id: 'c1', text: 'paso 1', done: false }],
        comments: [],
        coverImageUrl: 'data:image/png;base64,xx',
        attachments: [{ id: 'a1', name: 'x.png' }],
        links: [],
        createdAt: new Date().toISOString(),
        updatedAt: '',
      },
    })
    expect(res.status).toBe(201)
    const task = await res.json()
    taskId = task.id
    expect(task.title).toBe('tarea de prueba')
    expect(task.tags).toEqual(['qa', 'funcional'])
    expect(task.checklist).toHaveLength(1)
    expect(task.assigneeIds).toEqual(['julian'])
  })

  it('CREATE: rechaza tarea sin projectId', async () => {
    const res = await admin.request('/api/tasks', { method: 'POST', body: { title: 'sin proyecto' } })
    expect(res.status).toBe(400)
  })

  it('CREATE: rechaza projectId de otra empresa o inexistente', async () => {
    const res = await admin.request('/api/tasks', {
      method: 'POST',
      body: { projectId: 'no-existe', title: 'x', assigneeIds: ['julian'], dueDate: '2026-12-31' },
    })
    expect(res.status).toBe(400)
  })

  it('UPDATE: reemplaza los responsables y registra el cambio en el historial', async () => {
    const res = await admin.request(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { assigneeIds: [] },
    })
    expect(res.status).toBe(200)
    expect((await res.json()).assigneeIds).toEqual([])

    const events = await (await admin.request('/api/history')).json()
    expect(
      events.some((e: { taskId?: string; type: string }) => e.taskId === taskId && e.type === 'assignee-changed')
    ).toBe(true)
  })

  it('READ: el listado incluye la tarea y GET por id la devuelve', async () => {
    const list = await admin.request('/api/tasks')
    expect(list.status).toBe(200)
    const tasks = await list.json()
    expect(tasks.some((t: { id: string }) => t.id === taskId)).toBe(true)

    const one = await admin.request(`/api/tasks/${taskId}`)
    expect(one.status).toBe(200)
    expect((await one.json()).id).toBe(taskId)
  })

  it('UPDATE: cambia el estado e ignora campos extra del cliente', async () => {
    const res = await admin.request(`/api/tasks/${taskId}`, {
      method: 'PATCH',
      body: { status: 'done', attachments: [{ id: 'a1' }], coverImageUrl: 'x', updatedAt: '' },
    })
    expect(res.status).toBe(200)
    expect((await res.json()).status).toBe('done')
  })

  it('UPDATE: el cambio de estado queda registrado en el historial', async () => {
    const res = await admin.request('/api/history')
    expect(res.status).toBe(200)
    const events = await res.json()
    expect(
      events.some((e: { taskId?: string; type: string }) => e.taskId === taskId && e.type === 'task-completed')
    ).toBe(true)
  })

  it('DELETE: elimina la tarea y luego devuelve 404', async () => {
    const res = await admin.request(`/api/tasks/${taskId}`, { method: 'DELETE' })
    expect(res.status).toBe(200)

    const gone = await admin.request(`/api/tasks/${taskId}`)
    expect(gone.status).toBe(404)
    taskId = ''
  })
})
