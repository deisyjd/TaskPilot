import ExcelJS from 'exceljs'
import { ReportData } from './reportData'

export async function buildReportExcel(data: ReportData): Promise<Buffer> {
  const wb = new ExcelJS.Workbook()
  wb.creator = 'Wipli'

  const resumen = wb.addWorksheet('Resumen')
  resumen.columns = [{ width: 26 }, { width: 42 }]
  resumen.addRow(['Reporte de avance', '']).font = { bold: true, size: 14 }
  resumen.addRow(['Empresa', data.companyName])
  resumen.addRow(['Proyecto', data.projectName ?? 'Todos'])
  resumen.addRow(['Periodo', `${data.start} a ${data.end}`])
  resumen.addRow(['Generado por', data.generatedBy])
  resumen.addRow([])
  resumen.addRow(['Total de tareas', data.totals.total])
  resumen.addRow(['Completadas', data.totals.done])
  resumen.addRow(['Pendientes', data.totals.pending])
  resumen.addRow(['Avance', `${data.totals.completionRate}%`])

  if (data.byProject.length > 1) {
    resumen.addRow([])
    resumen.addRow(['Por proyecto', 'Completadas / Total']).font = { bold: true }
    data.byProject.forEach((p) => resumen.addRow([p.name, `${p.done} / ${p.total}`]))
  }
  if (data.byAssignee.length > 0) {
    resumen.addRow([])
    resumen.addRow(['Por responsable', 'Completadas / Total']).font = { bold: true }
    data.byAssignee.forEach((a) => resumen.addRow([a.name, `${a.done} / ${a.total}`]))
  }

  const tareas = wb.addWorksheet('Tareas')
  tareas.columns = [
    { header: 'Proyecto', key: 'projectName', width: 24 },
    { header: 'Título', key: 'title', width: 44 },
    { header: 'Estado', key: 'statusLabel', width: 22 },
    { header: 'Prioridad', key: 'priorityLabel', width: 14 },
    { header: 'Vence', key: 'dueDate', width: 14 },
    { header: 'Responsables', key: 'assignees', width: 30 },
  ]
  tareas.getRow(1).font = { bold: true }
  data.tasks.forEach((t) => tareas.addRow(t))

  const buf = await wb.xlsx.writeBuffer()
  return Buffer.from(buf as ArrayBuffer)
}
