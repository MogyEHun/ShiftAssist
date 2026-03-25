'use client'

import { useState } from 'react'
import { Download, FileText } from 'lucide-react'

interface Props {
  weekStart: string
  companyName: string
}

export function ExportButtons({ weekStart, companyName }: Props) {
  const [exportingPdf, setExportingPdf] = useState(false)
  const [exportingCsv, setExportingCsv] = useState(false)

  async function handlePdfExport() {
    setExportingPdf(true)
    try {
      const { default: jsPDF } = await import('jspdf')
      const { default: html2canvas } = await import('html2canvas')

      const scheduleEl = document.querySelector('.schedule-grid-container') as HTMLElement
      if (!scheduleEl) {
        alert('A beosztás nézet nem található. Győződj meg róla, hogy a beosztás oldalt nyitod meg.')
        return
      }

      const canvas = await html2canvas(scheduleEl, {
        scale: 2,
        useCORS: true,
        backgroundColor: '#ffffff',
      })

      const imgData = canvas.toDataURL('image/png')
      const pdf = new jsPDF({
        orientation: 'landscape',
        unit: 'mm',
        format: 'a4',
      })

      const pageWidth = pdf.internal.pageSize.getWidth()
      const pageHeight = pdf.internal.pageSize.getHeight()

      // Fejléc
      pdf.setFontSize(16)
      pdf.setTextColor(26, 92, 58)
      pdf.text(companyName, 14, 12)
      pdf.setFontSize(10)
      pdf.setTextColor(100, 100, 100)
      pdf.text(`Heti beosztás – ${weekStart}`, 14, 19)

      // Beosztás kép
      const imgWidth = pageWidth - 28
      const imgHeight = (canvas.height / canvas.width) * imgWidth
      const yOffset = 25

      if (imgHeight + yOffset > pageHeight) {
        // Többoldalas ha szükséges
        const ratio = (pageHeight - yOffset - 5) / imgHeight
        pdf.addImage(imgData, 'PNG', 14, yOffset, imgWidth * ratio, (pageHeight - yOffset - 5))
      } else {
        pdf.addImage(imgData, 'PNG', 14, yOffset, imgWidth, imgHeight)
      }

      // Lábléc
      pdf.setFontSize(8)
      pdf.setTextColor(150, 150, 150)
      pdf.text('ShiftAssist – Vendéglátós beosztáskezelő', 14, pageHeight - 5)

      pdf.save(`beosztás-${weekStart}.pdf`)
    } catch (e) {
      console.error(e)
      alert('PDF generálás sikertelen')
    }
    setExportingPdf(false)
  }

  function handleCsvExport() {
    setExportingCsv(true)
    const url = `/api/export/payroll?weekStart=${weekStart}`
    const a = document.createElement('a')
    a.href = url
    a.download = `berkoltseg-${weekStart}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    setExportingCsv(false)
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={handlePdfExport}
        disabled={exportingPdf}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        title="Beosztás exportálása PDF-be"
      >
        <FileText className="h-3.5 w-3.5 text-gray-500" />
        {exportingPdf ? 'PDF...' : 'PDF'}
      </button>
      <button
        onClick={handleCsvExport}
        disabled={exportingCsv}
        className="flex items-center gap-1.5 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
        title="Bérköltség exportálása CSV-be"
      >
        <Download className="h-3.5 w-3.5 text-gray-500" />
        {exportingCsv ? 'CSV...' : 'CSV'}
      </button>
    </div>
  )
}
