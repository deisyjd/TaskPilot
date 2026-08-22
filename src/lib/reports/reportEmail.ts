import { ReportData } from './reportData'

// Paleta de la plataforma (globals.css --tp-*)
const FONT = "Poppins, Arial, Helvetica, sans-serif"
const DARK = '#111318'
const LIME = '#DFFF5F'
const BG = '#F4F7F2'
const SURFACE = '#FFFFFF'
const TRACK = '#EEF3ED'
const TEXT = '#111111'
const TEXT2 = '#6B7280'
const BORDER = '#E7ECE4'
const MAX_ROWS = 40

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

// Barra de progreso email-safe (tablas anidadas).
function bar(pct: number, color: string): string {
  const w = Math.max(0, Math.min(100, Math.round(pct)))
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border-radius:6px;overflow:hidden;background:${TRACK};"><tr>
    <td style="height:8px;background:${color};width:${w}%;font-size:0;line-height:0;">&nbsp;</td>
    <td style="height:8px;width:${100 - w}%;font-size:0;line-height:0;">&nbsp;</td>
  </tr></table>`
}

function metric(label: string, value: string): string {
  return `
    <td width="25%" align="center" style="padding:14px 6px;background:${SURFACE};border:1px solid ${BORDER};border-radius:16px;">
      <div style="font-family:${FONT};font-size:22px;font-weight:800;color:${DARK};">${esc(value)}</div>
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

// `full` = true cuando el usuario eligió el formato "mailing" (reporte completo
// en el cuerpo). Si es false, es un aviso corto y el detalle va en los adjuntos.
export function renderReportEmail(data: ReportData, full: boolean, hasAttachments: boolean, appUrl: string): string {
  const totalDen = data.totals.total || 1
  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count))

  const projectChart = data.byProject.length
    ? card(
        `<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};">Avance por proyecto</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           ${data.byProject.slice(0, 12).map((p) => chartRow(p.name, `${p.done}/${p.total} · ${Math.round((p.done / (p.total || 1)) * 100)}%`, (p.done / (p.total || 1)) * 100, p.color)).join('')}
         </table>`
      )
    : ''

  const statusChart = data.byStatus.length
    ? card(
        `<p style="margin:0 0 10px;font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};">Tareas por estado</p>
         <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
           ${data.byStatus.map((s) => chartRow(s.label, String(s.count), (s.count / maxStatus) * 100, s.color)).join('')}
         </table>`
      )
    : ''

  const rowsHtml = data.tasks
    .slice(0, MAX_ROWS)
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:12px;color:${TEXT};">${esc(t.title)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:12px;color:${TEXT2};">${esc(t.projectName)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:12px;color:${TEXT2};">${esc(t.statusLabel)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid ${BORDER};font-family:${FONT};font-size:12px;color:${TEXT2};white-space:nowrap;">${esc(t.dueDate)}</td>
      </tr>`
    )
    .join('')
  const remaining = data.tasks.length - MAX_ROWS

  const detail = full
    ? card(
        `<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};">Tareas del periodo</p>
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
    ? `<img src="${esc(appUrl)}/wipli-logo.png" width="36" height="36" alt="Wipli" style="border-radius:10px;display:block;" />`
    : `<div style="width:36px;height:36px;background:${LIME};border-radius:50%;font-family:${FONT};font-weight:900;font-size:18px;color:${DARK};text-align:center;line-height:36px;">w</div>`

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
              <td style="padding-left:12px;font-family:${FONT};font-size:22px;font-weight:800;color:#ffffff;">Wip<span style="color:${LIME};">li</span></td>
            </tr></table></td>
            <td align="right" valign="middle">
              <span style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#D4D7D1;padding:9px 14px;border-radius:999px;font-family:${FONT};font-size:12px;font-weight:600;white-space:nowrap;">Reporte de avance</span>
            </td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:24px 28px 8px;">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:13px;color:${TEXT2};">${esc(data.scopeLabel)}</p>
          <p style="margin:0;font-family:${FONT};font-size:20px;font-weight:800;color:${DARK};">Avance del ${esc(data.start)} al ${esc(data.end)}</p>
        </td></tr>

        <tr><td style="padding:14px 24px 6px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>
            ${metric('Total', String(data.totals.total))}
            ${metric('Completadas', String(data.totals.done))}
            ${metric('Pendientes', String(data.totals.pending))}
            ${metric('Avance', `${data.totals.completionRate}%`)}
          </tr></table>
        </td></tr>

        ${card(`<p style="margin:0 0 8px;font-family:${FONT};font-size:13px;font-weight:700;color:${DARK};">Avance general — ${data.totals.completionRate}%</p>${bar((data.totals.done / totalDen) * 100, LIME)}`)}
        ${projectChart}
        ${statusChart}
        ${detail}

        <tr><td style="padding:2px 22px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${DARK};border-radius:20px;"><tr>
            <td align="center" style="padding:20px;font-family:${FONT};color:#AEB5AF;font-size:12px;line-height:1.6;">
              <span style="color:#ffffff;font-weight:700;">Wip<span style="color:${LIME};">li</span></span><br />
              Reporte generado por ${esc(data.generatedBy)}.
            </td>
          </tr></table>
        </td></tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}
