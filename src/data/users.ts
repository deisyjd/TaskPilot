import { User } from '@/types'

export const USERS: User[] = [
  { id: 'deisy', name: 'Deisy', role: 'Directora', initials: 'DE', color: 'bg-violet-600' },
  { id: 'diseno', name: 'Diseño', role: 'Diseñador', initials: 'DI', color: 'bg-blue-500' },
  { id: 'copy', name: 'Copy', role: 'Redactor', initials: 'CO', color: 'bg-pink-500' },
  { id: 'desarrollo', name: 'Desarrollo', role: 'Desarrollador', initials: 'DE', color: 'bg-emerald-500' },
  { id: 'cliente', name: 'Cliente', role: 'Cliente', initials: 'CL', color: 'bg-amber-500' },
  { id: 'revision', name: 'Revisión', role: 'Revisor', initials: 'RE', color: 'bg-orange-500' },
]

export const USER_NAMES = USERS.map((u) => u.name)

export function getUser(name: string): User | undefined {
  return USERS.find((u) => u.name === name)
}
