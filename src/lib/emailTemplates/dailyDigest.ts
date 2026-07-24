import { Priority, TaskStatus } from '@/types'

const FONT = "Poppins, Arial, Helvetica, sans-serif"

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

// Tarjeta de una métrica (Tareas activas / vencidas / para hoy / publicaciones).
function metricCellHtml(label: string, value: number, opts: { bg?: string; labelColor?: string; valueColor?: string } = {}): string {
  const bg = opts.bg ?? '#FFFFFF'
  const labelColor = opts.labelColor ?? '#65707A'
  const valueColor = opts.valueColor ?? '#11161C'
  return `
    <td width="25%" valign="top" style="padding:6px;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${bg};border-radius:24px;border:1px solid rgba(17,22,28,.06);">
        <tr>
          <td style="padding:20px 18px;font-family:${FONT};">
            <p style="margin:0 0 18px;color:${labelColor};font-size:13px;font-weight:600;">${escapeHtml(label)}</p>
            <p style="margin:0;color:${valueColor};font-size:32px;font-weight:800;letter-spacing:-.04em;">${value}</p>
          </td>
        </tr>
      </table>
    </td>`
}

function taskRowHtml(task: DigestTaskRow): string {
  const badge = task.overdue ? { bg: '#FFE0E1', text: '#E23B3B', label: 'Vencida' } : PRIORITY_BADGES[task.priority]
  const dot = STATUS_DOTS[task.status]
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:10px 0;background:#F8FAF6;border:1px solid rgba(17,22,28,.05);border-radius:20px;font-family:${FONT};">
      <tr>
        <td width="26" valign="top" style="padding:16px 0 16px 14px;">
          <span style="display:inline-block;width:9px;height:9px;border-radius:50%;background:${dot};margin-top:6px;font-size:0;line-height:0;">&nbsp;</span>
        </td>
        <td valign="top" style="padding:16px 8px;">
          <p style="margin:0;color:#11161C;font-size:14px;font-weight:700;">${escapeHtml(task.title)}</p>
          <p style="margin:6px 0 0;color:#6B7280;font-size:12px;">${escapeHtml(task.projectName)} · ${escapeHtml(task.meta)}</p>
        </td>
        <td valign="top" align="right" style="padding:16px 14px 16px 8px;white-space:nowrap;">
          <span style="display:inline-block;border-radius:999px;padding:6px 10px;font-size:11px;font-weight:700;background:${badge.bg};color:${badge.text};">${badge.label}</span>
        </td>
      </tr>
    </table>`
}

function alertRowHtml(icon: string, iconBg: string, iconColor: string, title: string, subtitle: string): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;background:#F8FAF6;border-radius:16px;font-family:${FONT};">
      <tr>
        <td width="50" valign="middle" style="padding:12px 0 12px 12px;">
          <table role="presentation" cellpadding="0" cellspacing="0"><tr>
            <td width="36" height="36" align="center" valign="middle" style="background:${iconBg};color:${iconColor};border-radius:50%;font-size:15px;font-weight:700;">${icon}</td>
          </tr></table>
        </td>
        <td valign="middle" style="padding:12px 12px 12px 10px;">
          <p style="margin:0 0 3px;color:#11161C;font-size:13px;font-weight:700;">${escapeHtml(title)}</p>
          <p style="margin:0;color:#6B7280;font-size:11.5px;">${escapeHtml(subtitle)}</p>
        </td>
      </tr>
    </table>`
}

function projectRowHtml(project: DigestProjectRow, isLast: boolean): string {
  return `
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="${isLast ? '' : 'border-bottom:1px solid #E3E8DF;'}font-family:${FONT};">
      <tr>
        <td style="padding:9px 0;">
          <span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${project.color};margin-right:8px;font-size:0;line-height:0;">&nbsp;</span>
          <span style="font-size:13.5px;font-weight:600;color:#11161C;">${escapeHtml(project.name)}</span>
        </td>
        <td align="right" style="padding:9px 0;">
          <span style="display:inline-block;min-width:28px;text-align:center;background:#E9EEE6;border-radius:999px;padding:5px 9px;font-size:12px;color:#65707A;font-weight:700;">${project.pendingCount}</span>
        </td>
      </tr>
    </table>`
}

function emptyStateHtml(): string {
  return `<p style="padding:24px;text-align:center;color:#6B7280;font-size:14px;font-family:${FONT};">🎉 No tienes tareas pendientes por ahora. ¡Buen trabajo!</p>`
}

export function renderDailyDigestEmail(data: DailyDigestData): string {
  const hasTasks = data.tasks.length > 0
  const progressColor = data.weekly.percent >= 70 ? '#22C55E' : data.weekly.percent >= 40 ? '#F59E0B' : '#EF4444'

  return `<!doctype html>
<html lang="es">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <meta name="color-scheme" content="light" />
  <title>Wipli · Resumen diario</title>
</head>
<body style="margin:0;padding:0;background:#E9EEE6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9EEE6;">
    <tr>
      <td align="center" style="padding:36px 16px;">
        <table role="presentation" width="700" cellpadding="0" cellspacing="0" style="width:700px;max-width:100%;background:#F4F7F2;border-radius:32px;overflow:hidden;">

          <!-- Topbar -->
          <tr>
            <td style="background:#11161C;padding:26px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td width="40" height="40" align="center" valign="middle" style="background:#DFFF45;border-radius:50%;font-family:${FONT};font-weight:900;font-size:20px;color:#11161C;">w</td>
                      <td style="padding-left:12px;font-family:${FONT};font-size:22px;font-weight:800;color:#ffffff;">Wip<span style="color:#DFFF45;">li</span></td>
                    </tr></table>
                  </td>
                  <td align="right" valign="middle">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#D4D7D1;padding:10px 15px;border-radius:999px;font-family:${FONT};font-size:12px;font-weight:600;white-space:nowrap;">Resumen diario · ${escapeHtml(data.dateLabel)}</td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Intro -->
          <tr>
            <td style="padding:28px 28px 16px;border-bottom:1px solid #E3E8DF;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td valign="top">
                    <p style="margin:0 0 8px;font-family:${FONT};font-size:13px;color:#6B7280;font-weight:500;">Tu resumen de tareas del día</p>
                    <p style="margin:0;font-family:${FONT};font-size:26px;line-height:1.15;font-weight:800;color:#11161C;">Hola, ${escapeHtml(data.recipientName)}. Este es tu foco de hoy.</p>
                    <p style="margin:10px 0 0;font-family:${FONT};font-size:14px;line-height:1.55;color:#6B7280;">Revisa tus tareas activas, vencimientos y publicaciones pendientes antes de iniciar el día.</p>
                  </td>
                  <td width="150" valign="top" align="right">
                    <table role="presentation" cellpadding="0" cellspacing="0"><tr>
                      <td style="background:#11161C;border-radius:999px;">
                        <a href="${escapeHtml(data.appUrl)}" style="display:inline-block;padding:13px 18px;font-family:${FONT};font-size:13px;font-weight:700;text-decoration:none;white-space:nowrap;"><span style="color:#ffffff;">＋ Abrir Wipli</span></a>
                      </td>
                    </tr></table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Metrics -->
          <tr>
            <td style="padding:20px 22px 16px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  ${metricCellHtml('Tareas activas', data.metrics.active)}
                  ${metricCellHtml('Tareas vencidas', data.metrics.overdue, { valueColor: '#EF4444' })}
                  ${metricCellHtml('Para hoy', data.metrics.today, { bg: '#DFFF45', labelColor: '#11161C' })}
                  ${metricCellHtml('Publicaciones', data.metrics.publications, { bg: '#11161C', labelColor: '#ACB2AE', valueColor: '#ffffff' })}
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content: tasks (left) + aside (right) -->
          <tr>
            <td style="padding:0 22px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td width="62%" valign="top" style="padding-right:8px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:26px;border:1px solid rgba(17,22,28,.06);">
                      <tr>
                        <td style="padding:22px 20px 14px;border-bottom:1px solid #E3E8DF;">
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
                            <td valign="top">
                              <p style="margin:0;font-family:${FONT};font-size:17px;font-weight:800;color:#11161C;">Tus tareas de hoy</p>
                              <p style="margin:4px 0 0;font-family:${FONT};font-size:13px;color:#6B7280;">Vencidas y para hoy, ordenadas por prioridad.</p>
                            </td>
                            <td align="right" valign="top">
                              <span style="display:inline-block;border-radius:999px;background:#EEF2EC;color:#11161C;padding:7px 10px;font-family:${FONT};font-size:11px;font-weight:700;white-space:nowrap;">${data.tasks.length} en esta lista</span>
                            </td>
                          </tr></table>
                        </td>
                      </tr>
                      <tr>
                        <td style="padding:8px 12px 14px;">
                          ${hasTasks ? data.tasks.map(taskRowHtml).join('') : emptyStateHtml()}
                        </td>
                      </tr>
                    </table>
                  </td>
                  <td width="38%" valign="top" style="padding-left:8px;">

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#11161C;border-radius:26px;margin-bottom:16px;">
                      <tr>
                        <td style="padding:22px;font-family:${FONT};">
                          <p style="margin:0;color:#ffffff;font-size:17px;font-weight:800;">Cumplimiento semanal</p>
                          <p style="margin:8px 0 16px;color:#B7BCB8;font-size:13px;line-height:1.45;">${data.weekly.completed} de ${data.weekly.total} tareas completadas esta semana.</p>
                          <p style="margin:0;color:#ffffff;font-size:36px;font-weight:800;letter-spacing:-.04em;">${data.weekly.percent}%</p>
                          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-top:16px;">
                            <tr><td style="background:rgba(255,255,255,.12);border-radius:999px;height:8px;font-size:0;line-height:0;">
                              <div style="width:${data.weekly.percent}%;background:${progressColor};height:8px;border-radius:999px;font-size:0;line-height:0;">&nbsp;</div>
                            </td></tr>
                          </table>
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:26px;border:1px solid rgba(17,22,28,.06);margin-bottom:16px;">
                      <tr>
                        <td style="padding:18px 16px 6px;font-family:${FONT};">
                          <p style="margin:0;font-size:15px;font-weight:800;color:#11161C;">Alertas importantes</p>
                          <p style="margin:4px 0 12px;font-size:12.5px;color:#6B7280;">Requieren tu atención hoy.</p>
                          ${alertRowHtml('!', '#FFE0E1', '#EF4444', `${data.metrics.overdue} tareas vencidas`, 'Revisa y actualiza pendientes')}
                          ${alertRowHtml('●', '#FFF1C2', '#B45309', `${data.upcomingPublications} publicaciones próximas`, 'Entre hoy y mañana')}
                          ${alertRowHtml('↻', '#EEE7FF', '#7C3AED', `${data.pendingReviews} revisiones pendientes`, 'Esperando aprobación')}
                        </td>
                      </tr>
                    </table>

                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:26px;border:1px solid rgba(17,22,28,.06);">
                      <tr>
                        <td style="padding:18px 16px;font-family:${FONT};">
                          <p style="margin:0;font-size:15px;font-weight:800;color:#11161C;">Tus proyectos activos</p>
                          <p style="margin:4px 0 10px;font-size:12.5px;color:#6B7280;">${data.projects.length} con tareas pendientes.</p>
                          ${data.projects.length ? data.projects.map((p, i) => projectRowHtml(p, i === data.projects.length - 1)).join('') : `<p style="margin:0;padding:8px 0;color:#6B7280;font-size:13px;">Sin proyectos con tareas pendientes.</p>`}
                        </td>
                      </tr>
                    </table>

                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding:0 22px 28px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#11161C;border-radius:22px;">
                <tr>
                  <td align="center" style="padding:22px;font-family:${FONT};color:#AEB5AF;font-size:12px;line-height:1.6;">
                    <span style="color:#ffffff;font-weight:700;">Wip<span style="color:#DFFF45;">li</span></span><br />
                    Tu operación diaria bajo control. Este resumen fue generado automáticamente desde tu tablero.
                  </td>
                </tr>
              </table>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
