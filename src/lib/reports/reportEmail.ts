import { ReportData, STATUS_HEX } from './reportData'

// Paleta de la plataforma (globals.css --tp-*)
const FONT = "Poppins, Arial, Helvetica, sans-serif"
const DARK = '#111318'
const LIME = '#DFFF5F'
const LIME_TEXT = '#7C8A1E' // versión oscurecida del lime, legible sobre blanco
const BG = '#F4F7F2'
const SURFACE = '#FFFFFF'
const TRACK = '#EEF3ED'
const TEXT = '#111111'
const TEXT2 = '#6B7280'
const BORDER = '#E7ECE4'
const DONE_GREEN = '#16A34A'
const PENDING_GRAY = '#9CA3AF'
const MAX_ROWS = 40

const MONTH_ABBR = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic']
const MONTH_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// "2026-08-01" → "1 ago 2026" — se parsea a mano para no depender del ICU del
// runtime ni de que el string traiga hora.
function shortDate(dateStr: string): string {
  const [y, m, d] = dateStr.split('-').map(Number)
  if (!y || !m || !d) return dateStr
  return `${d} ${MONTH_ABBR[m - 1]} ${y}`
}

function longDate(date: Date): string {
  return `${date.getDate()} de ${MONTH_FULL[date.getMonth()]} de ${date.getFullYear()}`
}

// Tinte suave del color de estado para el fondo de la píldora (mismo truco de
// opacidad hex que ya se usa en el panel de notificaciones del header).
function tint(hex: string): string {
  return `${hex}18`
}

// Barra de progreso email-safe (tablas anidadas).
function bar(pct: number, color: string): string {
  const w = Math.max(0, Math.min(100, Math.round(pct)))
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;background:${TRACK};"><tr>
    <td style="height:8px;background:${color};width:${w}%;font-size:0;line-height:0;">&nbsp;</td>
    <td style="height:8px;width:${100 - w}%;font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>`
}

function metric(label: string, value: string, color: string): string {
  return `
    <td width="33.33%" align="center" style="padding:14px 6px;background:${SURFACE};border:1px solid ${BORDER};border-radius:16px;">
      <div style="font-family:${FONT};font-size:22px;font-weight:800;color:${color};">${esc(value)}</div>
      <div style="font-family:${FONT};font-size:11px;color:${TEXT2};margin-top:2px;">${esc(label)}</div>
    </td>`
}

function chartRow(label: string, right: string, pct: number, color: string): string {
  return `
    <tr><td style="padding:7px 0;">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
        <td style="font-family:${FONT};font-size:12px;color:${TEXT};padding-bottom:4px;">${esc(label)}</td>
        <td align="right" style="font-family:${FONT};font-size:12px;font-weight:700;color:${TEXT2};padding-bottom:4px;">${esc(right)}</td>
      </tr></table>
      ${bar(pct, color)}
    </td></tr>`
}

function card(inner: string): string {
  return `<tr><td style="padding:0 28px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${SURFACE};border:1px solid ${BORDER};border-radius:20px;">
      <tr><td style="padding:18px 20px;">${inner}</td></tr>
    </table>
  </td></tr>`
}

// Círculo de avance del header — reutiliza el mismo lime de marca que el
// resto de la app usa para insignias de cumplimiento.
function progressBadge(pct: number): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0"><tr>
    <td width="74" height="74" align="center" valign="middle" style="width:74px;height:74px;border-radius:50%;background:${LIME};border:4px solid rgba(223,255,95,0.3);">
      <div style="font-family:${FONT};font-size:19px;font-weight:800;color:${DARK};line-height:1.1;">${pct}%</div>
      <div style="font-family:${FONT};font-size:8px;font-weight:700;letter-spacing:1px;color:${DARK};">AVANCE</div>
    </td>
  </tr></table>`
}

function statusPill(label: string, color: string): string {
  const isDone = color === STATUS_HEX.done
  return `<span style="display:inline-block;padding:3px 10px;border-radius:999px;background:${tint(color)};color:${color};font-family:${FONT};font-size:11px;font-weight:700;white-space:nowrap;">${isDone ? '✓&nbsp;' : ''}${esc(label)}</span>`
}

// Desglose del checklist interno de una tarea — solo se dibuja si tiene ítems.
function checklistBlock(items: ReportData['tasks'][number]['checklist']): string {
  if (!items.length) return ''
  const done = items.filter((c) => c.done).length
  const rows = items
    .map(
      (c) => `
      <div style="padding:2px 0;font-family:${FONT};font-size:11px;color:${c.done ? TEXT2 : TEXT};">
        <span style="color:${c.done ? DONE_GREEN : PENDING_GRAY};font-weight:700;">${c.done ? '✓' : '○'}</span>
        <span style="text-decoration:${c.done ? 'line-through' : 'none'};padding-left:4px;">${esc(c.text)}</span>
        ${c.assignee ? `<span style="color:${TEXT2};"> · ${esc(c.assignee)}</span>` : ''}
      </div>`
    )
    .join('')
  return `<tr><td colspan="4" style="padding:0 10px 10px;border-bottom:1px solid ${BORDER};">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};border-radius:10px;">
      <tr><td style="padding:8px 12px;">
        <p style="margin:0 0 4px;font-family:${FONT};font-size:10px;font-weight:700;color:${TEXT2};text-transform:uppercase;letter-spacing:.5px;">Checklist · ${done}/${items.length}</p>
        ${rows}
      </td></tr>
    </table>
  </td></tr>`
}

// Caja de cierre — copy dinámico según qué tan cerrado quedó el periodo.
function closingCallout(data: ReportData): string {
  const { total, done, pending } = data.totals
  let title: string
  let desc: string
  if (total === 0) {
    title = 'Sin tareas en este periodo.'
    desc = 'No se registraron tareas dentro del rango seleccionado.'
  } else if (pending === 0) {
    title = `Periodo cerrado al 100%.`
    desc = `Las ${done} tarea${done === 1 ? '' : 's'} del periodo quedaron publicadas y terminadas. Sin pendientes arrastrados al siguiente ciclo.`
  } else {
    title = `Periodo en curso: ${data.totals.completionRate}% completado.`
    desc = `Quedan ${pending} tarea${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de este periodo. Revisa el detalle para ponerte al día.`
  }
  return `<tr><td style="padding:2px 28px 18px;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${DARK};border-radius:20px;"><tr>
      <td style="padding:20px 22px;">
        <p style="margin:0 0 4px;font-family:${FONT};font-size:14px;font-weight:800;color:#ffffff;">${esc(title)}</p>
        <p style="margin:0;font-family:${FONT};font-size:12px;color:#AEB5AF;line-height:1.6;">${esc(desc)}</p>
      </td>
    </tr></table>
  </td></tr>`
}

// `full` = true cuando el usuario eligió el formato "mailing" (reporte completo
// en el cuerpo). Si es false, es un aviso corto y el detalle va en los adjuntos.
export function renderReportEmail(data: ReportData, full: boolean, hasAttachments: boolean, appUrl: string): string {
  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count))
  const title = data.scopeLabel.replace(/^(Empresa|Proyecto):\s*/, '')

  const statusChart = data.byStatus.length
    ? card(
        `<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};">Tareas por estado</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           ${data.byStatus.map((s) => chartRow(s.label, String(s.count), (s.count / maxStatus) * 100, s.color)).join('')}
         </table>`
      )
    : ''

  const projectChart = data.byProject.length
    ? card(
        `<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};">Avance por proyecto</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           ${data.byProject.slice(0, 12).map((p) => chartRow(p.name, `${p.done}/${p.total} · ${Math.round((p.done / (p.total || 1)) * 100)}%`, (p.done / (p.total || 1)) * 100, p.color)).join('')}
         </table>`
      )
    : ''

  const rowsHtml = data.tasks
    .slice(0, MAX_ROWS)
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:${t.checklist.length ? 'none' : `1px solid ${BORDER}`};font-family:${FONT};font-size:12px;color:${TEXT};">${esc(t.title)}</td>
        <td style="padding:8px 10px;border-bottom:${t.checklist.length ? 'none' : `1px solid ${BORDER}`};font-family:${FONT};font-size:12px;color:${TEXT2};">${esc(t.projectName)}</td>
        <td style="padding:8px 10px;border-bottom:${t.checklist.length ? 'none' : `1px solid ${BORDER}`};">${statusPill(t.statusLabel, t.statusColor)}</td>
        <td style="padding:8px 10px;border-bottom:${t.checklist.length ? 'none' : `1px solid ${BORDER}`};font-family:${FONT};font-size:12px;color:${TEXT2};white-space:nowrap;">${esc(t.dueDate)}</td>
      </tr>${checklistBlock(t.checklist)}`
    )
    .join('')
  const remaining = data.tasks.length - MAX_ROWS

  const detail = full
    ? card(
        `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};">Detalle de tareas</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           <tr>
             <td style="padding:6px 10px;font-family:${FONT};font-size:11px;font-weight:700;color:${TEXT2};border-bottom:1px solid ${BORDER};">Título</td>
             <td style="padding:6px 10px;font-family:${FONT};font-size:11px;font-weight:700;color:${TEXT2};border-bottom:1px solid ${BORDER};">Proyecto</td>
             <td style="padding:6px 10px;font-family:${FONT};font-size:11px;font-weight:700;color:${TEXT2};border-bottom:1px solid ${BORDER};">Estado</td>
             <td style="padding:6px 10px;font-family:${FONT};font-size:11px;font-weight:700;color:${TEXT2};border-bottom:1px solid ${BORDER};">Vence</td>
           </tr>
           ${rowsHtml || `<tr><td colspan="4" style="padding:12px 10px;font-family:${FONT};font-size:12px;color:${TEXT2};">Sin tareas en el periodo.</td></tr>`}
         </table>
         ${remaining > 0 ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:11px;color:${TEXT2};">…y ${remaining} más. Revisa el archivo adjunto para el detalle completo.</p>` : ''}`
      )
    : `<tr><td style="padding:0 28px 22px;">
         <p style="margin:0;font-family:${FONT};font-size:13px;color:#374151;line-height:1.6;">
           Adjuntamos el reporte de avance del periodo${hasAttachments ? ' (PDF/Excel según lo solicitado)' : ''}.
         </p>
       </td></tr>`

  const logo = appUrl
    ? `<img src="${esc(appUrl)}/wipli-logo.png" width="34" height="34" alt="Wipli" style="border-radius:9px;display:block;" />`
    : `<div style="width:34px;height:34px;background:${LIME};border-radius:50%;font-family:${FONT};font-weight:900;font-size:17px;color:${DARK};text-align:center;line-height:34px;">w</div>`

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" /><title>Wipli · Reporte de avance</title></head>
<body style="margin:0;padding:0;background:${BG};">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${BG};">
    <tr><td align="center" style="padding:32px 16px;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;background:${BG};border-radius:28px;overflow:hidden;border:1px solid ${BORDER};">

        <tr><td style="background:${DARK};padding:24px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td>${logo}</td>
              <td style="padding-left:12px;font-family:${FONT};font-size:20px;font-weight:800;color:#ffffff;">Wip<span style="color:${LIME};">li</span></td>
            </tr></table></td>
            <td align="right" valign="middle">${progressBadge(data.totals.completionRate)}</td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:26px 28px 4px;">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:11px;font-weight:700;letter-spacing:1.5px;color:${LIME_TEXT};text-transform:uppercase;">Reporte de avance</p>
          <h1 style="margin:0 0 6px;font-family:${FONT};font-size:26px;font-weight:800;color:${DARK};">${esc(title)}</h1>
          <p style="margin:0;font-family:${FONT};font-size:13px;color:${TEXT2};">${shortDate(data.start)} — ${shortDate(data.end)}</p>
        </td></tr>

        <tr><td style="padding:16px 24px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>
            ${metric('Total', String(data.totals.total), DARK)}
            ${metric('Completadas', String(data.totals.done), DONE_GREEN)}
            ${metric('Pendientes', String(data.totals.pending), data.totals.pending > 0 ? '#D97706' : TEXT2)}
          </tr></table>
        </td></tr>

        <tr><td style="height:6px;"></td></tr>
        ${statusChart}
        ${projectChart}
        ${detail}
        ${closingCallout(data)}

        <tr><td style="padding:2px 28px 26px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid ${BORDER};"><tr>
            <td style="padding-top:14px;font-family:${FONT};font-size:12px;font-weight:700;color:${DARK};">Wipli</td>
            <td align="right" style="padding-top:14px;font-family:${FONT};font-size:11px;color:${TEXT2};">Generado por ${esc(data.generatedBy)} el ${longDate(new Date())} · wipli.app</td>
          </tr></table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
