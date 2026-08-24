import { PDFDocument, PDFFont, PDFImage, PDFPage, RGB, StandardFonts, rgb } from 'pdf-lib'
import { readFile } from 'fs/promises'
import path from 'path'
import { ReportData, STATUS_HEX } from './reportData'
import { uploadsDir } from '@/lib/uploads'

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

// Las fuentes estándar de pdf-lib (Helvetica…) usan codificación WinAnsi: solo
// pueden dibujar Latin-1 + los 27 caracteres "especiales" de CP1252 (comillas
// tipográficas, guiones em/en, «…», viñeta, €, ™…). Cualquier otro carácter que
// un usuario haya metido en un título/nombre (flechas como ↔, emojis, CJK…)
// hace que pdf-lib lance al medir o dibujar el texto y tumba TODO el reporte.
// Se saneja el texto en los puntos de entrada: se conserva el español intacto y
// se aproxima o descarta lo no representable.
const CP1252_EXTRA = new Set<number>([
  0x20ac, 0x201a, 0x0192, 0x201e, 0x2026, 0x2020, 0x2021, 0x02c6, 0x2030,
  0x0160, 0x2039, 0x0152, 0x017d, 0x2018, 0x2019, 0x201c, 0x201d, 0x2022,
  0x2013, 0x2014, 0x02dc, 0x2122, 0x0161, 0x203a, 0x0153, 0x017e, 0x0178,
])

// Aproximaciones ASCII para símbolos frecuentes fuera de WinAnsi.
const APPROX: Record<string, string> = {
  '↔': '-', '→': '->', '←': '<-', '↑': '^', '↓': 'v', '⟶': '->', '⇒': '=>',
  '✓': '', '✔': '', '✗': 'x', '✘': 'x', '★': '*', '☆': '*', '•': '•',
}

function toWinAnsi(s: string): string {
  let out = ''
  for (const ch of s) {
    const cp = ch.codePointAt(0)!
    if ((cp >= 0x20 && cp <= 0x7e) || (cp >= 0xa0 && cp <= 0xff) || CP1252_EXTRA.has(cp)) {
      out += ch
    } else if (APPROX[ch] !== undefined) {
      out += APPROX[ch]
    }
    // else: carácter no representable (emoji, CJK, símbolo raro) → se descarta.
  }
  return out
}

function longDate(date: Date): string {
  return `${date.getDate()} de ${MONTH_FULL[date.getMonth()]} de ${date.getFullYear()}`
}

// El logo de un proyecto se guarda en disco vía /api/uploads/<archivo> — se
// lee directo del volumen de uploads (mismo proceso) en vez de pedirlo por
// HTTP. Solo soporta PNG/JPG (lo único que pdf-lib puede embeber); otros
// formatos (webp, gif) simplemente no se dibujan.
async function loadProjectLogo(doc: PDFDocument, logoUrl: string | null): Promise<PDFImage | null> {
  if (!logoUrl || !logoUrl.startsWith('/api/uploads/')) return null
  try {
    const key = logoUrl.slice('/api/uploads/'.length)
    const bytes = await readFile(path.join(uploadsDir(), key))
    const ext = path.extname(key).toLowerCase()
    if (ext === '.png') return await doc.embedPng(bytes)
    if (ext === '.jpg' || ext === '.jpeg') return await doc.embedJpg(bytes)
    return null
  } catch {
    return null
  }
}

export async function buildReportPdf(data: ReportData): Promise<Buffer> {
  const doc = await PDFDocument.create()
  const font = await doc.embedFont(StandardFonts.Helvetica)
  const bold = await doc.embedFont(StandardFonts.HelveticaBold)

  let page: PDFPage = doc.addPage([PAGE.w, PAGE.h])
  let y = PAGE.h - MARGIN

  const draw = (s: string, x: number, size: number, f: PDFFont = font, color: RGB = TEXT) =>
    page.drawText(toWinAnsi(s), { x, y, size, font: f, color })

  const drawCentered = (s: string, centerX: number, size: number, f: PDFFont, color: RGB) => {
    const t = toWinAnsi(s)
    page.drawText(t, { x: centerX - f.widthOfTextAtSize(t, size) / 2, y, size, font: f, color })
  }

  // Los símbolos ✓/○ no existen en WinAnsi (la codificación de las fuentes
  // estándar de pdf-lib) — se dibujan como formas vectoriales en su lugar.
  const drawCheck = (x: number, yBaseline: number, color: RGB) => {
    page.drawLine({ start: { x, y: yBaseline + 1.5 }, end: { x: x + 2.5, y: yBaseline - 1 }, thickness: 1.3, color })
    page.drawLine({ start: { x: x + 2.5, y: yBaseline - 1 }, end: { x: x + 6.5, y: yBaseline + 4.5 }, thickness: 1.3, color })
  }
  const drawOpenCircle = (cx: number, cy: number, r: number, color: RGB) =>
    page.drawCircle({ x: cx, y: cy, size: r, borderColor: color, borderWidth: 1.1 })

  // Píldora de estado (fondo tintado + texto en negrita del mismo color, con
  // checkmark si es un estado "completado") — la usan tanto la columna Estado
  // de la tabla de tareas como los ítems del checklist ya marcados, para que
  // una subtarea completada se vea igual que una tarea completada (sin tachar
  // el texto). Devuelve el ancho dibujado.
  const drawPill = (x: number, label: string, color: RGB, withCheck: boolean, maxW = 200): number => {
    const iconGap = withCheck ? 12 : 0
    const pillLabel = truncate(label, bold, 9, maxW - 16 - iconGap)
    const pillW = Math.min(maxW, bold.widthOfTextAtSize(pillLabel, 9) + 16 + iconGap)
    page.drawRectangle({ x, y: y - 4, width: pillW, height: 15, color, opacity: 0.14 })
    if (withCheck) drawCheck(x + 7, y, color)
    page.drawText(pillLabel, { x: x + 6 + iconGap, y, size: 9, font: bold, color })
    return pillW
  }

  const truncate = (raw: string, f: PDFFont, size: number, maxW: number): string => {
    const s = toWinAnsi(raw)
    if (f.widthOfTextAtSize(s, size) <= maxW) return s
    let out = s
    while (out.length > 1 && f.widthOfTextAtSize(out + '…', size) > maxW) out = out.slice(0, -1)
    return out + '…'
  }

  const wrap = (raw: string, f: PDFFont, size: number, maxW: number): string[] => {
    const s = toWinAnsi(raw)
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

  // Logos de proyecto: se embeben una sola vez por proyecto y se reutilizan
  // tanto en el título (si el reporte es de un solo proyecto) como en las
  // filas de "Avance por proyecto".
  const projectLogos = new Map<string, PDFImage>()
  for (const p of data.byProject) {
    const img = await loadProjectLogo(doc, p.logoUrl)
    if (img) projectLogos.set(p.name, img)
  }

  // ── Título ──
  const title = data.scopeLabel.replace(/^(Empresa|Proyecto):\s*/, '')
  const isSingleProjectScope = /^Proyecto:\s*/.test(data.scopeLabel)
  const titleLogo = isSingleProjectScope ? projectLogos.get(title) : undefined
  const titleLogoW = titleLogo ? 26 : 0
  y = PAGE.h - HEADER_H - 30
  draw('REPORTE DE AVANCE', MARGIN, 9, bold, LIME_TEXT)
  y -= 24
  if (titleLogo) {
    page.drawImage(titleLogo, { x: MARGIN, y: y - 6, width: 26, height: 26 })
  }
  draw(truncate(title, bold, 22, PAGE.w - 2 * MARGIN - titleLogoW - 10), MARGIN + titleLogoW + (titleLogo ? 10 : 0), 22, bold, DARK)
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
  const barCard = (cardTitle: string, items: { label: string; value: string; pct: number; color: RGB; logo?: PDFImage }[]) => {
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
      const logoW = it.logo ? 14 : 0
      if (it.logo) page.drawImage(it.logo, { x: MARGIN + PAD, y: y - 3, width: 12, height: 12 })
      draw(truncate(it.label, font, 9, labelW - logoW), MARGIN + PAD + logoW, 9, font, TEXT)
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
      logo: projectLogos.get(p.name),
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
    const blockHeight = 18 + (checklistLines ? 8 + checklistLines * 14 + 6 : 0)
    if (ensure(blockHeight)) drawTableHeader()

    const isDone = t.statusColor === STATUS_HEX.done
    const pillColor = hexToRgb(t.statusColor)
    draw(truncate(t.title, font, 9, COLUMNS[0].w), COLUMNS[0].x, 9, font, TEXT)
    draw(truncate(t.projectName, font, 9, COLUMNS[1].w), COLUMNS[1].x, 9, font, TEXT2)
    drawPill(COLUMNS[2].x, t.statusLabel, pillColor, isDone, COLUMNS[2].w)
    draw(t.dueDate, COLUMNS[3].x, 9, font, TEXT2)
    y -= 16
    page.drawLine({ start: { x: MARGIN, y: y + 2 }, end: { x: PAGE.w - MARGIN, y: y + 2 }, thickness: 0.5, color: BORDER })

    if (t.checklist.length) {
      const done = t.checklist.filter((c) => c.done).length
      y -= 8
      draw(`CHECKLIST · ${done}/${t.checklist.length}`, MARGIN + 10, 8, bold, TEXT2)
      y -= 14
      for (const c of t.checklist) {
        const dateColX = COLUMNS[3].x
        let textX = MARGIN + 22
        if (c.done) {
          const pillW = drawPill(MARGIN + 10, 'Completado', DONE_GREEN, true, 100)
          textX = MARGIN + 10 + pillW + 8
        } else {
          drawOpenCircle(MARGIN + 13, y + 3, 3, PENDING_GRAY)
        }
        const suffix = c.assignee ? ` · ${c.assignee}` : ''
        draw(truncate(c.text, font, 9, dateColX - 20 - textX) + suffix, textX, 9, font, c.done ? TEXT2 : TEXT)
        if (c.dueDate) draw(c.dueDate, dateColX, 9, font, TEXT2)
        y -= 14
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
  const footerRight = toWinAnsi(`Generado por ${data.generatedBy} el ${longDate(new Date())} · wiplitask.com`)
  page.drawText(footerRight, { x: PAGE.w - MARGIN - font.widthOfTextAtSize(footerRight, 9), y, size: 9, font, color: TEXT2 })

  const bytes = await doc.save()
  return Buffer.from(bytes)
}
