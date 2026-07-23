import { User, UserRole, PermissionAction } from '@/types'

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: [
    'create_company', 'edit_company', 'delete_company',
    'create_project', 'edit_project', 'delete_project',
    'create_user', 'edit_user', 'deactivate_user',
    'create_task', 'edit_task', 'delete_task',
    'upload_file', 'change_cover',
    'create_chat', 'send_message',
  ],
  member: [
    'create_project',
    'create_task', 'edit_task',
    'upload_file',
    'create_chat', 'send_message',
  ],
  viewer: [
    'send_message',
  ],
}

export function can(user: User | null | undefined, action: PermissionAction): boolean {
  if (!user) return false
  const role = (user.userRole ?? 'viewer') as UserRole
  return ROLE_PERMISSIONS[role]?.includes(action) ?? false
}

export function usePermission(user: User | null | undefined) {
  return (action: PermissionAction) => can(user, action)
}

// Editar/eliminar un proyecto: los admins pueden con cualquiera; un
// member solo con los que él mismo creó. Un miembro marcado "solo ver"
// (viewerUserIds) nunca puede editar el proyecto, ni siquiera si lo creó.
export function canManageProject(
  user: User | null | undefined,
  project: { createdById?: string | null; viewerUserIds?: string[] } | null | undefined
): boolean {
  if (!user) return false
  if (user.userRole === 'admin') return true
  if (project?.viewerUserIds?.includes(user.id)) return false
  return Boolean(project?.createdById && project.createdById === user.id)
}

// Un proyecto es "solo ver" para este usuario si está en su lista de
// miembros marcados como viewer — bloquea crear/editar cualquier cosa
// dentro del proyecto (tareas, notas, recordatorios, archivos, links).
export function isProjectViewer(
  user: User | null | undefined,
  project: { viewerUserIds?: string[] } | null | undefined
): boolean {
  if (!user) return false
  if (user.userRole === 'admin') return false
  return Boolean(project?.viewerUserIds?.includes(user.id))
}

// Editar una tarea puntual: bloqueada si el usuario está etiquetado como
// "solo ver" en esa tarea, si el proyecto de la tarea es "solo ver" para él,
// o si su rol global no permite editar tareas (ej. rol "viewer" de la empresa).
export function canEditTask(
  user: User | null | undefined,
  task: { viewerAssigneeIds?: string[] } | null | undefined,
  project?: { viewerUserIds?: string[] } | null
): boolean {
  if (!user) return false
  if (user.userRole === 'admin') return true
  if (task?.viewerAssigneeIds?.includes(user.id)) return false
  if (isProjectViewer(user, project)) return false
  return can(user, 'edit_task')
}
