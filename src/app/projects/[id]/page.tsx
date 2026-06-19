'use client'

import { use, useState } from 'react'
import Link from 'next/link'
import { ArrowLeft, FolderOpen, LayoutDashboard, StickyNote } from 'lucide-react'
import { useTaskStore } from '@/store/useTaskStore'
import { useCurrentUser } from '@/store/useUserStore'
import { can } from '@/lib/permissions'
import { ProjectDetail } from '@/components/projects/ProjectDetail'
import { ProjectModal } from '@/components/projects/ProjectModal'
import { NotesPanel } from '@/components/projects/NotesPanel'

type Tab = 'overview' | 'notes'

export default function ProjectPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = use(params)
  const projects = useTaskStore((s) => s.projects)
  const project = projects.find((p) => p.id === id)
  const [editOpen, setEditOpen] = useState(false)
  const [activeTab, setActiveTab] = useState<Tab>('overview')
  const currentUser = useCurrentUser()

  // ─── Not found ────────────────────────────────────────────
  if (!project) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-6">
        <div
          className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: 'var(--tp-surface)', border: '1px solid var(--tp-border)' }}
        >
          <FolderOpen className="w-8 h-8" style={{ color: 'var(--tp-text-2)' }} />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold mb-1" style={{ color: 'var(--tp-text)' }}>
            Proyecto no encontrado
          </h1>
          <p className="text-sm" style={{ color: 'var(--tp-text-2)' }}>
            El proyecto con ID <code className="font-mono text-xs">{id}</code> no existe o fue eliminado.
          </p>
        </div>
        <Link
          href="/projects"
          className="flex items-center gap-2 px-5 py-2.5 text-sm font-medium transition-all hover:opacity-80"
          style={{
            backgroundColor: 'var(--tp-dark)',
            color: '#FFFFFF',
            borderRadius: 'var(--tp-r-btn)',
            textDecoration: 'none',
          }}
        >
          <ArrowLeft className="w-4 h-4" />
          Volver al tablero
        </Link>
      </div>
    )
  }

  const TABS: { key: Tab; label: string; icon: React.ReactNode }[] = [
    { key: 'overview', label: 'Resumen',  icon: <LayoutDashboard className="w-4 h-4" /> },
    { key: 'notes',    label: 'Notas',    icon: <StickyNote className="w-4 h-4" /> },
  ]

  const noteCount = project.notes?.length ?? 0

  // ─── Found ────────────────────────────────────────────────
  return (
    <div className="flex flex-col gap-5">
      {/* Back navigation */}
      <div className="flex items-center gap-3">
        <Link
          href="/projects"
          className="flex items-center gap-2 text-sm font-medium transition-all hover:opacity-70"
          style={{ color: 'var(--tp-text-2)', textDecoration: 'none' }}
        >
          <ArrowLeft className="w-4 h-4" />
          Proyectos
        </Link>
        <span style={{ color: 'var(--tp-border)' }}>/</span>
        <span className="text-sm font-medium" style={{ color: 'var(--tp-text)' }}>
          {project.name}
        </span>
      </div>

      {/* Tabs */}
      <div
        className="flex items-center gap-1 p-1"
        style={{
          backgroundColor: 'var(--tp-surface)',
          borderRadius: 'var(--tp-r-card)',
          border: '1px solid var(--tp-border)',
          width: 'fit-content',
        }}
      >
        {TABS.map(({ key, label, icon }) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className="flex items-center gap-2 px-4 py-2 text-sm font-medium transition-all rounded-xl"
            style={{
              backgroundColor: activeTab === key ? project.color : 'transparent',
              color: activeTab === key ? '#FFFFFF' : 'var(--tp-text-2)',
            }}
          >
            {icon}
            {label}
            {key === 'notes' && noteCount > 0 && (
              <span
                className="ml-0.5 text-xs font-semibold px-1.5 py-0.5 rounded-full"
                style={{
                  backgroundColor: activeTab === 'notes' ? 'rgba(255,255,255,0.25)' : `${project.color}22`,
                  color: activeTab === 'notes' ? '#FFFFFF' : project.color,
                  lineHeight: 1,
                }}
              >
                {noteCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Tab content */}
      {activeTab === 'overview' && (
        <ProjectDetail project={project} onEdit={() => setEditOpen(true)} />
      )}
      {activeTab === 'notes' && (
        <div
          className="p-5"
          style={{
            backgroundColor: 'var(--tp-surface)',
            borderRadius: 'var(--tp-r-card)',
            border: '1px solid var(--tp-border)',
          }}
        >
          <NotesPanel project={project} />
        </div>
      )}

      {/* Edit modal — only rendered when user has permission */}
      {can(currentUser, 'edit_project') && (
        <ProjectModal
          open={editOpen}
          project={project}
          onClose={() => setEditOpen(false)}
        />
      )}
    </div>
  )
}
