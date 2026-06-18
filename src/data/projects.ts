import { Project } from '@/types'

export const PROJECTS: Project[] = [
  { id: 'qenta', name: 'Qenta', color: '#6366f1' },
  { id: 'wigilabs', name: 'Wigilabs', color: '#0ea5e9' },
  { id: 'ainoa', name: 'Ainoa', color: '#f43f5e' },
  { id: 'distrito-padel', name: 'Distrito Pádel', color: '#10b981' },
  { id: 'sportspace', name: 'SportSpace', color: '#f59e0b' },
  { id: 'nuts', name: 'Nuts', color: '#8b5cf6' },
  { id: 'viteri', name: 'Viteri & Co', color: '#ec4899' },
  { id: 'planeta-tenis', name: 'Planeta Tenis', color: '#14b8a6' },
  { id: 'otros', name: 'Otros', color: '#94a3b8' },
]

// Mutable runtime cache — kept in sync by useTaskStore
let _cache: Project[] = [...PROJECTS]

export function _refreshProjectCache(projects: Project[]) {
  _cache = projects
}

export const PROJECT_NAMES = PROJECTS.map((p) => p.name)

export function getProject(name: string): Project | undefined {
  return _cache.find((p) => p.name === name)
}
