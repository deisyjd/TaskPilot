import { Priority, TaskStatus } from '@/types'

const PRIORITY_BADGES: Record<Priority, { bg: string; text: string; label: string }> = {
  low: { bg: '#DCFCE7', text: '#16A34A', label: 'Baja' },
  medium: { bg: '#FEF9C3', text: '#CA8A04', label: 'Media' },
  high: { bg: '#FFEDD5', text: '#EA580C', label: 'Alta' },
  urgent: { bg: '#FEE2E2', text: '#DC2626', label: 'Urgente' },
}

const STATUS_DOTS: Record<TaskStatus, string> = {
  pending: '#9CA3AF',
  'in-progress': '#3B82F6',
  review: '#F59E0B',
  scheduled: '#8B5CF6',
  done: '#22C55E',
  blocked: '#EF4444',
}

export interface DigestTaskRow {
  title: string
  projectName: string
  projectColor: string
  meta: string
  status: TaskStatus
  priority: Priority
  overdue: boolean
}

export interface DigestProjectRow {
  name: string
  color: string
  pendingCount: number
}

export interface DailyDigestData {
  recipientName: string
  dateLabel: string
  appUrl: string
  metrics: {
    active: number
    overdue: number
    today: number
    publications: number
  }
  tasks: DigestTaskRow[]
  weekly: {
    completed: number
    total: number
    percent: number
  }
  upcomingPublications: number
  pendingReviews: number
  projects: DigestProjectRow[]
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function taskRowHtml(task: DigestTaskRow): string {
  const badge = task.overdue ? { bg: '#FFE0E1', text: '#E23B3B', label: 'Vencida' } : PRIORITY_BADGES[task.priority]
  const dot = STATUS_DOTS[task.status]
  return `
    <div class="task">
      <span class="dot" style="background:${dot}"></span>
      <div>
        <p class="task-title">${escapeHtml(task.title)}</p>
        <p class="task-meta">${escapeHtml(task.projectName)} · ${escapeHtml(task.meta)}</p>
      </div>
      <span class="badge" style="background:${badge.bg};color:${badge.text}">${badge.label}</span>
    </div>`
}

function projectRowHtml(project: DigestProjectRow): string {
  return `
    <div class="project">
      <span class="project-name"><i class="dot" style="background:${project.color};margin:0"></i> ${escapeHtml(project.name)}</span>
      <span class="count">${project.pendingCount}</span>
    </div>`
}

function emptyStateHtml(): string {
  return `
    <div style="padding:32px 24px;text-align:center;color:#6B7280;font-size:14px;">
      🎉 No tienes tareas pendientes por ahora. ¡Buen trabajo!
    </div>`
}

export function renderDailyDigestEmail(data: DailyDigestData): string {
  const hasTasks = data.tasks.length > 0

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Wipli · Resumen diario</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;background:#E9EEE6;color:#11161C;font-family:Poppins, Inter, Arial, sans-serif;padding:36px 16px;}
    .email-shell{width:760px;margin:0 auto;background:#F4F7F2;border-radius:38px;overflow:hidden;box-shadow:0 30px 90px rgba(17,22,28,.13);border:1px solid rgba(17,22,28,.06);}
    .topbar{background:#11161C;padding:28px 30px;color:#fff;display:flex;justify-content:space-between;align-items:center;}
    .brand{display:flex;gap:13px;align-items:center}
    .mark{width:44px;height:44px;border-radius:999px;background:#DFFF45;display:flex;align-items:center;justify-content:center;color:#11161C;font-weight:900;font-size:24px;letter-spacing:-.08em;}
    .brand-name{font-size:25px;font-weight:750;letter-spacing:-.03em;line-height:1}
    .brand-name span{color:#DFFF45}
    .date-pill{background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.12);color:#D4D7D1;padding:11px 16px;border-radius:999px;font-size:13px;font-weight:600;}
    .intro{padding:30px 30px 14px;display:flex;justify-content:space-between;gap:20px;align-items:flex-start;border-bottom:1px solid #E3E8DF;}
    .eyebrow{font-size:13px;color:#6B7280;margin:0 0 8px;font-weight:500}
    h1{font-size:32px;line-height:1.08;margin:0;font-weight:800;letter-spacing:-.045em}
    .intro-copy{margin:10px 0 0;color:#6B7280;font-size:14px;line-height:1.55;max-width:470px}
    .btn{display:inline-flex;align-items:center;gap:9px;background:#11161C;color:#fff;text-decoration:none;border-radius:999px;padding:14px 20px;font-size:14px;font-weight:700;white-space:nowrap;box-shadow:0 12px 22px rgba(17,22,28,.16);}
    .metrics{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;padding:26px 30px 22px}
    .metric{min-height:110px;background:#fff;border-radius:28px;padding:21px 20px;position:relative;border:1px solid rgba(17,22,28,.06);box-shadow:0 8px 24px rgba(17,22,28,.05);}
    .metric.lime{background:#DFFF45}
    .metric.dark{background:#11161C;color:#fff}
    .metric-label{margin:0 0 20px;color:#65707A;font-size:13px;font-weight:600;line-height:1.25}
    .metric.dark .metric-label{color:#ACB2AE}
    .metric-number{font-size:36px;margin:0;line-height:.9;font-weight:750;letter-spacing:-.06em}
    .content{padding:0 30px 30px;display:grid;grid-template-columns:1.7fr 1fr;gap:20px;align-items:start}
    .card{background:#fff;border-radius:30px;border:1px solid rgba(17,22,28,.06);box-shadow:0 8px 24px rgba(17,22,28,.05);overflow:hidden;}
    .card-head{padding:24px 24px 16px;border-bottom:1px solid #E3E8DF;display:flex;justify-content:space-between;align-items:flex-start;gap:16px}
    .card-title{margin:0;font-size:18px;font-weight:800;letter-spacing:-.03em}
    .card-sub{margin:5px 0 0;color:#6B7280;font-size:13px;line-height:1.35}
    .small-pill{border-radius:999px;background:#EEF2EC;color:#11161C;padding:8px 11px;font-size:12px;font-weight:700;white-space:nowrap}
    .task-list{padding:8px 14px 18px}
    .task{margin:10px 0;padding:16px 14px;border-radius:22px;background:#F8FAF6;border:1px solid rgba(17,22,28,.05);display:grid;grid-template-columns:12px 1fr auto;gap:12px;align-items:start;}
    .dot{width:9px;height:9px;border-radius:999px;margin-top:6px;display:inline-block}
    .task-title{margin:0;font-size:14px;font-weight:800;line-height:1.25;color:#11161C;letter-spacing:-.01em}
    .task-meta{margin:7px 0 0;color:#6B7280;font-size:12px;line-height:1.35}
    .badge{display:inline-block;border-radius:999px;padding:7px 10px;font-size:11px;font-weight:800;white-space:nowrap}
    .aside{display:flex;flex-direction:column;gap:18px}
    .dark-card{background:#11161C;color:#fff;border-radius:30px;padding:24px;box-shadow:0 12px 32px rgba(17,22,28,.14)}
    .dark-card h2{margin:0;font-size:18px;line-height:1.15;letter-spacing:-.03em}
    .dark-card p{margin:8px 0 18px;color:#B7BCB8;font-size:13px;line-height:1.45}
    .progress-track{height:10px;border-radius:999px;background:rgba(255,255,255,.1);overflow:hidden;margin-top:18px}
    .progress-fill{height:10px;border-radius:999px}
    .progress-number{font-size:42px;font-weight:800;letter-spacing:-.06em;color:#fff;margin:0}
    .alert-list{padding:16px 16px 18px}
    .alert{display:grid;grid-template-columns:38px 1fr;gap:12px;align-items:center;background:#F8FAF6;border-radius:18px;padding:12px;margin-bottom:10px;}
    .alert-icon{height:38px;width:38px;border-radius:999px;background:#FFE0E1;color:#EF4444;display:flex;align-items:center;justify-content:center;font-size:16px}
    .alert strong{display:block;font-size:13px;line-height:1.25;margin-bottom:3px}
    .alert span{display:block;color:#6B7280;font-size:11.5px;line-height:1.3}
    .projects{padding:18px 18px 20px}
    .project{display:flex;justify-content:space-between;align-items:center;padding:9px 0;border-bottom:1px solid #E3E8DF;gap:10px}
    .project:last-child{border-bottom:0}
    .project-name{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:600;color:#11161C;line-height:1.25}
    .count{background:#E9EEE6;border-radius:999px;min-width:32px;text-align:center;padding:5px 9px;font-size:12px;color:#65707A;font-weight:800}
    .footer{padding:0 30px 34px;text-align:center}
    .footer .footer-box{background:#11161C;border-radius:28px;padding:24px;color:#AEB5AF;font-size:12px;line-height:1.6}
    .footer strong{color:#fff}.footer span{color:#DFFF45}
    @media(max-width:780px){.email-shell{width:100%}.metrics,.content{grid-template-columns:1fr}.intro{flex-direction:column}.metrics{grid-template-columns:1fr 1fr}}
  </style>
</head>
<body>
  <main class="email-shell">
    <section class="topbar">
      <div class="brand">
        <div class="mark">w</div>
        <div class="brand-name">Wip<span>li</span></div>
      </div>
      <div class="date-pill">Resumen diario · ${escapeHtml(data.dateLabel)}</div>
    </section>

    <section class="intro">
      <div>
        <p class="eyebrow">Tu resumen de tareas del día</p>
        <h1>Hola, ${escapeHtml(data.recipientName)}. Este es tu foco de hoy.</h1>
        <p class="intro-copy">Revisa tus tareas activas, vencimientos y publicaciones pendientes antes de iniciar el día.</p>
      </div>
      <a class="btn" href="${escapeHtml(data.appUrl)}">＋ Abrir Wipli</a>
    </section>

    <section class="metrics">
      <article class="metric">
        <p class="metric-label">Tareas activas</p>
        <p class="metric-number">${data.metrics.active}</p>
      </article>
      <article class="metric">
        <p class="metric-label">Tareas vencidas</p>
        <p class="metric-number" style="color:#EF4444">${data.metrics.overdue}</p>
      </article>
      <article class="metric lime">
        <p class="metric-label" style="color:#11161C">Para hoy</p>
        <p class="metric-number">${data.metrics.today}</p>
      </article>
      <article class="metric dark">
        <p class="metric-label">Publicaciones</p>
        <p class="metric-number">${data.metrics.publications}</p>
      </article>
    </section>

    <section class="content">
      <article class="card">
        <div class="card-head">
          <div>
            <h2 class="card-title">Tus tareas de hoy</h2>
            <p class="card-sub">Vencidas y para hoy, ordenadas por prioridad.</p>
          </div>
          <div class="small-pill">${data.tasks.length} en esta lista</div>
        </div>
        <div class="task-list">
          ${hasTasks ? data.tasks.map(taskRowHtml).join('') : emptyStateHtml()}
        </div>
      </article>

      <aside class="aside">
        <article class="dark-card">
          <h2>Cumplimiento semanal</h2>
          <p>${data.weekly.completed} de ${data.weekly.total} tareas completadas esta semana.</p>
          <p class="progress-number">${data.weekly.percent}%</p>
          <div class="progress-track"><div class="progress-fill" style="width:${data.weekly.percent}%;background:${data.weekly.percent >= 70 ? '#22C55E' : data.weekly.percent >= 40 ? '#F59E0B' : '#EF4444'}"></div></div>
        </article>

        <article class="card">
          <div class="card-head" style="padding:20px 18px 12px">
            <div>
              <h2 class="card-title" style="font-size:16px">Alertas importantes</h2>
              <p class="card-sub">Requieren tu atención hoy.</p>
            </div>
          </div>
          <div class="alert-list">
            <div class="alert"><div class="alert-icon">!</div><div><strong>${data.metrics.overdue} tareas vencidas</strong><span>Revisa y actualiza pendientes</span></div></div>
            <div class="alert"><div class="alert-icon" style="background:#FFF1C2;color:#B45309">●</div><div><strong>${data.upcomingPublications} publicaciones próximas</strong><span>Entre hoy y mañana</span></div></div>
            <div class="alert"><div class="alert-icon" style="background:#EEE7FF;color:#7C3AED">↻</div><div><strong>${data.pendingReviews} revisiones pendientes</strong><span>Esperando aprobación</span></div></div>
          </div>
        </article>

        <article class="card">
          <div class="card-head" style="padding:20px 18px 12px">
            <div>
              <h2 class="card-title" style="font-size:16px">Tus proyectos activos</h2>
              <p class="card-sub">${data.projects.length} con tareas pendientes.</p>
            </div>
          </div>
          <div class="projects">
            ${data.projects.length ? data.projects.map(projectRowHtml).join('') : '<p style="padding:8px 0;color:#6B7280;font-size:13px;">Sin proyectos con tareas pendientes.</p>'}
          </div>
        </article>
      </aside>
    </section>

    <section class="footer">
      <div class="footer-box">
        <strong>Wip<span>li</span></strong><br>
        Tu operación diaria bajo control. Este resumen fue generado automáticamente desde tu tablero.
      </div>
    </section>
  </main>
</body>
</html>`
}
