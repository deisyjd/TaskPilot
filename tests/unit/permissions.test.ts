import { describe, it, expect } from 'vitest'
import { can } from '@/lib/permissions'
import type { User } from '@/types'

function userWithRole(userRole: string): User {
  return {
    id: 'u1',
    name: 'Test',
    role: 'Tester',
    initials: 'T',
    color: 'bg-violet-500',
    userRole: userRole as User['userRole'],
  }
}

describe('lib/permissions', () => {
  it('admin puede crear, editar y eliminar proyectos y usuarios', () => {
    const admin = userWithRole('admin')
    expect(can(admin, 'create_project')).toBe(true)
    expect(can(admin, 'delete_project')).toBe(true)
    expect(can(admin, 'create_user')).toBe(true)
    expect(can(admin, 'delete_task')).toBe(true)
    expect(can(admin, 'create_company')).toBe(true)
  })

  it('member puede gestionar tareas y crear proyectos, pero no usuarios ni borrar proyectos ajenos', () => {
    const member = userWithRole('member')
    expect(can(member, 'create_task')).toBe(true)
    expect(can(member, 'edit_task')).toBe(true)
    expect(can(member, 'create_project')).toBe(true)
    expect(can(member, 'delete_project')).toBe(false)
    expect(can(member, 'create_user')).toBe(false)
    expect(can(member, 'delete_task')).toBe(false)
  })

  it('viewer solo puede enviar mensajes', () => {
    const viewer = userWithRole('viewer')
    expect(can(viewer, 'send_message')).toBe(true)
    expect(can(viewer, 'create_task')).toBe(false)
    expect(can(viewer, 'upload_file')).toBe(false)
  })

  it('sin usuario no hay permisos', () => {
    expect(can(null, 'send_message')).toBe(false)
    expect(can(undefined, 'create_task')).toBe(false)
  })

  it('rol desconocido no tiene permisos', () => {
    expect(can(userWithRole('superuser'), 'create_project')).toBe(false)
  })
})
