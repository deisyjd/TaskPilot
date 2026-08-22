import { PDFDocument, PDFFont, PDFPage, RGB, StandardFonts, rgb } from 'pdf-lib'
import { ReportData } from './reportData'

const PAGE = { w: 595.28, h: 841.89 } // A4 en puntos
const MARGIN = 40
const DARK = rgb(0.067, 0.086, 0.11)
const GRAY = rgb(0.42, 0.45, 0.5)
const TRACK = rgb(0.933, 0.953, 0.929)
const LIME = rgb(0.686, 0.816, 0.208) // #AFD035, versión sólida del lime para contraste

const COLUMNS = [
  { x: MARGIN, w: 235, key: 'title' as const, label: 'Título' },
  { x: MARGIN + 240, w: 110, key: 'projectName' as const, label: 'Proyecto' },
  { x: MARGIN + 355, w: 95, key: 'statusLabel' as const, label: 'Estado' },
  { x: MARGIN + 455, w: 60, key: 'dueDate' as const, label: 'Vence' },
]

function hexToRgb(hex: string): RGB {
  const h = hex.replace('#', '')
  const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h
  const n = parseInt(full, 16)
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255)
}

export async function buildReportPdf(data: ReportData): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h])
  let y = PAGE.h - MARGIN

  const draw = (s: string, x: number, size: number, f: PDFFont = font, color = DARK) =>
    page.drawText(s, { x, y, size, font: f, color })

  const truncate = (s: string, f: PDFFont, size: number, maxW: number): string => {
    if (f.widthOfTextAtSize(s, size) <= maxW) return s
    let out = s
    while (out.length > 1 && f.widthOfTextAtSize(out + '…', size) > maxW) out = out.slice(0, -1)
    return out + '…'
  }

  const newPage = () => {
    page = doc.addPage([PAGE.w, PAGE.h])
    y = PAGE.h - MARGIN
  }
  const ensure = (space: number) => {
    if (y - space < MARGIN) newPage()
  }

  // ── Gráfica de barras horizontales ──
  const barChart = (title: string, items: { label: string; value: string; pct: number; color: RGB }[]) => {
    if (items.length === 0) return
    ensure(30)
    draw(title, MARGIN, 12, bold)
    y -= 18
    const labelW = 130
    const barX = MARGIN + labelW + 8
    const barMaxW = 300
    const valueX = barX + barMaxW + 8
    for (const it of items) {
      ensure(20)
      draw(truncate(it.label, font, 9, labelW), MARGIN, 9, font, DARK)
      page.drawRectangle({ x: barX, y: y - 1, width: barMaxW, height: 8, color: TRACK })
      const w = Math.max(1, Math.round(barMaxW * Math.min(1, Math.max(0, it.pct / 100))))
      page.drawRectangle({ x: barX, y: y - 1, width: w, height: 8, color: it.color })
      draw(it.value, valueX, 8, font, GRAY)
      y -= 20
    }
    y -= 8
  }

  const drawTableHeader = () => {
    for (const c of COLUMNS) draw(c.label, c.x, 9, bold, GRAY)
    y -= 6
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.w - MARGIN, y }, thickness: 0.5, color: GRAY })
    y -= 14
  }

  // ── Encabezado ──
  draw('Reporte de avance', MARGIN, 20, bold)
  y -= 26
  draw(data.scopeLabel, MARGIN, 12, font, GRAY)
  y -= 16
  draw(`Periodo: ${data.start} a ${data.end}`, MARGIN, 11, font, GRAY)
  y -= 26

  // ── Métricas ──
  draw(`Total: ${data.totals.total}    Completadas: ${data.totals.done}    Pendientes: ${data.totals.pending}    Avance: ${data.totals.completionRate}%`, MARGIN, 12, bold)
  y -= 24

  // Avance general
  barChart('Avance general', [{ label: 'Completado', value: `${data.totals.completionRate}%`, pct: data.totals.completionRate, color: LIME }])

  // Por estado
  const maxStatus = Math.max(1, ...data.byStatus.map((s) => s.count))
  barChart(
    'Tareas por estado',
    data.byStatus.map((s) => ({ label: s.label, value: String(s.count), pct: (s.count / maxStatus) * 100, color: hexToRgb(s.color) }))
  )

  // Por proyecto
  barChart(
    'Avance por proyecto',
    data.byProject.slice(0, 15).map((p) => ({
      label: p.name,
      value: `${p.done}/${p.total} · ${Math.round((p.done / (p.total || 1)) * 100)}%`,
      pct: (p.done / (p.total || 1)) * 100,
      color: hexToRgb(p.color),
    }))
  )

  // ── Tabla de tareas ──
  ensure(40)
  draw('Detalle de tareas', MARGIN, 12, bold)
  y -= 18
  drawTableHeader()
  for (const t of data.tasks) {
    if (y - 16 < MARGIN) {
      newPage()
      drawTableHeader()
    }
    for (const c of COLUMNS) draw(truncate(String(t[c.key] ?? ''), font, 9, c.w), c.x, 9, font, DARK)
    y -= 16
  }
  if (data.tasks.length === 0) draw('Sin tareas en el periodo seleccionado.', MARGIN, 10, font, GRAY)

  const bytes = await doc.save()
  return Buffer.from(bytes)
}
