import { format, parseISO } from 'date-fns'
import { hu } from 'date-fns/locale'
import { ShiftWithAssignee, LeaveRequest } from '@/types'

interface Employee {
  id: string
  full_name: string
  position: string | null
}

export function exportSchedulePDF(
  weekDates: Date[],
  employees: Employee[],
  shifts: ShiftWithAssignee[],
  weekLabel: string,
  approvedLeaves: LeaveRequest[] = []
) {
  const dayHeaders = weekDates.map(d => {
    const dayName = format(d, 'EEE', { locale: hu }).toUpperCase()
    const dayNum = format(d, 'd')
    const isToday = format(d, 'yyyy-MM-dd') === format(new Date(), 'yyyy-MM-dd')
    const numHtml = isToday
      ? `<span class="today-circle">${dayNum}</span>`
      : `<span class="day-num-plain">${dayNum}</span>`
    return `<th><div class="day-name">${dayName}</div>${numHtml}</th>`
  }).join('')

  const rows = employees.map(emp => {
    const initials = emp.full_name.slice(0, 2).toUpperCase()
    const posHtml = emp.position ? `<div class="emp-pos">${emp.position}</div>` : ''
    const empCell = `<td class="emp-cell">
      <div class="emp-row">
        <div class="emp-avatar">${initials}</div>
        <div>
          <div class="emp-name">${emp.full_name}</div>
          ${posHtml}
        </div>
      </div>
    </td>`

    const dayCells = weekDates.map(date => {
      const dateISO = format(date, 'yyyy-MM-dd')

      // Szabadság
      const leave = approvedLeaves.find(
        l => l.user_id === emp.id && l.start_date <= dateISO && l.end_date >= dateISO
      )

      const dayShifts = shifts.filter(
        s => s.user_id === emp.id &&
          s.start_time.slice(0, 10) === dateISO &&
          s.status !== 'cancelled'
      )

      if (dayShifts.length === 0 && !leave) return '<td class="day-cell"></td>'

      const leaveHtml = leave
        ? `<div class="leave-card">🌴 Szabadság</div>`
        : ''

      const shiftCards = dayShifts.map(s => {
        const start = format(parseISO(s.start_time), 'HH:mm')
        const end = format(parseISO(s.end_time), 'HH:mm')
        const isOvernight = s.start_time.slice(0, 10) !== s.end_time.slice(0, 10)
        const notesHtml = s.notes ? `<div class="shift-notes">${s.notes}</div>` : ''
        const badgeLabels: Record<string, string> = {
          published: 'Fixálva',
          draft: 'Szabad',
          swappable: 'Cserélhető',
          cancelled: 'Törölve',
          open: 'Szabad műszak',
        }
        const badgeLabel = badgeLabels[s.status] ?? s.status
        return `<div class="shift-card ${s.status}">
          <div class="shift-time">${start}–${end}${isOvernight ? ' →' : ''}</div>
          ${notesHtml}
          <span class="shift-badge badge-${s.status}">${badgeLabel}</span>
        </div>`
      }).join('')

      return `<td class="day-cell">${leaveHtml}${shiftCards}</td>`
    }).join('')

    return `<tr>${empCell}${dayCells}</tr>`
  }).join('')

  const html = `<!DOCTYPE html>
<html lang="hu">
<head>
  <meta charset="utf-8">
  <title>Beosztás – ${weekLabel}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { font-family: -apple-system, Arial, sans-serif; font-size: 9pt; color: #111; padding: 6mm; background: white; }

    /* Fejléc */
    .page-header { display: flex; align-items: flex-end; justify-content: space-between; margin-bottom: 5mm; padding-bottom: 3mm; border-bottom: 2px solid #1a5c3a; }
    .page-header h1 { font-size: 14pt; color: #1a5c3a; font-weight: 700; letter-spacing: -0.01em; }
    .page-header .week-label { font-size: 8.5pt; color: #6b7280; }

    /* Táblázat */
    table { width: 100%; border-collapse: collapse; table-layout: fixed; border-radius: 8px; overflow: hidden; border: 1px solid #e5e7eb; }
    th, td { border: 1px solid #e5e7eb; }

    /* Fejléc sor */
    thead th { background: #f9fafb; padding: 5px 4px; text-align: center; }
    thead th:first-child { width: 110px; }
    .day-name { font-size: 6.5pt; font-weight: 700; text-transform: uppercase; letter-spacing: 0.06em; color: #9ca3af; }
    .today-circle { display: inline-block; background: #1a5c3a; color: white; width: 20px; height: 20px; border-radius: 50%; text-align: center; line-height: 20px; font-size: 9pt; font-weight: 700; margin-top: 2px; }
    .day-num-plain { display: inline-block; font-size: 11pt; font-weight: 700; color: #1f2937; margin-top: 2px; line-height: 1.2; }

    /* Dolgozó cella */
    td.emp-cell { padding: 5px 6px; background: #fafafa; vertical-align: middle; }
    .emp-row { display: flex; align-items: center; gap: 5px; }
    .emp-avatar { flex-shrink: 0; width: 24px; height: 24px; border-radius: 50%; background: #dcfce7; display: inline-flex; align-items: center; justify-content: center; font-size: 7.5pt; font-weight: 700; color: #1a5c3a; text-transform: uppercase; }
    .emp-name { font-size: 8pt; font-weight: 600; color: #1f2937; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
    .emp-pos { font-size: 6.5pt; color: #9ca3af; margin-top: 1px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }

    /* Nap cella */
    td.day-cell { padding: 3px; vertical-align: top; min-height: 44px; }

    /* Műszak kártya */
    .shift-card { border-radius: 5px; border: 1px solid; padding: 2px 4px; margin: 2px 0; text-align: center; }
    .shift-card.published { background: #f0fdf4; border-color: #86efac; color: #1a5c3a; }
    .shift-card.draft { background: #f9fafb; border-color: #e5e7eb; color: #374151; }
    .shift-card.swappable { background: #fefce8; border-color: #fde68a; color: #92400e; }
    .shift-card.open { background: #eff6ff; border-color: #bfdbfe; color: #1d4ed8; }
    .shift-time { font-weight: 700; font-size: 8pt; display: block; }
    .shift-notes { font-size: 6.5pt; color: inherit; opacity: 0.85; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; display: block; margin-top: 1px; }
    .shift-badge { display: inline-block; margin-top: 2px; padding: 0 3px; font-size: 6pt; font-weight: 700; border-radius: 3px; line-height: 1.6; }
    .badge-published { background: white; border: 1px solid #1a5c3a; color: #1a5c3a; }
    .badge-draft { background: #e5e7eb; color: #4b5563; }
    .badge-swappable { background: #d4a017; color: white; }
    .badge-open { background: #bfdbfe; color: #1d4ed8; }

    /* Szabadság */
    .leave-card { background: #fef9c3; border: 1px solid #fde68a; border-radius: 5px; padding: 3px 4px; font-size: 7pt; color: #92400e; text-align: center; margin: 2px 0; }

    @page { size: A4 landscape; margin: 8mm; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <div class="page-header">
    <h1>ShiftAssist – Heti beosztás</h1>
    <span class="week-label">${weekLabel}</span>
  </div>
  <table>
    <thead><tr><th></th>${dayHeaders}</tr></thead>
    <tbody>${rows}</tbody>
  </table>
</body>
</html>`

  const iframe = document.createElement('iframe')
  iframe.style.cssText = 'position:fixed;width:0;height:0;border:0;top:-9999px;left:-9999px'
  document.body.appendChild(iframe)
  const doc = iframe.contentDocument!
  doc.open()
  doc.write(html)
  doc.close()
  iframe.contentWindow!.focus()
  setTimeout(() => {
    iframe.contentWindow!.print()
    setTimeout(() => document.body.removeChild(iframe), 1000)
  }, 400)
}
