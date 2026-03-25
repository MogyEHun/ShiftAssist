'use client'

import { useState } from 'react'
import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import { hu, enUS } from 'date-fns/locale'
import { X, FileText, Table, Download } from 'lucide-react'
import { getAttendanceData, AttendanceData } from '@/app/actions/reports'
import { useTranslation } from '@/components/providers/LanguageProvider'

interface Props {
  onClose: () => void
}

type Period = 'week' | 'month' | 'custom'
type ExportFormat = 'pdf' | 'excel' | 'csv'

interface ColLabels {
  employee: string
  position: string
  date: string
  clockIn: string
  clockOut: string
  actualStart: string
  actualEnd: string
  breakMinutes: string
  netHours: string
  pay: string
  shifts: string
  totalHours: string
  totalPay: string
  summary: string
  breakUnit: string
  hoursUnit: string
}

export function AttendanceExportModal({ onClose }: Props) {
  const { t, locale } = useTranslation()
  const dfLocale = locale === 'en' ? enUS : hu

  const [period, setPeriod] = useState<Period>('month')
  const [exportFormat, setExportFormat] = useState<ExportFormat>('pdf')
  const [customFrom, setCustomFrom] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [customTo, setCustomTo] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function getRange(): { from: string; to: string } {
    const now = new Date()
    if (period === 'week') {
      return {
        from: format(startOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
        to: format(endOfWeek(now, { weekStartsOn: 1 }), 'yyyy-MM-dd'),
      }
    }
    if (period === 'month') {
      return {
        from: format(startOfMonth(now), 'yyyy-MM-dd'),
        to: format(endOfMonth(now), 'yyyy-MM-dd'),
      }
    }
    return { from: customFrom, to: customTo }
  }

  function getColLabels(): ColLabels {
    return {
      employee: t('attendance.employee'),
      position: t('attendance.position'),
      date: t('attendance.date'),
      clockIn: t('attendance.clockIn'),
      clockOut: t('attendance.clockOut'),
      actualStart: locale === 'en' ? 'Actual Start' : 'Tényleges kezdés',
      actualEnd: locale === 'en' ? 'Actual End' : 'Tényleges befejezés',
      breakMinutes: t('attendance.breakMinutes'),
      netHours: t('attendance.netHours'),
      pay: locale === 'en' ? 'Pay (Ft)' : 'Bér (Ft)',
      shifts: t('attendance.shifts'),
      totalHours: t('attendance.totalHours'),
      totalPay: t('attendance.totalPay'),
      summary: t('attendance.summary'),
      breakUnit: t('attendance.breakUnit'),
      hoursUnit: t('attendance.hoursUnit'),
    }
  }

  async function handleExport() {
    setLoading(true)
    setError(null)
    const { from, to } = getRange()
    const result = await getAttendanceData(from, to)
    setLoading(false)

    if (result.error || !result.data) {
      setError(result.error ?? t('attendance.errorFallback'))
      return
    }

    const cols = getColLabels()
    if (exportFormat === 'pdf') exportPDF(result.data, cols)
    else if (exportFormat === 'excel') exportExcel(result.data, cols)
    else exportCSV(result.data, cols)
  }

  const periodLabel = (p: Period) => {
    if (p === 'week') return t('attendance.week')
    if (p === 'month') return t('attendance.month')
    return t('attendance.custom')
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-md w-full p-6 space-y-5">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-gray-900">{t('attendance.modalTitle')}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-400">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Period */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('attendance.period')}</label>
          <div className="flex rounded-lg border border-gray-200 overflow-hidden text-sm">
            {(['week', 'month', 'custom'] as Period[]).map(p => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`flex-1 px-3 py-2 transition-colors ${period === p ? 'bg-[#1a5c3a] text-white font-medium' : 'text-gray-500 hover:bg-gray-50'}`}
              >
                {periodLabel(p)}
              </button>
            ))}
          </div>

          {period === 'custom' && (
            <div className="flex gap-2 mt-2">
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">{t('attendance.startLabel')}</label>
                <input type="date" value={customFrom} onChange={e => setCustomFrom(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none" />
              </div>
              <div className="flex-1">
                <label className="text-xs text-gray-500 mb-1 block">{t('attendance.endLabel')}</label>
                <input type="date" value={customTo} onChange={e => setCustomTo(e.target.value)}
                  className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:ring-2 focus:ring-[#1a5c3a]/30 focus:border-[#1a5c3a] outline-none" />
              </div>
            </div>
          )}

          {period !== 'custom' && (
            <p className="text-xs text-gray-400 mt-1.5">
              {period === 'week'
                ? format(startOfWeek(new Date(), { weekStartsOn: 1 }), locale === 'en' ? 'MMM d' : 'MMM d.', { locale: dfLocale }) + ' – ' + format(endOfWeek(new Date(), { weekStartsOn: 1 }), locale === 'en' ? 'MMM d' : 'MMM d.', { locale: dfLocale })
                : format(startOfMonth(new Date()), locale === 'en' ? 'MMMM yyyy' : 'yyyy. MMMM', { locale: dfLocale })}
            </p>
          )}
        </div>

        {/* Format */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">{t('attendance.format')}</label>
          <div className="flex gap-2">
            {[
              { id: 'pdf', label: 'PDF', icon: FileText },
              { id: 'excel', label: 'Excel', icon: Table },
              { id: 'csv', label: 'CSV', icon: Table },
            ].map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                onClick={() => setExportFormat(id as ExportFormat)}
                className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg border text-sm transition-colors ${
                  exportFormat === id
                    ? 'border-[#1a5c3a] bg-[#1a5c3a]/5 text-[#1a5c3a] font-medium'
                    : 'border-gray-200 text-gray-500 hover:bg-gray-50'
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>

        {error && (
          <div className="px-3 py-2 bg-red-50 text-red-700 text-sm rounded-lg">{error}</div>
        )}

        <div className="flex gap-3">
          <button onClick={onClose} className="flex-1 px-4 py-2.5 border border-gray-200 text-sm text-gray-600 rounded-lg hover:bg-gray-50 transition-colors">
            {t('attendance.cancel')}
          </button>
          <button
            onClick={handleExport}
            disabled={loading}
            className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#1a5c3a] text-white text-sm font-medium rounded-lg hover:bg-[#15472e] transition-colors disabled:opacity-50"
          >
            <Download className="h-4 w-4" />
            {loading ? t('attendance.generating') : t('attendance.download')}
          </button>
        </div>
      </div>
    </div>
  )
}

// ── PDF export ──────────────────────────────────────────────
function exportPDF(data: AttendanceData, cols: ColLabels) {
  import('jspdf').then(async ({ jsPDF }) => {
    const { default: autoTable } = await import('jspdf-autotable')
    const doc = new jsPDF({ orientation: 'landscape' })

    doc.setFontSize(14)
    doc.text(`${data.companyName} – ${cols.employee}`, 14, 16)
    doc.setFontSize(10)
    doc.text(`${data.from} – ${data.to}`, 14, 23)

    autoTable(doc, {
      startY: 28,
      head: [[cols.employee, cols.position, cols.date, cols.clockIn, cols.clockOut, cols.actualStart, cols.actualEnd, cols.breakMinutes, cols.netHours, cols.pay]],
      body: data.rows.map(r => [
        r.fullName,
        r.position ?? '–',
        r.date,
        r.startTime,
        r.endTime,
        r.actualStart ?? '–',
        r.actualEnd ?? '–',
        `${r.breakMinutes} ${cols.breakUnit}`,
        `${r.netHours} ${cols.hoursUnit}`,
        `${r.pay.toLocaleString('hu-HU')} Ft`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [26, 92, 58] },
    })

    const finalY = (doc as any).lastAutoTable.finalY + 8
    autoTable(doc, {
      startY: finalY,
      head: [[cols.employee, cols.shifts, cols.totalHours, cols.totalPay]],
      body: data.summaries.map(s => [
        s.fullName,
        String(s.shiftCount),
        `${s.totalNetHours} ${cols.hoursUnit}`,
        `${s.totalPay.toLocaleString('hu-HU')} Ft`,
      ]),
      styles: { fontSize: 8 },
      headStyles: { fillColor: [100, 100, 100] },
    })

    doc.save(`jelenleti-iv_${data.from}_${data.to}.pdf`)
  })
}

// ── Excel export ─────────────────────────────────────────────
function exportExcel(data: AttendanceData, cols: ColLabels) {
  import('xlsx').then(({ utils, writeFile }) => {
    const ws = utils.aoa_to_sheet([
      [cols.employee, cols.position, cols.date, cols.clockIn, cols.clockOut, cols.actualStart, cols.actualEnd, cols.breakMinutes, cols.netHours, cols.pay],
      ...data.rows.map(r => [r.fullName, r.position ?? '', r.date, r.startTime, r.endTime, r.actualStart ?? '', r.actualEnd ?? '', r.breakMinutes, r.netHours, r.pay]),
      [],
      [cols.summary],
      [cols.employee, cols.shifts, cols.totalHours, cols.totalPay],
      ...data.summaries.map(s => [s.fullName, s.shiftCount, s.totalNetHours, s.totalPay]),
    ])
    const wb = utils.book_new()
    utils.book_append_sheet(wb, ws, 'Attendance')
    writeFile(wb, `jelenleti-iv_${data.from}_${data.to}.xlsx`)
  })
}

// ── CSV export ───────────────────────────────────────────────
function exportCSV(data: AttendanceData, cols: ColLabels) {
  const header = `"${cols.employee}","${cols.position}","${cols.date}","${cols.clockIn}","${cols.clockOut}","${cols.actualStart}","${cols.actualEnd}","${cols.breakMinutes}","${cols.netHours}","${cols.pay}"\n`
  const rows = data.rows
    .map(r => `"${r.fullName}","${r.position ?? ''}","${r.date}","${r.startTime}","${r.endTime}","${r.actualStart ?? ''}","${r.actualEnd ?? ''}",${r.breakMinutes},${r.netHours},${r.pay}`)
    .join('\n')
  const blob = new Blob(['\uFEFF' + header + rows], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `jelenleti-iv_${data.from}_${data.to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}
