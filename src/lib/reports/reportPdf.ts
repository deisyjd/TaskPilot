import { PDFDocument, PDFFont, PDFPage, RGB, StandardFonts, rgb } from 'pdf-lib'
import { ReportData, STATUS_HEX } from './reportData'

const PAGE = { w: 595.28, h: 841.89 } // A4 en puntos
const MARGIN = 40
const HEADER_H = 86
const PAD = 14

// Misma paleta de marca que reportEmail.ts, convertida a RGB para pdf-lib.
const DARK = rgb(0.067, 0.086, 0.11) // #111318
const LIME = rgb(0.875, 1, 0.373) // #DFFF5F
const LIME_TEXT = rgb(0.486, 0.541, 0.118) // #7C8A1E
const BG = rgb(0.957, 0.969, 0.949) // #F4F7F2
const SURFACE = rgb(1, 1, 1)
const BORDER = rgb(0.906, 0.925, 0.898) // #E7ECE4
const TRACK = rgb(0.933, 0.953, 0.929) // #EEF3ED
const TEXT = rgb(0.067, 0.067, 0.067) // #111111
const TEXT2 = rgb(0.42, 0.447, 0.502) // #6B7280
const DONE_GREEN = rgb(0.086, 0.639, 0.29) // #16A34A
const PENDING_GRAY = rgb(0.612, 0.639, 0.686) // #9CA3AF
const AMBER = rgb(0.851, 0.467, 0.024) // #D97706

const MONTH_FULL = [
  'enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio',
  'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre',
]

const COLUMNS = [
  { x: MARGIN, w: 195, key: 'title' as const, label: 'Título' },
  { x: MARGIN + 200, w: 110, key: 'projectName' as const, label: 'Proyecto' },
  { x: MARGIN + 315, w: 120, key: 'statusLabel' as const, label: 'Estado' },
  { x: MARGIN + 455, w: 60, key: 'dueDate' as const, label: 'Vence' },
]

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

function longDate(date: Date): string {
  return `${date.getDate()} de ${MONTH_FULL[date.getMonth()]} de ${date.getFullYear()}`
}

export async function buildReportPdf(data: ReportData): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h])
  let y = PAGE.h - MARGIN

  const draw = (s: string, x: number, size: number, f: PDFFont = font, color: RGB = TEXT) =>
    page.drawText(s, { x, y, size, font: f, color })

  const drawCentered = (s: string, centerX: number, size: number, f: PDFFont, color: RGB) =>
    page.drawText(s, { x: centerX - f.widthOfTextAtSize(s, size) / 2, y, size, font: f, color })

  // Los símbolos ✓/○ no existen en WinAnsi (la codificación de las fuentes
  // estándar de pdf-lib) — se dibujan como formas vectoriales en su lugar.
  const drawCheck = (x: number, yBaseline: number, color: RGB) => {
    page.drawLine({ start: { x, y: yBaseline + 1.5 }, end: { x: x + 2.5, y: yBaseline - 1 }, thickness: 1.3, color })
    page.drawLine({ start: { x: x + 2.5, y: yBaseline - 1 }, end: { x: x + 6.5, y: yBaseline + 4.5 }, thickness: 1.3, color })
  }
  const drawOpenCircle = (cx: number, cy: number, r: number, color: RGB) =>
    page.drawCircle({ x: cx, y: cy, size: r, borderColor: color, borderWidth: 1.1 })

  const truncate = (s: string, f: PDFFont, size: number, maxW: number): string => {
    if (f.widthOfTextAtSize(s, size) <= maxW) return s
    let out = s
    while (out.length > 1 && f.widthOfTextAtSize(out + '…', size) > maxW) out = out.slice(0, -1)
    return out + '…'
  }

  const wrap = (s: string, f: PDFFont, size: number, maxW: number): string[] => {
    const words = s.split(/\s+/)
    const lines: string[] = []
    let line = ''
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (line && f.widthOfTextAtSize(test, size) > maxW) {
        lines.push(line)
        line = w
      } else {
        line = test
      }
    }
    if (line) lines.push(line)
    return lines
  }

  const fillBg = () => page.drawRectangle({ x: 0, y: 0, width: PAGE.w, height: PAGE.h, color: BG })

  const newPage = (continued: boolean) => {
    page = doc.addPage([PAGE.w, PAGE.h])
    fillBg()
    y = PAGE.h - MARGIN
    if (continued) {
      draw('Wipli · Reporte de avance (continuación)', MARGIN, 9, font, TEXT2)
      y -= 24
    }
  }
  const ensure = (space: number): boolean => {
    if (y - space < MARGIN) {
      newPage(true)
      return true
    }
    return false
  }

  // ── Header de marca (solo primera página) ──
  fillBg()
  page.drawRectangle({ x: 0, y: PAGE.h - HEADER_H, width: PAGE.w, height: HEADER_H, color: DARK })
  y = PAGE.h - HEADER_H / 2 + 5
  draw('Wip', MARGIN, 17, bold, rgb(1, 1, 1))
  page.drawText('li', { x: MARGIN + bold.widthOfTextAtSize('Wip', 17), y, size: 17, font: bold, color: LIME })

  const badgeCx = PAGE.w - MARGIN - 30
  const badgeCy = PAGE.h - HEADER_H / 2
  page.drawCircle({ x: badgeCx, y: badgeCy, size: 30, color: LIME })
  const pctLabel = `${data.totals.completionRate}%`
  y = badgeCy + 3
  drawCentered(pctLabel, badgeCx, 14, bold, DARK)
  y = badgeCy - 11
  drawCentered('AVANCE', badgeCx, 7, bold, DARK)

  // ── Título ──
  const title = data.scopeLabel.replace(/^(Empresa|Proyecto):\s*/, '')
  y = PAGE.h - HEADER_H - 30
  draw('REPORTE DE AVANCE', MARGIN, 9, bold, LIME_TEXT)
  y -= 24
  draw(truncate(title, bold, 22, PAGE.w - 2 * MARGIN), MARGIN, 22, bold, DARK)
  y -= 20
  draw(`${data.start} — ${data.end}`, MARGIN, 11, font, TEXT2)
  y -= 26

  // ── Métricas (3 tarjetas) ──
  const metricW = (PAGE.w - 2 * MARGIN - 2 * 8) / 3
  const metricH = 50
  const metrics: { label: string; value: string; color: RGB }[] = [
    { label: 'Total', value: String(data.totals.total), color: DARK },
    { label: 'Completadas', value: String(data.totals.done), color: DONE_GREEN },
    { label: 'Pendientes', value: String(data.totals.pending), color: data.totals.pending > 0 ? AMBER : TEXT2 },
  ]
  const metricsTopY = y
  metrics.forEach((m, i) => {
    const mx = MARGIN + i * (metricW + 8)
    page.drawRectangle({ x: mx, y: metricsTopY - metricH, width: metricW, height: metricH, color: SURFACE, borderColor: BORDER, borderWidth: 1 })
    y = metricsTopY - 22
    drawCentered(m.value, mx + metricW / 2, 18, bold, m.color)
    y = metricsTopY - 38
    drawCentered(m.label, mx + metricW / 2, 8, font, TEXT2)
  })
  y = metricsTopY - metricH - 20

  // ── Tarjeta con gráfica de barras horizontales ──
  const barCard = (cardTitle: string, items: { label: string; value: string; pct: number; color: RGB }[]) => {
    if (items.length === 0) return
    const rowH = 20
    const headerH = 22
    const height = PAD * 2 + headerH + items.length * rowH
    ensure(height + 16)
    const topY = y
    page.drawRectangle({ x: MARGIN, y: topY - height, width: PAGE.w - 2 * MARGIN, height, color: SURFACE, borderColor: BORDER, borderWidth: 1 })
    y = topY - PAD
    draw(cardTitle, MARGIN + PAD, 12, bold, DARK)
    y -= headerH
    const labelW = 160
    const barX = MARGIN + PAD + labelW + 8
    const barMaxW = PAGE.w - 2 * MARGIN - 2 * PAD - labelW - 8 - 70
    const valueX = barX + barMaxW + 8
    for (const it of items) {
      draw(truncate(it.label, font, 9, labelW), MARGIN + PAD, 9, font, TEXT)
      page.drawRectangle({ x: barX, y: y - 1, width: barMaxW, height: 8, color: TRACK })
      const w = Math.max(1, Math.round(barMaxW * Math.min(1, Math.max(0, it.pct / 100))))
      page.drawRectangle({ x: barX, y: y - 1, width: w, height: 8, color: it.color })
      draw(it.value, valueX, 8, font, TEXT2)
      y -= rowH
    }
    y = topY - height - 16
  }

  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count))
  barCard(
    'Tareas por estado',
    data.byStatus.map((s) => ({ label: s.label, value: String(s.count), pct: (s.count / maxStatus) * 100, color: hexToRgb(s.color) }))
  )
  barCard(
    'Avance por proyecto',
    data.byProject.slice(0, 15).map((p) => ({
      label: p.name,
      value: `${p.done}/${p.total} · ${Math.round((p.done / (p.total || 1)) * 100)}%`,
      pct: (p.done / (p.total || 1)) * 100,
      color: hexToRgb(p.color),
    }))
  )

  // ── Detalle de tareas (con desglose de checklist) ──
  ensure(50)
  draw('Detalle de tareas', MARGIN, 13, bold, DARK)
  y -= 20

  const drawTableHeader = () => {
    for (const c of COLUMNS) draw(c.label, c.x, 9, bold, TEXT2)
    y -= 6
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.w - MARGIN, y }, thickness: 0.5, color: BORDER })
    y -= 14
  }
  drawTableHeader()

  for (const t of data.tasks) {
    const checklistLines = t.checklist.length ? 1 + t.checklist.length : 0
    const blockHeight = 18 + (checklistLines ? 8 + checklistLines * 12 + 6 : 0)
    if (ensure(blockHeight)) drawTableHeader()

    const isDone = t.statusColor === STATUS_HEX.done
    const pillColor = hexToRgb(t.statusColor)
    const iconGap = isDone ? 12 : 0
    const pillLabel = truncate(t.statusLabel, bold, 9, COLUMNS[2].w - 16 - iconGap)
    const pillW = Math.min(COLUMNS[2].w, bold.widthOfTextAtSize(pillLabel, 9) + 16 + iconGap)
    page.drawRectangle({ x: COLUMNS[2].x, y: y - 4, width: pillW, height: 15, color: pillColor, opacity: 0.14 })
    draw(truncate(t.title, font, 9, COLUMNS[0].w), COLUMNS[0].x, 9, font, TEXT)
    draw(truncate(t.projectName, font, 9, COLUMNS[1].w), COLUMNS[1].x, 9, font, TEXT2)
    if (isDone) drawCheck(COLUMNS[2].x + 7, y, pillColor)
    page.drawText(pillLabel, { x: COLUMNS[2].x + 6 + iconGap, y, size: 9, font: bold, color: pillColor })
    draw(t.dueDate, COLUMNS[3].x, 9, font, TEXT2)
    y -= 16
    page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE.w - MARGIN, y: y + 2 }, thickness: 0.5, color: BORDER })

    if (t.checklist.length) {
      const done = t.checklist.filter((c) => c.done).length
      y -= 8
      draw(`CHECKLIST · ${done}/${t.checklist.length}`, MARGIN + 10, 8, bold, TEXT2)
      y -= 12
      for (const c of t.checklist) {
        if (c.done) drawCheck(MARGIN + 10, y, DONE_GREEN)
        else drawOpenCircle(MARGIN + 13, y + 3, 3, PENDING_GRAY)
        const suffix = c.assignee ? ` · ${c.assignee}` : ''
        draw(truncate(c.text, font, 9, 380) + suffix, MARGIN + 22, 9, font, c.done ? TEXT2 : TEXT)
        y -= 12
      }
      y -= 6
    }
  }
  if (data.tasks.length === 0) {
    draw('Sin tareas en el periodo seleccionado.', MARGIN, 10, font, TEXT2)
    y -= 20
  }

  // ── Caja de cierre ──
  const { total, done, pending } = data.totals
  let calloutTitle: string
  let calloutDesc: string
  if (total === 0) {
    calloutTitle = 'Sin tareas en este periodo.'
    calloutDesc = 'No se registraron tareas dentro del rango seleccionado.'
  } else if (pending === 0) {
    calloutTitle = 'Periodo cerrado al 100%.'
    calloutDesc = `Las ${done} tarea${done === 1 ? '' : 's'} del periodo quedaron publicadas y terminadas. Sin pendientes arrastrados al siguiente ciclo.`
  } else {
    calloutTitle = `Periodo en curso: ${data.totals.completionRate}% completado.`
    calloutDesc = `Quedan ${pending} tarea${pending === 1 ? '' : 's'} pendiente${pending === 1 ? '' : 's'} de este periodo. Revisa el detalle para ponerte al día.`
  }
  const descLines = wrap(calloutDesc, font, 10, PAGE.w - 2 * MARGIN - 2 * PAD)
  const calloutHeight = PAD * 2 + 16 + descLines.length * 14
  const FOOTER_H = 30 // espacio del pie que debe caber en la misma página que la caja de cierre
  ensure(calloutHeight + 20 + FOOTER_H)
  const calloutTopY = y - 10
  page.drawRectangle({ x: MARGIN, y: calloutTopY - calloutHeight, width: PAGE.w - 2 * MARGIN, height: calloutHeight, color: DARK })
  y = calloutTopY - PAD
  draw(calloutTitle, MARGIN + PAD, 12, bold, rgb(1, 1, 1))
  y -= 18
  for (const line of descLines) {
    draw(line, MARGIN + PAD, 10, font, rgb(0.682, 0.71, 0.686))
    y -= 14
  }
  y = calloutTopY - calloutHeight - 20

  // ── Pie de página ──
  page.drawLine({ start: { x: MARGIN, y: y + 10 }, end: { x: PAGE.w - MARGIN, y: y + 10 }, thickness: 0.5, color: BORDER })
  draw('Wipli', MARGIN, 10, bold, DARK)
  const footerRight = `Generado por ${data.generatedBy} el ${longDate(new Date())} · wiplitask.com`
  page.drawText(footerRight, { x: PAGE.w - MARGIN - font.widthOfTextAtSize(footerRight, 9), y, size: 9, font, color: TEXT2 })

  const bytes = await doc.save()
  return Buffer.from(bytes)
}
