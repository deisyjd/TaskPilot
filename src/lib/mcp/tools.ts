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

// Campos de una tarea de la API tal como los devuelve el servidor.
interface TaskShape {
  id: string
  checklist?: { text: string; done: boolean; assigneeId?: string | null }[]
  [k: string]: unknown
}

async function getTask(taskId: string, ctx: McpContext): Promise<TaskShape> {
  return (await ctx.api(`/api/tasks/${taskId}`)) as TaskShape
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
    description: 'Lista tareas de la empresa activa, con filtros opcionales por proyecto y estado.',
    inputSchema: obj({
      projectId: str('Filtra por proyecto (opcional).'),
      status: { type: 'string', enum: ['pending', 'in-progress', 'review', 'scheduled', 'done', 'blocked'], description: 'Filtra por estado (opcional).' },
    }),
    handler: async (args, ctx) => {
      const tasks = (await ctx.api('/api/tasks')) as Record<string, unknown>[]
      return tasks.filter(
        (t) =>
          (!args.projectId || t.projectId === args.projectId) &&
          (!args.status || t.status === args.status)
      )
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
        dueDate: str('Fecha límite ISO (YYYY-MM-DD), opcional.'),
        assigneeIds: strArr('IDs de responsables (usa list_users), opcional.'),
      },
      ['projectId', 'title']
    ),
    handler: (args, ctx) =>
      ctx.api('/api/tasks', {
        method: 'POST',
        body: JSON.stringify({
          projectId: args.projectId,
          title: args.title,
          description: args.description ?? '',
          status: args.status ?? 'pending',
          priority: args.priority ?? 'medium',
          type: 'other',
          // dueDate es String no nulo en el modelo: si no se da, usa hoy.
          dueDate: (args.dueDate as string) || new Date().toISOString().slice(0, 10),
          tags: [],
          assigneeIds: Array.isArray(args.assigneeIds) ? args.assigneeIds : [],
        }),
      }),
  },
  {
    name: 'update_task',
    description: 'Actualiza campos de una tarea (título, descripción, estado, prioridad, fecha límite).',
    inputSchema: obj(
      {
        taskId: str('ID de la tarea.'),
        title: str('Nuevo título (opcional).'),
        description: str('Nueva descripción (opcional).'),
        status: { type: 'string', enum: ['pending', 'in-progress', 'review', 'scheduled', 'done', 'blocked'], description: 'Nuevo estado (opcional).' },
        priority: { type: 'string', enum: ['low', 'medium', 'high', 'urgent'], description: 'Nueva prioridad (opcional).' },
        dueDate: str('Nueva fecha límite ISO (opcional).'),
      },
      ['taskId']
    ),
    handler: (args, ctx) => {
      const patch: Record<string, unknown> = {}
      for (const k of ['title', 'description', 'status', 'priority', 'dueDate']) {
        if (args[k] !== undefined) patch[k] = args[k]
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
    description: 'Agrega un ítem al checklist de una tarea (conserva los existentes).',
    inputSchema: obj({ taskId: str('ID de la tarea.'), text: str('Texto del ítem.') }, ['taskId', 'text']),
    handler: async (args, ctx) => {
      const task = await getTask(args.taskId as string, ctx)
      const existing = (task.checklist ?? []).map((c) => ({ text: c.text, done: c.done, assigneeId: c.assigneeId ?? null }))
      const checklist = [...existing, { text: args.text as string, done: false, assigneeId: null }]
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
]
