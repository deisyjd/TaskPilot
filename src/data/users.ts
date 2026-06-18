import { User } from '@/types'

export const USERS: User[] = [
  {
    id: 'deisy',
    name: 'Deisy',
    role: 'Directora',
    initials: 'D',
    color: 'bg-violet-500',
    email: 'deisy@wipli.app',
    userRole: 'admin',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'diseno',
    name: 'Diseño',
    role: 'Diseñador',
    initials: 'Di',
    color: 'bg-pink-500',
    email: 'diseno@wipli.app',
    userRole: 'member',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'copy',
    name: 'Copy',
    role: 'Redactora',
    initials: 'Co',
    color: 'bg-amber-500',
    email: 'copy@wipli.app',
    userRole: 'member',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'desarrollo',
    name: 'Desarrollo',
    role: 'Desarrollador',
    initials: 'De',
    color: 'bg-blue-500',
    email: 'dev@wipli.app',
    userRole: 'member',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'cliente',
    name: 'Cliente',
    role: 'Cliente externo',
    initials: 'Cl',
    color: 'bg-green-500',
    email: 'cliente@wipli.app',
    userRole: 'viewer',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'revision',
    name: 'Revisión',
    role: 'Revisora',
    initials: 'Re',
    color: 'bg-teal-500',
    email: 'revision@wipli.app',
    userRole: 'member',
    status: 'active',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

export const USER_NAMES = USERS.map((u) => u.name)

export function getUser(name: string): User | undefined {
  return USERS.find((u) => u.name === name)
}
