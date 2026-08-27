// Definición de las herramientas MCP. Cada una traduce una llamada a la API
// REST de TaskPilot (autenticada con el token del cliente vía ctx.api), así se
// reutilizan permisos, validaciones y multi-empresa que ya existen.

export interface McpContext {
  // Llama a la API REST de TaskPilot reenviando el token del cliente.
  api: (path: string, init?: RequestInit) => Promise<unknown>
}

export interface McpTool {
  name: string
  description: string
  inputSchema: Record<string, unknown>
  handler: (args: Record<string, unknown>, ctx: McpContext) => Promise<unknown>
}

const obj = (properties: Record<string, unknown>, required: string[] = []) => ({
  type: 'object',
  properties,
  required,
  additionalProperties: false,
})
const str = (description: string) => ({ type: 'string', description })
const strArr = (description: string) => ({ type: 'array', items: { type: 'string' }, description })
const linkArr = (description: string) => ({
  type: 'array',
  description,
  items: {
    type: 'object',
    properties: {
      url: { type: 'string', description: 'URL del enlace.' },
      title: { type: 'string', description: 'Título visible (opcional, por defecto el dominio).' },
      description: { type: 'string', description: 'Descripción breve (opcional).' },
    },
    required: ['url'],
    additionalProperties: false,
  },
})

interface RawLink {
  url: string
  title?: string
  description?: string
}

// Arma objetos ReferenceLink completos a partir de lo que manda el cliente MCP
// (solo url/title/description) — mismo criterio que ReferenceLinks.tsx: si la
// URL no trae esquema le antepone https://, y sin título usa el dominio.
function toReferenceLinks(rawLinks: unknown, createdBy: string): Record<string, unknown>[] {
  if (!Array.isArray(rawLinks)) return []
  return rawLinks
    .filter((l): l is RawLink => Boolean(l) && typeof l === 'object' && typeof (l as RawLink).url === 'string' && (l as RawLink).url.trim() !== '')
    .map((l, i) => {
      const trimmed = l.url.trim()
      const url = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
      let domain = url
      try {
        domain = new URL(url).hostname.replace(/^www\./, '')
      } catch {
        // URL sigue siendo inválida tras anteponer el esquema — se manda tal cual y la API la rechazará.
      }
      return {
        id: `link-${Date.now()}-${i}-${Math.random().toString(36).slice(2, 6)}`,
        url,
        title: l.title?.trim() || domain,
        description: l.description?.trim() || undefined,
        createdBy,
        createdAt: new Date().toISOString(),
      }
    })
}

// Campos de una tarea de la API tal como los devuelve el servidor.
interface TaskShape {
  id: string
  assigneeIds?: string[]
  checklist?: { text: string; done: boolean; dueDate?: string | null; dueTime?: string | null; assigneeId?: string | null }[]
  [k: string]: unknown
}

async function getTask(taskId: string, ctx: McpContext): Promise<TaskShape> {
  return (await ctx.api(`/api/tasks/${taskId}`)) as TaskShape
}

interface UserShape {
  id: string
  name: string
  email?: string
}

// Resuelve un responsable a su ID a partir de un nombre o correo. Prioriza
// coincidencia exacta de correo, luego de nombre, y por último parcial (si es
// única). Lanza un error claro si no hay coincidencia o es ambigua.
async function resolveAssignee(query: string, ctx: McpContext): Promise<string> {
  const q = query.trim().toLowerCase()
  const users = (await ctx.api('/api/users')) as UserShape[]
  const byEmail = users.find((u) => (u.email ?? '').toLowerCase() === q)
  if (byEmail) return byEmail.id
  const byName = users.find((u) => u.name.trim().toLowerCase() === q)
  if (byName) return byName.id
  const partial = users.filter((u) => u.name.toLowerCase().includes(q) || (u.email ?? '').toLowerCase().includes(q))
  if (partial.length === 1) return partial[0].id
  if (partial.length > 1) {
    throw new Error(`Varios usuarios coinciden con "${query}": ${partial.map((u) => u.name).join(', ')}. Especifica mejor o usa assigneeId.`)
  }
  throw new Error(`No encontré un usuario con nombre o correo "${query}". Usa list_users para ver los disponibles.`)
}

// Resuelve a quién etiquetar en un ítem de checklist a partir de args.assigneeId
// o args.assignee (nombre/correo). Solo se puede etiquetar a alguien que ya sea
// responsable de la tarea (misma regla que la interfaz) — si no lo es, lanza un
// error sugiriendo usar assign_task primero. Devuelve:
//  - undefined si no se pidió cambiar el responsable (deja el actual tal cual).
//  - null si se pidió quitarlo (assignee/assigneeId vacío).
//  - el ID resuelto si se pidió asignarlo.
async function resolveChecklistAssignee(args: Record<string, unknown>, task: TaskShape, ctx: McpContext): Promise<string | null | undefined> {
  const rawId = args.assigneeId
  const rawName = args.assignee
  if (rawId === undefined && rawName === undefined) return undefined
  if (rawId === '' || rawName === '') return null

  const assigneeId = typeof rawId === 'string' && rawId ? rawId : await resolveAssignee(String(rawName), ctx)
  const taskAssigneeIds = task.assigneeIds ?? []
  if (!taskAssigneeIds.includes(assigneeId)) {
    throw new Error(
      'Solo puedes etiquetar en el checklist a alguien que ya sea responsable de la tarea. Usa assign_task para agregarlo primero.'
    )
  }
  return assigneeId
}

export const TOOLS: McpTool[] = [
  {
    name: 'whoami',
    description: 'Devuelve el usuario autenticado y sus empresas (útil para conocer el contexto y los IDs).',
    inputSchema: obj({}),
    handler: (_args, ctx) => ctx.api('/api/auth/me'),
  },
  {
    name: 'list_users',
    description: 'Lista los usuarios de la empresa activa (id, nombre, correo, rol) para poder asignar/compartir tareas.',
    inputSchema: obj({}),
    handler: (_args, ctx) => ctx.api('/api/users'),
  },
  {
    name: 'list_projects',
    description: 'Lista los proyectos de la empresa activa.',
    inputSchema: obj({}),
    handler: (_args, ctx) => ctx.api('/api/projects'),
  },
  {
    name: 'create_project',
    description: 'Crea un proyecto nuevo en la empresa activa.',
    inputSchema: obj(
      {
        name: str('Nombre del proyecto.'),
        description: str('Descripción opcional.'),
        color: str('Color hex opcional, ej. #8B5CF6.'),
      },
      ['name']
    ),
    handler: (args, ctx) =>
      ctx.api('/api/projects', {
        method: 'POST',
        body: JSON.stringify({ name: args.name, description: args.description, color: args.color }),
      }),
  },
  {
    name: 'list_tasks',
    description: 'Lista tareas de la empresa activa. Filtra en el servidor por proyecto, estado y/o responsable (más eficiente). Al responsable puedes pasarlo por nombre/correo (assignee) o por ID (assigneeId); usa mine=true para ver solo las tuyas.',
    inputSchema: obj({
      projectId: str('Filtra por proyecto (opcional).'),
      status: { type: 'string', enum: ['pending', 'in-progress', 'review', 'scheduled', 'done', 'blocked'], description: 'Filtra por estado (opcional).' },
      assignee: str('Filtra por responsable — nombre o correo (opcional; alternativa a assigneeId).'),
      assigneeId: str('Filtra por responsable — ID de usuario (usa list_users), opcional.'),
      mine: { type: 'boolean', description: 'Si es true, solo tus tareas (las del usuario del token).' },
    }),
    handler: async (args, ctx) => {
      const params = new URLSearchParams()
      if (args.projectId) params.set('projectId', String(args.projectId))
      if (args.status) params.set('status', String(args.status))
      let assigneeId = args.assigneeId ? String(args.assigneeId) : ''
      if (!assigneeId && args.mine) {
        const me = (await ctx.api('/api/auth/me')) as { id: string }
        assigneeId = me.id
      }
      if (!assigneeId && args.assignee) {
        assigneeId = await resolveAssignee(String(args.assignee), ctx)
      }
      if (assigneeId) params.set('assigneeId', assigneeId)
      const qs = params.toString()
      return ctx.api('/api/tasks' + (qs ? `?${qs}` : ''))
    },
  },
  {
    name: 'get_task',
    description: 'Obtiene el detalle de una tarea (incluye checklist, comentarios y responsables).',
    inputSchema: obj({ taskId: str('ID de la tarea.') }, ['taskId']),
    handler: (args, ctx) => getTask(args.taskId as string, ctx),
  },
  {
    name: 'create_task',
    description: 'Crea una tarea en un proyecto. Requiere projectId (usa list_projects) y title.',
    inputSchema: obj(
      {
        projectId: str('ID del proyecto donde crear la tarea.'),
        title: str('Título de la tarea.'),
        description: str('Descripción opcional.'),
        status: { type: 'string', enum: ['pending', 'in-progress', 'review', 'scheduled', 'done', 'blocked'], description: 'Estado (por defecto pending).' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Prioridad (por defecto medium).' },
        startDate: str('Fecha de inicio ISO (YYYY-MM-DD), opcional.'),
        dueDate: str('Fecha límite ISO (YYYY-MM-DD), opcional.'),
        dueTime: str('Hora límite (HH:MM), opcional.'),
        assigneeIds: strArr('IDs de responsables (usa list_users), opcional.'),
        links: linkArr('Enlaces de referencia a agregar a la tarea, opcional.'),
      },
      ['projectId', 'title']
    ),
    handler: async (args, ctx) => {
      let links: Record<string, unknown>[] | undefined
      if (Array.isArray(args.links) && args.links.length > 0) {
        const me = (await ctx.api('/api/auth/me')) as { name?: string }
        links = toReferenceLinks(args.links, me.name ?? 'MCP')
      }
      return ctx.api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: args.projectId,
          title: args.title,
          description: args.description ?? '',
          status: args.status ?? 'pending',
          priority: args.priority ?? 'medium',
          type: 'other',
          // startDate es nullable en el modelo.
          startDate: (args.startDate as string) || null,
          // dueDate es String no nulo en el modelo: si no se da, usa hoy.
          dueDate: (args.dueDate as string) || new Date().toISOString().slice(0, 10),
          dueTime: (args.dueTime as string) || null,
          tags: [],
          assigneeIds: Array.isArray(args.assigneeIds) ? args.assigneeIds : [],
          links,
        }),
      })
    },
  },
  {
    name: 'update_task',
    description: 'Actualiza campos de una tarea (título, descripción, estado, prioridad, fecha de inicio, fecha límite) y/o le agrega enlaces de referencia (conserva los existentes).',
    inputSchema: obj(
      {
        taskId: str('ID de la tarea.'),
        title: str('Nuevo título (opcional).'),
        description: str('Nueva descripción (opcional).'),
        status: { type: 'string', enum: ['pending', 'in-progress', 'review', 'scheduled', 'done', 'blocked'], description: 'Nuevo estado (opcional).' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Nueva prioridad (opcional).' },
        startDate: str('Nueva fecha de inicio ISO (opcional). Usa cadena vacía para quitarla.'),
        dueDate: str('Nueva fecha límite ISO (opcional).'),
        dueTime: str('Nueva hora límite (HH:MM), opcional. Usa cadena vacía para quitarla.'),
        links: linkArr('Enlaces de referencia a agregar a la tarea (se suman a los que ya tiene), opcional.'),
      },
      ['taskId']
    ),
    handler: async (args, ctx) => {
      const patch: Record<string, unknown> = {}
      for (const k of ['title', 'description', 'status', 'priority', 'startDate', 'dueDate', 'dueTime']) {
        if (args[k] !== undefined) patch[k] = args[k]
      }
      if (Array.isArray(args.links) && args.links.length > 0) {
        const [task, me] = await Promise.all([
          getTask(args.taskId as string, ctx),
          ctx.api('/api/auth/me') as Promise<{ name?: string }>,
        ])
        const existing = Array.isArray(task.links) ? task.links : []
        patch.links = [...existing, ...toReferenceLinks(args.links, me.name ?? 'MCP')]
      }
      return ctx.api(`/api/tasks/${args.taskId as string}`, { method: 'PATCH', body: JSON.stringify(patch) })
    },
  },
  {
    name: 'complete_task',
    description: 'Marca una tarea como completada (estado done).',
    inputSchema: obj({ taskId: str('ID de la tarea.') }, ['taskId']),
    handler: (args, ctx) =>
      ctx.api(`/api/tasks/${args.taskId as string}`, { method: 'PATCH', body: JSON.stringify({ status: 'done' }) }),
  },
  {
    name: 'attach_image',
    description:
      'Adjunta una imagen a una tarea a partir de su URL pública: la descarga y la guarda como archivo adjunto, o como imagen de portada si asCover=true.',
    inputSchema: obj(
      {
        taskId: str('ID de la tarea.'),
        imageUrl: str('URL pública de la imagen a adjuntar.'),
        asCover: { type: 'boolean', description: 'true para usarla como imagen de portada de la tarea; false (por defecto) para agregarla a los archivos adjuntos.' },
        name: str('Nombre para el archivo adjunto (opcional, se toma de la URL si no se da).'),
      },
      ['taskId', 'imageUrl']
    ),
    handler: async (args, ctx) => {
      const saved = (await ctx.api('/api/uploads/from-url', {
        method: 'POST',
        body: JSON.stringify({ url: args.imageUrl, name: args.name }),
      })) as { url: string; name: string; size: number; type: string }
      if (!saved.type.startsWith('image/')) {
        throw new Error(`La URL no apunta a una imagen (tipo detectado: ${saved.type}).`)
      }
      if (args.asCover) {
        return ctx.api(`/api/tasks/${args.taskId as string}`, {
          method: 'PATCH',
          body: JSON.stringify({ coverImageUrl: saved.url }),
        })
      }
      const [task, me] = await Promise.all([
        getTask(args.taskId as string, ctx),
        ctx.api('/api/auth/me') as Promise<{ name?: string }>,
      ])
      const attachments = Array.isArray(task.attachments) ? task.attachments : []
      const attachment = {
        id: `att-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: saved.name,
        type: saved.type,
        size: saved.size,
        url: saved.url,
        uploadedBy: me.name ?? 'MCP',
        uploadedAt: new Date().toISOString(),
      }
      return ctx.api(`/api/tasks/${args.taskId as string}`, {
        method: 'PATCH',
        body: JSON.stringify({ attachments: [...attachments, attachment] }),
      })
    },
  },
  {
    name: 'add_comment',
    description: 'Agrega un comentario a una tarea.',
    inputSchema: obj({ taskId: str('ID de la tarea.'), text: str('Texto del comentario.') }, ['taskId', 'text']),
    handler: (args, ctx) =>
      ctx.api(`/api/tasks/${args.taskId as string}`, {
        method: 'PATCH',
        body: JSON.stringify({ comments: [{ text: args.text }] }),
      }),
  },
  {
    name: 'add_checklist_item',
    description:
      'Agrega un ítem al checklist de una tarea (conserva los existentes). Se le puede asignar un responsable, que debe ser alguien ya responsable de la tarea (usa assign_task si aún no lo es).',
    inputSchema: obj(
      {
        taskId: str('ID de la tarea.'),
        text: str('Texto del ítem.'),
        dueDate: str('Fecha límite del ítem (YYYY-MM-DD), opcional.'),
        dueTime: str('Hora límite del ítem (HH:MM), opcional.'),
        assignee: str('Responsable del ítem por nombre o correo (debe ser responsable de la tarea), opcional.'),
        assigneeId: str('Responsable del ítem por ID (usa list_users), opcional — alternativa a assignee.'),
      },
      ['taskId', 'text']
    ),
    handler: async (args, ctx) => {
      const task = await getTask(args.taskId as string, ctx)
      const assigneeId = (await resolveChecklistAssignee(args, task, ctx)) ?? null
      const existing = (task.checklist ?? []).map((c) => ({ text: c.text, done: c.done, dueDate: c.dueDate ?? null, dueTime: c.dueTime ?? null, assigneeId: c.assigneeId ?? null }))
      const checklist = [...existing, { text: args.text as string, done: false, dueDate: (args.dueDate as string) || null, dueTime: (args.dueTime as string) || null, assigneeId }]
      return ctx.api(`/api/tasks/${args.taskId as string}`, { method: 'PATCH', body: JSON.stringify({ checklist }) })
    },
  },
  {
    name: 'assign_task',
    description: 'Define los responsables de una tarea (comparte la tarea con esas personas). Reemplaza la lista actual.',
    inputSchema: obj({ taskId: str('ID de la tarea.'), assigneeIds: strArr('IDs de los responsables (usa list_users).') }, ['taskId', 'assigneeIds']),
    handler: (args, ctx) =>
      ctx.api(`/api/tasks/${args.taskId as string}`, {
        method: 'PATCH',
        body: JSON.stringify({ assigneeIds: Array.isArray(args.assigneeIds) ? args.assigneeIds : [] }),
      }),
  },
  {
    name: 'set_checklist_item',
    description:
      'Marca o desmarca un ítem del checklist de una tarea y/o le cambia la fecha límite o el responsable, identificándolo por su texto. El responsable debe ser alguien ya responsable de la tarea (usa assign_task si aún no lo es).',
    inputSchema: obj(
      {
        taskId: str('ID de la tarea.'),
        text: str('Texto del ítem del checklist a modificar.'),
        done: { type: 'boolean', description: 'true para marcar como hecho (por defecto), false para desmarcar.' },
        dueDate: str('Nueva fecha límite del ítem (YYYY-MM-DD). Usa cadena vacía para quitarla. Opcional.'),
        dueTime: str('Nueva hora límite del ítem (HH:MM). Usa cadena vacía para quitarla. Opcional.'),
        assignee: str('Nuevo responsable del ítem por nombre o correo. Usa cadena vacía para quitarlo. Opcional.'),
        assigneeId: str('Nuevo responsable del ítem por ID (usa list_users), opcional — alternativa a assignee.'),
      },
      ['taskId', 'text']
    ),
    handler: async (args, ctx) => {
      const task = await getTask(args.taskId as string, ctx)
      const items = task.checklist ?? []
      const target = (args.text as string).trim().toLowerCase()
      const idx = items.findIndex((c) => c.text.trim().toLowerCase() === target)
      if (idx < 0) throw new Error(`No se encontró un ítem de checklist con el texto "${args.text}".`)
      const done = args.done === undefined ? true : Boolean(args.done)
      const newAssigneeId = await resolveChecklistAssignee(args, task, ctx)
      const checklist = items.map((c, i) => ({
        text: c.text,
        done: i === idx ? done : c.done,
        dueDate: i === idx && args.dueDate !== undefined ? (args.dueDate as string) || null : c.dueDate ?? null,
        dueTime: i === idx && args.dueTime !== undefined ? (args.dueTime as string) || null : c.dueTime ?? null,
        assigneeId: i === idx && newAssigneeId !== undefined ? newAssigneeId : c.assigneeId ?? null,
      }))
      return ctx.api(`/api/tasks/${args.taskId as string}`, { method: 'PATCH', body: JSON.stringify({ checklist }) })
    },
  },
  {
    name: 'list_notes',
    description: 'Lista las notas de un proyecto.',
    inputSchema: obj({ projectId: str('ID del proyecto.') }, ['projectId']),
    handler: async (args, ctx) => {
      const projects = (await ctx.api('/api/projects')) as { id: string; notes?: unknown[] }[]
      const proj = projects.find((p) => p.id === args.projectId)
      if (!proj) throw new Error('Proyecto no encontrado.')
      return proj.notes ?? []
    },
  },
  {
    name: 'create_note',
    description: 'Crea una nota en un proyecto.',
    inputSchema: obj(
      {
        projectId: str('ID del proyecto.'),
        title: str('Título de la nota.'),
        content: str('Contenido de la nota (texto).'),
      },
      ['projectId']
    ),
    handler: (args, ctx) =>
      ctx.api('/api/notes', {
        method: 'POST',
        body: JSON.stringify({ projectId: args.projectId, title: args.title ?? '', content: args.content ?? '' }),
      }),
  },
  {
    name: 'list_reminders',
    description: 'Lista los recordatorios de la empresa activa, con filtro opcional por proyecto.',
    inputSchema: obj({ projectId: str('Filtra por proyecto (opcional).') }),
    handler: async (args, ctx) => {
      const reminders = (await ctx.api('/api/reminders')) as Record<string, unknown>[]
      return args.projectId ? reminders.filter((r) => r.projectId === args.projectId) : reminders
    },
  },
  {
    name: 'create_reminder',
    description: 'Crea un recordatorio en un proyecto. Requiere projectId, title y dueDate.',
    inputSchema: obj(
      {
        projectId: str('ID del proyecto.'),
        title: str('Título del recordatorio.'),
        dueDate: str('Fecha ISO (YYYY-MM-DD).'),
        dueTime: str('Hora HH:MM (opcional).'),
        assigneeId: str('ID del responsable (usa list_users), opcional.'),
      },
      ['projectId', 'title', 'dueDate']
    ),
    handler: (args, ctx) =>
      ctx.api('/api/reminders', {
        method: 'POST',
        body: JSON.stringify({
          projectId: args.projectId,
          title: args.title,
          dueDate: args.dueDate,
          dueTime: args.dueTime ?? null,
          assigneeId: args.assigneeId ?? null,
        }),
      }),
  },
  {
    name: 'complete_reminder',
    description: 'Marca un recordatorio como completado.',
    inputSchema: obj({ reminderId: str('ID del recordatorio.') }, ['reminderId']),
    handler: (args, ctx) =>
      ctx.api(`/api/reminders/${args.reminderId as string}`, { method: 'PATCH', body: JSON.stringify({ done: true }) }),
  },
]
