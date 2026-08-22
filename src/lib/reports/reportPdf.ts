import { PDFDocument, PDFFont, PDFPage, StandardFonts, rgb } from 'pdf-lib'
import { ReportData } from './reportData'

const PAGE = { w: 595.28, h: 841.89 } // A4 en puntos
const MARGIN = 40
const DARK = rgb(0.067, 0.086, 0.11)
const GRAY = rgb(0.42, 0.45, 0.5)

const COLUMNS = [
  { x: MARGIN, w: 235, key: 'title' as const, label: 'Título' },
  { x: MARGIN + 240, w: 110, key: 'projectName' as const, label: 'Proyecto' },
  { x: MARGIN + 355, w: 95, key: 'statusLabel' as const, label: 'Estado' },
  { x: MARGIN + 455, w: 60, key: 'dueDate' as const, label: 'Vence' },
]

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

  const drawTableHeader = () => {
    for (const c of COLUMNS) draw(c.label, c.x, 9, bold, GRAY)
    y -= 6
    page.drawLine({ start: { x: MARGIN, y }, end: { x: PAGE.w - MARGIN, y }, thickness: 0.5, color: GRAY })
    y -= 14
  }

  // Encabezado
  draw('Reporte de avance', MARGIN, 20, bold)
  y -= 26
  draw(data.projectName ? `Proyecto: ${data.projectName}` : `Empresa: ${data.companyName}`, MARGIN, 12, font, GRAY)
  y -= 16
  draw(`Periodo: ${data.start} a ${data.end}`, MARGIN, 11, font, GRAY)
  y -= 26

  // Métricas
  draw(`Total: ${data.totals.total}    Completadas: ${data.totals.done}    Pendientes: ${data.totals.pending}    Avance: ${data.totals.completionRate}%`, MARGIN, 12, bold)
  y -= 28

  // Tabla de tareas
  drawTableHeader()
  for (const t of data.tasks) {
    if (y - 16 < MARGIN) {
      newPage()
      drawTableHeader()
    }
    for (const c of COLUMNS) {
      draw(truncate(String(t[c.key] ?? ''), font, 9, c.w), c.x, 9, font, DARK)
    }
    y -= 16
  }

  if (data.tasks.length === 0) {
    draw('Sin tareas en el periodo seleccionado.', MARGIN, 10, font, GRAY)
  }

  const bytes = await doc.save()
  return Buffer.from(bytes)
}
