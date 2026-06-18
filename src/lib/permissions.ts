import { User, UserRole, PermissionAction } from '@/types'

const ROLE_PERMISSIONS: Record<UserRole, PermissionAction[]> = {
  admin: [
    'create_project', 'edit_project', 'delete_project',
    'create_user', 'edit_user', 'deactivate_user',
    'create_task', 'edit_task', 'delete_task',
    'upload_file', 'change_cover',
    'create_chat', 'send_message',
  ],
  member: [
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
