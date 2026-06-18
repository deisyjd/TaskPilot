'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { Plus, Search, FolderOpen, Users, CheckSquare } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useCurrentUser } from '@/store/useUserStore'
import { can } from '@/lib/permissions'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { Project } from '@/types'

const STATUS_LABELS: Record<string, string> = {
  active:   'Activo',
  inactive: 'Inactivo',
  archived: 'Archivado',
}

type Filter = 'all' | 'active' | 'inactive'

function ProjectCard({ project, taskCount }: { project: Project; taskCount: number }) {
  const memberCount = project.members?.length ?? 0

  return (
    <Link
      href={`/projects/${project.id}`}
      className="group flex flex-col overflow-hidden transition-all hover:shadow-md hover:-translate-y-0.5"
      style={{
        backgroundColor: 'var(--tp-surface)',
        borderRadius: 'var(--tp-r-card)',
        border: '1px solid var(--tp-border)',
        textDecoration: 'none',
      }}
    >
      {/* Cover / color banner */}
      <div className="relative h-28 overflow-hidden shrink-0">
        {project.coverImageUrl ? (
          <img
            src={project.coverImageUrl}
            alt={project.name}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div
            className="w-full h-full"
            style={{
              background: `linear-gradient(135deg, ${project.color}55 0%, ${project.color}22 100%)`,
              backgroundColor: `${project.color}18`,
            }}
          >
            <div
              className="absolute bottom-3 right-3 w-10 h-10 rounded-2xl flex items-center justify-center opacity-40"
              style={{ backgroundColor: project.color }}
            >
              <FolderOpen className="w-5 h-5 text-white" />
            </div>
          </div>
        )}

        {/* Status badge */}
        {project.status && project.status !== 'active' && (
          <span
            className="absolute top-2.5 left-2.5 text-[10px] font-semibold px-2 py-0.5 rounded-full"
            style={{
              backgroundColor: project.status === 'inactive' ? '#FEF2F2' : '#F3F4F6',
              color: project.status === 'inactive' ? '#DC2626' : '#6B7280',
            }}
          >
            {STATUS_LABELS[project.status] ?? project.status}
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="flex flex-col gap-3 p-4 flex-1">
        <div className="flex items-start gap-2.5">
          <div
            className="w-2.5 h-2.5 rounded-full shrink-0 mt-1.5"
            style={{ backgroundColor: project.color }}
          />
          <div className="flex-1 min-w-0">
            <h3
              className="text-sm font-semibold truncate leading-snug"
              style={{ color: 'var(--tp-text)' }}
            >
              {project.name}
            </h3>
            {project.description && (
              <p
                className="text-xs mt-1 line-clamp-2 leading-relaxed"
                style={{ color: 'var(--tp-text-2)' }}
              >
                {project.description}
              </p>
            )}
          </div>
        </div>

        {/* Stats row */}
        <div className="flex items-center gap-3 mt-auto pt-1">
          <div className="flex items-center gap-1" style={{ color: 'var(--tp-text-2)' }}>
            <CheckSquare className="w-3 h-3" />
            <span className="text-xs">{taskCount} tarea{taskCount !== 1 ? 's' : ''}</span>
          </div>
          {memberCount > 0 && (
            <div className="flex items-center gap-1" style={{ color: 'var(--tp-text-2)' }}>
              <Users className="w-3 h-3" />
              <span className="text-xs">{memberCount} miembro{memberCount !== 1 ? 's' : ''}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  )
}

export default function ProjectsPage() {
  const projects = useTaskStore((s) => s.projects)
  const tasks = useTaskStore((s) => s.tasks)
  const currentUser = useCurrentUser()
  const [filter, setFilter] = useState<Filter>('all')
  const [search, setSearch] = useState('')
  const [modalOpen, setModalOpen] = useState(false)

  const taskCountByProject = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const t of tasks) {
      if (t.status !== 'done') {
        counts[t.project] = (counts[t.project] ?? 0) + 1
      }
    }
    return counts
  }, [tasks])

  const visible = useMemo(() => {
    return projects.filter((p) => {
      if (filter === 'active' && p.status === 'inactive') return false
      if (filter === 'inactive' && p.status !== 'inactive') return false
      if (search && !p.name.toLowerCase().includes(search.toLowerCase())) return false
      return true
    })
  }, [projects, filter, search])

  const counts = useMemo(() => ({
    all: projects.length,
    active: projects.filter((p) => p.status !== 'inactive').length,
    inactive: projects.filter((p) => p.status === 'inactive').length,
  }), [projects])

  const FILTERS: { key: Filter; label: string }[] = [
    { key: 'all',      label: `Todos (${counts.all})` },
    { key: 'active',   label: `Activos (${counts.active})` },
    { key: 'inactive', label: `Inactivos (${counts.inactive})` },
  ]

  return (
    <div className="space-y-5">
      {/* Top bar */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* Search */}
        <div className="relative">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5"
            style={{ color: 'var(--tp-text-2)' }}
          />
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar proyecto..."
            className="pl-9 pr-4 text-sm outline-none"
            style={{
              height: '38px',
              borderRadius: 'var(--tp-r-input)',
              border: '1px solid var(--tp-border)',
              backgroundColor: 'var(--tp-surface)',
              color: 'var(--tp-text)',
              width: '200px',
            }}
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-1.5">
          {FILTERS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className="px-3.5 py-1.5 text-xs font-medium rounded-full transition-all"
              style={{
                backgroundColor: filter === key ? 'var(--tp-dark)' : 'var(--tp-surface)',
                color: filter === key ? '#fff' : 'var(--tp-text-2)',
                border: '1px solid var(--tp-border)',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* New project button */}
        {can(currentUser, 'create_project') && (
          <button
            onClick={() => setModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all hover:opacity-85 ml-auto"
            style={{
              backgroundColor: 'var(--tp-dark)',
              color: '#fff',
              borderRadius: 'var(--tp-r-btn)',
            }}
          >
            <Plus className="w-4 h-4" />
            Nuevo proyecto
          </button>
        )}
      </div>

      {/* Grid */}
      {visible.length === 0 ? (
        <div
          className="flex flex-col items-center justify-center py-20 gap-4"
          style={{
            backgroundColor: 'var(--tp-surface)',
            borderRadius: 'var(--tp-r-card)',
            border: '1px solid var(--tp-border)',
          }}
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{ backgroundColor: 'var(--tp-bg-2)' }}
          >
            <FolderOpen className="w-7 h-7" style={{ color: 'var(--tp-text-2)' }} />
          </div>
          <div className="text-center">
            <p className="text-sm font-medium" style={{ color: 'var(--tp-text)' }}>
              {search ? 'Sin resultados' : 'Sin proyectos'}
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--tp-text-2)' }}>
              {search
                ? `No se encontró ningún proyecto para "${search}"`
                : 'Crea tu primer proyecto con el botón de arriba'}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
          {visible.map((project) => (
            <ProjectCard
              key={project.id}
              project={project}
              taskCount={taskCountByProject[project.name] ?? 0}
            />
          ))}
        </div>
      )}

      <ProjectModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  )
}
