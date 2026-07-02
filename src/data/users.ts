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
    password: 'wipli2024',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'diego',
    name: 'Diego',
    role: 'Diseñador',
    initials: 'Di',
    color: 'bg-blue-500',
    email: 'diego@wipli.app',
    userRole: 'member',
    status: 'active',
    password: 'wipli2024',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'karol',
    name: 'Karol',
    role: 'Redactora',
    initials: 'K',
    color: 'bg-pink-500',
    email: 'karol@wipli.app',
    userRole: 'member',
    status: 'active',
    password: 'wipli2024',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
  {
    id: 'julian',
    name: 'Julian',
    role: 'Desarrollador',
    initials: 'J',
    color: 'bg-emerald-500',
    email: 'julian@wipli.app',
    userRole: 'member',
    status: 'active',
    password: 'wipli2024',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-01-01T00:00:00Z',
  },
]

export const USER_NAMES = USERS.map((u) => u.name)

export function getUser(name: string): User | undefined {
  return USERS.find((u) => u.name === name)
}
