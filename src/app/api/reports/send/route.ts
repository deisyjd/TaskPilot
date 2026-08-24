import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getSession } from '@/lib/auth'
import { sendMail } from '@/lib/mailer'
import { buildReportData } from '@/lib/reports/reportData'
import { renderReportEmail } from '@/lib/reports/reportEmail'
import { buildReportExcel } from '@/lib/reports/reportExcel'
import { buildReportPdf } from '@/lib/reports/reportPdf'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

function parseEmails(input: unknown): string[] {
  const raw = Array.isArray(input) ? input.join(',') : String(input ?? '')
  return [...new Set(raw.split(/[,;\s]+/).map((e) => e.trim()).filter(Boolean))]
}

function slug(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '') // quita diacríticos
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '') || 'reporte'
}

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'No autenticado' }, { status: 401 })

  if (!process.env.SMTP_HOST) {
    return NextResponse.json({ error: 'El correo no está configurado en el servidor (SMTP).' }, { status: 503 })
  }

  const body = await req.json().catch(() => ({}))
  const scope = body.scope === 'project' ? 'project' : 'company'
  const start = String(body.start ?? '')
  const end = String(body.end ?? '')
  const emails = parseEmails(body.emails)
  const formats: string[] = Array.isArray(body.formats) ? body.formats : ['mailing']

  if (!DATE_RE.test(start) || !DATE_RE.test(end)) {
    return NextResponse.json({ error: 'Rango de fechas inválido (usa YYYY-MM-DD).' }, { status: 400 })
  }
  if (start > end) {
    return NextResponse.json({ error: 'La fecha inicial no puede ser mayor que la final.' }, { status: 400 })
  }
  if (emails.length === 0 || emails.some((e) => !EMAIL_RE.test(e))) {
    return NextResponse.json({ error: 'Ingresa al menos un correo válido.' }, { status: 400 })
  }

  const company = await prisma.company.findUnique({ where: { id: session.activeCompanyId }, select: { name: true } })
  if (!company) return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })

  // Determina los proyectos del reporte y una etiqueta de alcance.
  //  - scope 'project'  → un proyecto (projectId).
  //  - scope 'company'  → projectIds[] elegidos, o todos (null) si no eligió.
  let projectIds: string[] | null = null
  let scopeLabel = `Empresa: ${company.name} (todos los proyectos)`
  let slugBase = company.name

  const requestedIds: string[] = Array.isArray(body.projectIds)
    ? body.projectIds.map((x: unknown) => String(x))
    : scope === 'project' && body.projectId
      ? [String(body.projectId)]
      : []

  if (requestedIds.length > 0) {
    const projects = await prisma.project.findMany({
      where: { id: { in: requestedIds }, companyId: session.activeCompanyId },
      select: { id: true, name: true },
    })
    if (projects.length === 0) return NextResponse.json({ error: 'Proyecto(s) no encontrado(s)' }, { status: 404 })
    projectIds = projects.map((p) => p.id)
    if (projects.length === 1) {
      scopeLabel = `Proyecto: ${projects[0].name}`
      slugBase = projects[0].name
    } else {
      scopeLabel = `${company.name} · ${projects.length} proyectos`
      slugBase = `${company.name}-${projects.length}-proyectos`
    }
  }

  const actor = await prisma.user.findUnique({ where: { id: session.userId }, select: { name: true } })

  const data = await buildReportData({
    userId: session.userId,
    userRole: session.userRole,
    companyId: session.activeCompanyId,
    companyName: company.name,
    projectIds,
    scopeLabel,
    start,
    end,
    generatedBy: actor?.name ?? session.email,
  })

  const base = `reporte-${slug(slugBase)}-${start}_a_${end}`
  const attachments: { filename: string; content: Buffer; contentType?: string }[] = []
  try {
    if (formats.includes('pdf')) {
      attachments.push({ filename: `${base}.pdf`, content: await buildReportPdf(data), contentType: 'application/pdf' })
    }
    if (formats.includes('excel')) {
      attachments.push({
        filename: `${base}.xlsx`,
        content: await buildReportExcel(data),
        contentType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      })
    }
  } catch (err) {
    // Antes la generación del adjunto estaba FUERA de try/catch: cualquier fallo
    // (p. ej. un carácter no soportado por la fuente del PDF) tumbaba la ruta con
    // un 500 opaco y sin enviar nada. Ahora devuelve un error claro y queda en
    // logs, en vez de un correo que nunca llega sin explicación.
    console.error('[reports] error generando adjunto (PDF/Excel):', err)
    return NextResponse.json(
      { error: 'No se pudo generar el archivo del reporte. Revisa los logs del servidor.' },
      { status: 500 },
    )
  }

  const full = formats.includes('mailing')
  const appUrl = process.env.APP_URL?.replace(/\/+$/, '') ?? ''
  const html = renderReportEmail(data, full, attachments.length > 0, appUrl)
  const subjectScope = data.scopeLabel.replace(/^(Empresa|Proyecto):\s*/, '')

  try {
    await sendMail({
      to: emails,
      subject: `Wipli · Reporte de avance — ${subjectScope} (${start} a ${end})`,
      html,
      attachments,
    })
  } catch (err) {
    console.error('[reports] error enviando:', err)
    return NextResponse.json({ error: 'No se pudo enviar el correo. Revisa la configuración SMTP.' }, { status: 502 })
  }

  return NextResponse.json({ ok: true, sentTo: emails, tasks: data.totals.total })
}
