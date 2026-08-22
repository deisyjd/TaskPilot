import { ReportData } from './reportData'

const FONT = "Poppins, Arial, Helvetica, sans-serif"
const MAX_ROWS = 40

function esc(v: string): string {
  return v.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function metric(label: string, value: string): string {
  return `
    <td align="center" style="padding:14px 8px;background:#ffffff;border-radius:16px;">
      <div style="font-family:${FONT};font-size:22px;font-weight:800;color:#11161C;">${esc(value)}</div>
      <div style="font-family:${FONT};font-size:11px;color:#6B7280;margin-top:2px;">${esc(label)}</div>
    </td>`
}

// `full` = true cuando el usuario eligió el formato "mailing" (reporte completo
// en el cuerpo). Si es false, el correo es un aviso corto y el detalle va en los
// adjuntos.
export function renderReportEmail(data: ReportData, full: boolean, hasAttachments: boolean): string {
  const scope = data.projectName ? `Proyecto: ${esc(data.projectName)}` : `Empresa: ${esc(data.companyName)}`

  const rowsHtml = data.tasks
    .slice(0, MAX_ROWS)
    .map(
      (t) => `
      <tr>
        <td style="padding:8px 10px;border-bottom:1px solid #E3E8DF;font-family:${FONT};font-size:12px;color:#11161C;">${esc(t.title)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E3E8DF;font-family:${FONT};font-size:12px;color:#6B7280;">${esc(t.projectName)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E3E8DF;font-family:${FONT};font-size:12px;color:#6B7280;">${esc(t.statusLabel)}</td>
        <td style="padding:8px 10px;border-bottom:1px solid #E3E8DF;font-family:${FONT};font-size:12px;color:#6B7280;white-space:nowrap;">${esc(t.dueDate)}</td>
      </tr>`
    )
    .join('')

  const remaining = data.tasks.length - MAX_ROWS

  const detailTable = full
    ? `
      <tr><td style="padding:0 28px 8px;">
        <p style="margin:0 0 8px;font-family:${FONT};font-size:13px;font-weight:700;color:#11161C;">Tareas del periodo</p>
      </td></tr>
      <tr><td style="padding:0 28px 22px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:16px;overflow:hidden;">
          <tr>
            <td style="padding:8px 10px;font-family:${FONT};font-size:11px;font-weight:700;color:#6B7280;border-bottom:1px solid #E3E8DF;">Título</td>
            <td style="padding:8px 10px;font-family:${FONT};font-size:11px;font-weight:700;color:#6B7280;border-bottom:1px solid #E3E8DF;">Proyecto</td>
            <td style="padding:8px 10px;font-family:${FONT};font-size:11px;font-weight:700;color:#6B7280;border-bottom:1px solid #E3E8DF;">Estado</td>
            <td style="padding:8px 10px;font-family:${FONT};font-size:11px;font-weight:700;color:#6B7280;border-bottom:1px solid #E3E8DF;">Vence</td>
          </tr>
          ${rowsHtml || `<tr><td colspan="4" style="padding:12px 10px;font-family:${FONT};font-size:12px;color:#6B7280;">Sin tareas en el periodo.</td></tr>`}
        </table>
        ${remaining > 0 ? `<p style="margin:8px 0 0;font-family:${FONT};font-size:11px;color:#6B7280;">…y ${remaining} más. Revisa el archivo adjunto para el detalle completo.</p>` : ''}
      </td></tr>`
    : `
      <tr><td style="padding:0 28px 24px;">
        <p style="margin:0;font-family:${FONT};font-size:13px;color:#374151;line-height:1.6;">
          Adjuntamos el reporte de avance del periodo${hasAttachments ? ' (PDF/Excel según lo solicitado)' : ''}.
        </p>
      </td></tr>`

  return `<!doctype html>
<html lang="es">
<head><meta charset="utf-8" /><meta name="viewport" content="width=device-width, initial-scale=1" /><meta name="color-scheme" content="light" /><title>Wipli · Reporte de avance</title></head>
<body style="margin:0;padding:0;background:#E9EEE6;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#E9EEE6;">
    <tr><td align="center" style="padding:36px 16px;">
      <table role="presentation" width="640" cellpadding="0" cellspacing="0" style="width:640px;max-width:100%;background:#F4F7F2;border-radius:32px;overflow:hidden;">

        <tr><td style="background:#11161C;padding:26px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
            <td valign="middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td width="40" height="40" align="center" valign="middle" style="background:#DFFF45;border-radius:50%;font-family:${FONT};font-weight:900;font-size:20px;color:#11161C;">w</td>
              <td style="padding-left:12px;font-family:${FONT};font-size:22px;font-weight:800;color:#ffffff;">Wip<span style="color:#DFFF45;">li</span></td>
            </tr></table></td>
            <td align="right" valign="middle"><table role="presentation" cellpadding="0" cellspacing="0"><tr>
              <td style="background:rgba(255,255,255,.08);border:1px solid rgba(255,255,255,.15);color:#D4D7D1;padding:10px 15px;border-radius:999px;font-family:${FONT};font-size:12px;font-weight:600;white-space:nowrap;">Reporte de avance</td>
            </tr></table></td>
          </tr></table>
        </td></tr>

        <tr><td style="padding:26px 28px 14px;">
          <p style="margin:0 0 6px;font-family:${FONT};font-size:13px;color:#6B7280;">${scope}</p>
          <p style="margin:0;font-family:${FONT};font-size:20px;font-weight:800;color:#11161C;">Avance del ${esc(data.start)} al ${esc(data.end)}</p>
        </td></tr>

        <tr><td style="padding:8px 24px 18px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="6"><tr>
            ${metric('Total', String(data.totals.total))}
            ${metric('Completadas', String(data.totals.done))}
            ${metric('Pendientes', String(data.totals.pending))}
            ${metric('Avance', `${data.totals.completionRate}%`)}
          </tr></table>
        </td></tr>

        ${detailTable}

        <tr><td style="padding:0 22px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#11161C;border-radius:22px;"><tr>
            <td align="center" style="padding:20px;font-family:${FONT};color:#AEB5AF;font-size:12px;line-height:1.6;">
              <span style="color:#ffffff;font-weight:700;">Wip<span style="color:#DFFF45;">li</span></span><br />
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
